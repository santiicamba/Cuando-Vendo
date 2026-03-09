'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { MarketDataPanel } from '@/components/market-data-panel'
import { PortfolioSummary } from '@/components/portfolio-summary'
import { PositionCard } from '@/components/position-card'
import { PositionDialog } from '@/components/position-dialog'
import { EmptyState } from '@/components/empty-state'
import { 
  Position, 
  CalculatedPosition, 
  calculatePosition, 
  calculatePortfolioSummary,
  MarketData
} from '@/lib/types'
import {
  getPositions,
  addPosition,
  updatePosition,
  deletePosition,
  getMarketData,
  updateCCLRate,
} from '@/lib/store'

export function Dashboard() {
  const [positions, setPositions] = useState<Position[]>([])
  const [marketData, setMarketData] = useState<MarketData>({ cclRate: 1200, lastUpdated: new Date().toISOString() })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<CalculatedPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load data from localStorage
    const storedPositions = getPositions()
    const storedMarketData = getMarketData()
    setPositions(storedPositions)
    setMarketData(storedMarketData)
    setIsLoading(false)
  }, [])

  const handleCCLChange = useCallback((rate: number) => {
    const newMarketData = updateCCLRate(rate)
    setMarketData(newMarketData)
    toast.success('Dólar CCL actualizado', {
      description: `Nuevo valor: $${rate.toLocaleString('es-AR')}`,
    })
  }, [])

  const handleAddPosition = useCallback((data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPosition = addPosition(data)
    setPositions(prev => [...prev, newPosition])
    toast.success('Posición agregada', {
      description: `${data.ticker} agregado a tu portfolio`,
    })
  }, [])

  const handleEditPosition = useCallback((position: CalculatedPosition) => {
    setEditingPosition(position)
    setIsDialogOpen(true)
  }, [])

  const handleUpdatePosition = useCallback((data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingPosition) return
    
    const updated = updatePosition(editingPosition.id, data)
    if (updated) {
      setPositions(prev => prev.map(p => p.id === updated.id ? updated : p))
      toast.success('Posición actualizada', {
        description: `${data.ticker} actualizado correctamente`,
      })
    }
    setEditingPosition(null)
  }, [editingPosition])

  const handleDeletePosition = useCallback((id: string) => {
    const position = positions.find(p => p.id === id)
    const deleted = deletePosition(id)
    if (deleted) {
      setPositions(prev => prev.filter(p => p.id !== id))
      toast.success('Posición eliminada', {
        description: position ? `${position.ticker} eliminado de tu portfolio` : 'Posición eliminada',
      })
    }
  }, [positions])

  const handleOpenDialog = useCallback(() => {
    setEditingPosition(null)
    setIsDialogOpen(true)
  }, [])

  const calculatedPositions: CalculatedPosition[] = positions.map(p => 
    calculatePosition(p, marketData.cclRate)
  )
  
  const portfolioSummary = calculatePortfolioSummary(calculatedPositions)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent animate-pulse" />
          <p className="text-muted-foreground">Cargando portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <MarketDataPanel 
          cclRate={marketData.cclRate} 
          onCCLChange={handleCCLChange}
        />
        
        {positions.length > 0 && (
          <PortfolioSummary summary={portfolioSummary} />
        )}
        
        {positions.length === 0 ? (
          <EmptyState onAddPosition={handleOpenDialog} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Mis Posiciones ({positions.length})
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {calculatedPositions.map((position, index) => (
                <div 
                  key={position.id}
                  className="animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                >
                  <PositionCard
                    position={position}
                    cclRate={marketData.cclRate}
                    onEdit={handleEditPosition}
                    onDelete={handleDeletePosition}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      {positions.length > 0 && (
        <Button
          onClick={handleOpenDialog}
          size="lg"
          className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all gap-2 z-50"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Agregar Posición</span>
        </Button>
      )}

      <PositionDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditingPosition(null)
        }}
        position={editingPosition}
        mode={editingPosition ? 'edit' : 'create'}
        onSave={editingPosition ? handleUpdatePosition : handleAddPosition}
      />
    </div>
  )
}

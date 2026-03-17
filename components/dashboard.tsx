'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, RefreshCw, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { MarketDataPanel } from '@/components/market-data-panel'
import { PortfolioSummary } from '@/components/portfolio-summary'
import { PositionCard } from '@/components/position-card'
import { PositionDialog } from '@/components/position-dialog'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import {
  Position,
  CalculatedPosition,
  calculatePosition,
  calculatePortfolioSummary,
  MarketData,
} from '@/lib/types'
import {
  getPositions,
  addPosition,
  updatePosition,
  deletePosition,
  getMarketData,
  updateCCLRate,
  updateLastPricesTimestamp,
} from '@/lib/store'

export function Dashboard() {
  const [positions, setPositions] = useState<Position[]>([])
  const [marketData, setMarketData] = useState<MarketData>({
    cclRate: 1200,
    lastUpdated: new Date().toISOString(),
    lastPricesUpdated: null,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPosition, setEditingPosition] = useState<CalculatedPosition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [offlineBannerVisible, setOfflineBannerVisible] = useState(false)
  const hasFetchedOnMount = useRef(false)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setOfflineBannerVisible(false)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setOfflineBannerVisible(true)
    }
    setIsOnline(navigator.onLine)
    if (!navigator.onLine) setOfflineBannerVisible(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load persisted data
  useEffect(() => {
    const storedPositions = getPositions()
    const storedMarketData = getMarketData()
    setPositions(storedPositions)
    setMarketData(storedMarketData)
    setIsLoading(false)
  }, [])

  /**
   * Fetch current price + previousClose for every position in parallel.
   * Silently updates only stockPriceUSD and previousCloseUSD per position.
   * Marks priceFetchError=true on failure, keeps last known price.
   */
  const refreshAllPrices = useCallback(async (silent = false) => {
    const current = getPositions()
    if (current.length === 0) return

    if (!navigator.onLine) {
      setOfflineBannerVisible(true)
      return
    }

    if (!silent) setIsRefreshing(true)

    const results = await Promise.allSettled(
      current.map(async (pos) => {
        const res = await fetch(`/api/stock/${encodeURIComponent(pos.ticker)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        return { id: pos.id, price: data.price as number, previousClose: (data.previousClose ?? null) as number | null }
      })
    )

    let anySuccess = false
    const updated = current.map((pos, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        anySuccess = true
        return {
          ...pos,
          stockPriceUSD: result.value.price,
          previousCloseUSD: result.value.previousClose,
          priceFetchError: false,
          updatedAt: new Date().toISOString(),
        } as Position
      } else {
        // Keep last known price, flag the error
        return { ...pos, priceFetchError: true } as Position
      }
    })

    // Persist and update state
    const { savePositions } = await import('@/lib/store')
    savePositions(updated)
    setPositions(updated)

    if (anySuccess) {
      const newMarketData = updateLastPricesTimestamp()
      setMarketData(newMarketData)
    }

    if (!silent) {
      setIsRefreshing(false)
      const failures = results.filter(r => r.status === 'rejected').length
      if (failures === 0) {
        // success handled by timestamp update; no toast needed (keep it unobtrusive)
      } else if (failures === current.length) {
        toast.error('No se pudo actualizar. Revisa tu conexion.')
      } else {
        toast.warning(`${failures} precio(s) no pudieron actualizarse.`)
      }
    }
  }, [])

  // Auto-fetch on mount and on visibility change (when user returns to tab)
  useEffect(() => {
    if (isLoading) return
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true
      refreshAllPrices(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllPrices(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isLoading, refreshAllPrices])

  // When coming back online silently refresh
  useEffect(() => {
    if (isOnline && !isLoading) {
      refreshAllPrices(true)
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCCLChange = useCallback((rate: number) => {
    const newMarketData = updateCCLRate(rate)
    setMarketData(newMarketData)
    toast.success('Dolar CCL actualizado', {
      description: `Nuevo valor: $${rate.toLocaleString('es-AR')}`,
    })
  }, [])

  const handleAddPosition = useCallback((data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPosition = addPosition(data)
    setPositions(prev => [...prev, newPosition])
    toast.success('Posicion agregada', {
      description: `${data.ticker} agregado a tu portfolio`,
    })
    // Fetch price for just the new position silently
    fetch(`/api/stock/${encodeURIComponent(data.ticker)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const upd = updatePosition(newPosition.id, {
            stockPriceUSD: d.price,
            previousCloseUSD: d.previousClose ?? null,
            priceFetchError: false,
          })
          if (upd) setPositions(prev => prev.map(p => p.id === upd.id ? upd : p))
        }
      })
      .catch(() => {/* silent */})
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
      toast.success('Posicion actualizada', {
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
      toast.success('Posicion eliminada', {
        description: position ? `${position.ticker} eliminado de tu portfolio` : 'Posicion eliminada',
      })
    }
  }, [positions])

  const handleRatioUpdate = useCallback((positionId: string, newRatio: number) => {
    const position = positions.find(p => p.id === positionId)
    if (!position) return
    const updated = updatePosition(positionId, {
      ...position,
      ratio: newRatio,
      ratioOverridden: true,
    })
    if (updated) {
      setPositions(prev => prev.map(p => p.id === updated.id ? updated : p))
      toast.success('Ratio actualizado', {
        description: `Ratio de ${position.ticker} actualizado a ${newRatio}:1`,
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

      {/* Offline banner */}
      {offlineBannerVisible && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="container mx-auto px-4 py-2 flex items-center gap-2 text-amber-700 text-sm">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Estas viendo precios desactualizados. Conectate para actualizar.</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-6">
        <MarketDataPanel
          cclRate={marketData.cclRate}
          lastPricesUpdated={marketData.lastPricesUpdated}
          isRefreshing={isRefreshing}
          onCCLChange={handleCCLChange}
          onRefreshPrices={() => refreshAllPrices(false)}
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
                    onRatioUpdate={handleRatioUpdate}
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
          <span className="hidden sm:inline">Agregar Posicion</span>
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

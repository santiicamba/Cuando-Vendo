'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { MarketDataPanel } from '@/components/market-data-panel'
import { PortfolioSummary } from '@/components/portfolio-summary'
import { PositionCard } from '@/components/position-card'
import { PositionDialog } from '@/components/position-dialog'
import { EmptyState } from '@/components/empty-state'
import { WelcomeModal } from '@/components/welcome-modal'
import {
  Position,
  Purchase,
  CalculatedPosition,
  calculatePosition,
  calculatePortfolioSummary,
  MarketData,
} from '@/lib/types'
import {
  getPositions,
  addPosition,
  addPurchaseToPosition,
  updatePurchase,
  deletePurchase,
  updatePosition,
  deletePosition,
  getMarketData,
  updateCCLRate,
  updateLastPricesTimestamp,
  savePositions,
} from '@/lib/store'
import {
  checkAndFireAlerts,
  requestNotificationPermission,
  getNotificationPermission,
} from '@/lib/alerts'

export function Dashboard() {
  const [positions, setPositions] = useState<Position[]>([])
  const [marketData, setMarketData] = useState<MarketData>({
    cclRate: 1200,
    lastUpdated: new Date().toISOString(),
    lastPricesUpdated: null,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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

  // Load persisted data (migration happens automatically in getPositions)
  useEffect(() => {
    const storedPositions = getPositions()
    const storedMarketData = getMarketData()
    setPositions(storedPositions)
    setMarketData(storedMarketData)
    setIsLoading(false)
  }, [])

  /**
   * Fetch current price + previousClose for every position in parallel.
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
          currentStockPriceUSD: result.value.price,
          previousCloseUSD: result.value.previousClose,
          priceFetchError: false,
          updatedAt: new Date().toISOString(),
        } as Position
      } else {
        return { ...pos, priceFetchError: true } as Position
      }
    })

    savePositions(updated)
    setPositions(updated)

    if (anySuccess) {
      const newMarketData = updateLastPricesTimestamp()
      setMarketData(newMarketData)
      // Check alert thresholds after every successful price refresh
      const cclRate = getMarketData().cclRate
      const { calculatePosition } = await import('@/lib/types')
      const snapshots = updated.map(pos => {
        const calc = calculatePosition(pos, cclRate)
        return {
          id: pos.id,
          ticker: pos.ticker,
          returnUSD: calc.returnUSD,
          // Pass position-level targets so alerts can check them
          targetGainUSD: pos.targetGainUSD,
          stopLossUSD: pos.stopLossUSD,
        }
      })
      checkAndFireAlerts(snapshots)
    }

    if (!silent) {
      setIsRefreshing(false)
      const failures = results.filter(r => r.status === 'rejected').length
      if (failures > 0 && failures < current.length) {
        toast.warning(`${failures} precio(s) no pudieron actualizarse.`)
      } else if (failures === current.length) {
        toast.error('No se pudo actualizar. Revisa tu conexion.')
      } else if (anySuccess) {
        toast.success('Todos los precios fueron actualizados correctamente.')
      }
    }
  }, [])

  // Auto-fetch on mount and on visibility change
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
    // No toast here — CCL updates are silent. The single manual-refresh toast
    // is fired inside refreshAllPrices when silent=false.
  }, [])

  const handleAddPosition = useCallback((data: {
    ticker: string
    name: string
    ratio: number
    ratioOverridden: boolean
    market: string
    purchase: Omit<Purchase, 'id'>
    targetGainUSD: number | null
    stopLossUSD: number | null
  }) => {
    const newPosition = addPosition(data)
    // Persist optional targets after creation
    if (data.targetGainUSD !== null || data.stopLossUSD !== null) {
      updatePosition(newPosition.id, {
        targetGainUSD: data.targetGainUSD,
        stopLossUSD: data.stopLossUSD,
      })
    }
    setPositions(getPositions())
    toast.success('Posicion agregada', {
      description: `${data.ticker} agregado a tu portfolio`,
    })
    // Request notification permission on first position added (if not already decided)
    if (getNotificationPermission() === 'default') {
      requestNotificationPermission()
    }
    // Fetch price for just the new position silently
    fetch(`/api/stock/${encodeURIComponent(data.ticker)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const upd = updatePosition(newPosition.id, {
            currentStockPriceUSD: d.price,
            previousCloseUSD: d.previousClose ?? null,
            priceFetchError: false,
          })
          if (upd) setPositions(getPositions())
        }
      })
      .catch(() => {/* silent */})
  }, [])

  const handleAddPurchase = useCallback((positionId: string, purchase: Omit<Purchase, 'id'>) => {
    const updated = addPurchaseToPosition(positionId, purchase)
    if (updated) {
      setPositions(getPositions())
      toast.success('Compra agregada', {
        description: `Nueva compra registrada para ${updated.ticker}`,
      })
    }
  }, [])

  const handleEditPurchase = useCallback((positionId: string, purchaseId: string, purchase: Omit<Purchase, 'id'>) => {
    const updated = updatePurchase(positionId, purchaseId, purchase)
    if (updated) {
      setPositions(getPositions())
      toast.success('Compra actualizada', {
        description: `Compra de ${updated.ticker} actualizada`,
      })
    }
  }, [])

  const handleDeletePurchase = useCallback((positionId: string, purchaseId: string) => {
    const position = positions.find(p => p.id === positionId)
    const result = deletePurchase(positionId, purchaseId)
    setPositions(getPositions())
    
    if (result.positionDeleted) {
      toast.success('Posicion eliminada', {
        description: position ? `${position.ticker} eliminado de tu portfolio` : 'Posicion eliminada',
      })
    } else if (result.position) {
      toast.success('Compra eliminada', {
        description: `Compra de ${result.position.ticker} eliminada`,
      })
    }
  }, [positions])

  const handleDeletePosition = useCallback((id: string) => {
    const position = positions.find(p => p.id === id)
    const deleted = deletePosition(id)
    if (deleted) {
      setPositions(getPositions())
      toast.success('Posicion eliminada', {
        description: position ? `${position.ticker} eliminado de tu portfolio` : 'Posicion eliminada',
      })
    }
  }, [positions])

  const handleRatioUpdate = useCallback((positionId: string, newRatio: number) => {
    const position = positions.find(p => p.id === positionId)
    if (!position) return
    const updated = updatePosition(positionId, {
      ratio: newRatio,
      ratioOverridden: true,
    })
    if (updated) {
      setPositions(getPositions())
      toast.success('Ratio actualizado', {
        description: `Ratio de ${position.ticker} actualizado a ${newRatio}:1`,
      })
    }
  }, [positions])

  const handleUpdateTargets = useCallback((positionId: string, targetGainUSD: number | null, stopLossUSD: number | null) => {
    const updated = updatePosition(positionId, { targetGainUSD, stopLossUSD })
    if (updated) {
      setPositions(getPositions())
      toast.success('Objetivo guardado', {
        description: `Objetivo de ${updated.ticker} actualizado`,
      })
    }
  }, [])

  const handleOpenDialog = useCallback(() => {
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
      <WelcomeModal />
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
          onRefreshAll={() => refreshAllPrices(false)}
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
                    onDelete={handleDeletePosition}
                    onRatioUpdate={handleRatioUpdate}
                    onAddPurchase={handleAddPurchase}
                    onEditPurchase={handleEditPurchase}
                    onDeletePurchase={handleDeletePurchase}
                    onUpdateTargets={handleUpdateTargets}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Add Button — offset for bottom tab bar */}
      {positions.length > 0 && (
        <Button
          onClick={handleOpenDialog}
          size="lg"
          className="fixed bottom-20 right-4 h-14 px-6 rounded-full shadow-lg hover:shadow-xl transition-all gap-2 z-40"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Agregar Posicion</span>
        </Button>
      )}

      <PositionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleAddPosition}
      />

      {/* Permanent disclaimer — extra bottom padding for tab bar */}
      <footer className="container mx-auto px-4 py-8 mt-4 pb-20">
        <p className="text-xs text-muted-foreground/70 text-center leading-relaxed max-w-2xl mx-auto">
          Cuando Vendo? es una herramienta de seguimiento y calculo de inversiones personales. La informacion que muestra es de caracter informativo y no constituye asesoramiento financiero, legal ni impositivo. Las metas y limites que configuras son decisiones personales tuyas. Consulta con un asesor certificado ante la CNV antes de tomar cualquier decision de inversion.
        </p>
      </footer>
    </div>
  )
}

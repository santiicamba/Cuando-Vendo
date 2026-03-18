'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, RefreshCw, Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatARS, isNYSEOpen } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MarketDataPanelProps {
  cclRate: number
  lastPricesUpdated: string | null
  isRefreshing: boolean
  onCCLChange: (rate: number) => void
  onRefreshPrices: () => void
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function MarketDataPanel({
  cclRate,
  lastPricesUpdated,
  isRefreshing,
  onCCLChange,
  onRefreshPrices,
}: MarketDataPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempRate, setTempRate] = useState(cclRate.toString())
  const [cclFetchStatus, setCclFetchStatus] = useState<FetchStatus>('idle')
  const [lastCclFetched, setLastCclFetched] = useState<Date | null>(null)
  const [marketOpen, setMarketOpen] = useState(false)

  // Update market status every minute
  useEffect(() => {
    setMarketOpen(isNYSEOpen())
    const id = setInterval(() => setMarketOpen(isNYSEOpen()), 60_000)
    return () => clearInterval(id)
  }, [])

  const fetchCCL = useCallback(async () => {
    setCclFetchStatus('loading')
    try {
      const response = await fetch('/api/ccl')
      const data = await response.json()
      if (data.success && data.rate) {
        onCCLChange(data.rate)
        setTempRate(data.rate.toString())
        setLastCclFetched(new Date())
        setCclFetchStatus('success')
        setTimeout(() => setCclFetchStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Failed to fetch CCL')
      }
    } catch {
      setCclFetchStatus('error')
    }
  }, [onCCLChange])

  // Auto-fetch CCL on mount
  useEffect(() => {
    fetchCCL()
  }, [fetchCCL])

  const handleSave = () => {
    const rate = parseFloat(tempRate)
    if (!isNaN(rate) && rate > 0) {
      onCCLChange(rate)
      setIsEditing(false)
      setCclFetchStatus('idle')
    }
  }

  const handleCancel = () => {
    setTempRate(cclRate.toString())
    setIsEditing(false)
  }

  const lastPricesDate = lastPricesUpdated ? new Date(lastPricesUpdated) : null

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">

          {/* CCL block */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              cclFetchStatus === 'loading' && 'bg-primary/20 animate-pulse',
              cclFetchStatus === 'success' && 'bg-green-500/20',
              cclFetchStatus === 'error' && 'bg-red-500/20',
              cclFetchStatus === 'idle' && 'bg-primary/20',
            )}>
              {cclFetchStatus === 'loading' ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : cclFetchStatus === 'success' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : cclFetchStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <DollarSign className="w-5 h-5 text-primary" />
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Dolar CCL</p>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-32 h-8 text-sm bg-card"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') handleCancel()
                    }}
                  />
                  <Button size="sm" onClick={handleSave} className="h-8">Guardar</Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">Cancelar</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">
                    {cclFetchStatus === 'loading' ? '...' : formatARS(cclRate)}
                  </p>
                  {cclFetchStatus === 'error' && (
                    <span className="text-xs text-red-500">(manual)</span>
                  )}
                </div>
              )}

              {cclFetchStatus === 'error' && !isEditing && (
                <p className="text-xs text-red-500 mt-0.5">
                  No se pudo obtener el CCL. Ingresalo manualmente.
                </p>
              )}
            </div>
          </div>

          {/* Right side: refresh prices + market status */}
          <div className="flex flex-col items-start sm:items-end gap-2">
            {!isEditing && (
              <div className="flex items-center gap-2">
                {/* Manual price refresh button */}
                <button
                  onClick={onRefreshPrices}
                  disabled={isRefreshing}
                  aria-label="Actualizar precios"
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-full border border-primary/30 text-primary',
                    'hover:bg-primary/10 disabled:opacity-50 transition-colors',
                  )}
                >
                  <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                </button>

                {/* CCL refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCCL}
                  disabled={cclFetchStatus === 'loading'}
                  className="border-primary/30 hover:bg-primary/10"
                >
                  {cclFetchStatus === 'loading' ? 'Cargando...' : 'Actualizar CCL'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setTempRate(cclRate.toString()); setIsEditing(true); setCclFetchStatus('idle') }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Editar manual
                </Button>
              </div>
            )}

            <div className="flex flex-col items-start sm:items-end gap-1">
              {/* Last prices updated */}
              {lastPricesDate ? (
                <p className="text-xs text-muted-foreground">
                  {isRefreshing
                    ? 'Actualizando precios...'
                    : `Actualizado hoy a las ${lastPricesDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                  }
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isRefreshing ? 'Actualizando precios...' : 'Precios pendientes de actualizar'}
                </p>
              )}

              {/* Market status pill */}
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
                marketOpen
                  ? 'bg-success/15 text-success'
                  : 'bg-muted text-muted-foreground',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  marketOpen ? 'bg-success' : 'bg-muted-foreground',
                )} />
                {marketOpen ? 'Mercado abierto' : 'Mercado cerrado — mostrando ultimo cierre'}
              </span>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

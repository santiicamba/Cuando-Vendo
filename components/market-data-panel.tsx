'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, RefreshCw, AlertCircle, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatARS, isNYSEOpen } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MarketDataPanelProps {
  cclRate: number
  lastPricesUpdated: string | null
  isRefreshing: boolean
  onCCLChange: (rate: number) => void
  onRefreshAll: () => void   // single unified refresh (prices + CCL)
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function MarketDataPanel({
  cclRate,
  lastPricesUpdated,
  isRefreshing,
  onCCLChange,
  onRefreshAll,
}: MarketDataPanelProps) {
  const [cclFetchStatus, setCclFetchStatus] = useState<FetchStatus>('idle')
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
        setCclFetchStatus('success')
        setTimeout(() => setCclFetchStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Failed to fetch CCL')
      }
    } catch {
      setCclFetchStatus('error')
      setTimeout(() => setCclFetchStatus('idle'), 3000)
    }
  }, [onCCLChange])

  // Auto-fetch CCL silently on mount — no toast
  useEffect(() => {
    fetchCCL()
  }, [fetchCCL])

  // Unified refresh: fetch CCL (silent) + delegate stock price refresh to parent.
  // The single "Todos los precios fueron actualizados" toast fires inside refreshAllPrices.
  const handleRefreshAll = useCallback(() => {
    fetchCCL()   // silent — handleCCLChange does not toast
    onRefreshAll() // fires refreshAllPrices(false) → one toast on success
  }, [fetchCCL, onRefreshAll])

  const isAnyRefreshing = isRefreshing || cclFetchStatus === 'loading'

  const lastPricesDate = lastPricesUpdated ? new Date(lastPricesUpdated) : null

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">

          {/* CCL block */}
          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors flex-shrink-0',
              cclFetchStatus === 'loading' && 'bg-primary/20 animate-pulse',
              cclFetchStatus === 'success' && 'bg-green-500/20',
              cclFetchStatus === 'error' && 'bg-red-500/20',
              cclFetchStatus === 'idle' && 'bg-primary/20',
            )}>
              {cclFetchStatus === 'success' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : cclFetchStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <DollarSign className="w-5 h-5 text-primary" />
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Dolar CCL</p>
              <p className={cn(
                'text-lg font-bold text-foreground leading-tight',
                cclFetchStatus === 'loading' && 'opacity-50'
              )}>
                {cclFetchStatus === 'loading' ? '...' : formatARS(cclRate)}
              </p>
              {cclFetchStatus === 'error' && (
                <p className="text-xs text-red-500">No se pudo actualizar</p>
              )}
            </div>
          </div>

          {/* Right: single refresh button + timestamp + market status */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Unified circular refresh button */}
            <button
              onClick={handleRefreshAll}
              disabled={isAnyRefreshing}
              aria-label="Actualizar precios y CCL"
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-primary text-white shadow-md',
                'hover:bg-primary/90 active:scale-95 transition-all',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isAnyRefreshing && 'animate-spin')} />
            </button>

            {/* Single unified timestamp */}
            <p className="text-xs text-muted-foreground text-right">
              {isAnyRefreshing
                ? 'Actualizando...'
                : lastPricesDate
                  ? `Actualizado hoy a las ${lastPricesDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })}`
                  : 'Pendiente de actualizar'
              }
            </p>

            {/* Market status pill */}
            <span className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
              marketOpen
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground',
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full flex-shrink-0',
                marketOpen ? 'bg-success' : 'bg-muted-foreground',
              )} />
              {marketOpen ? 'Mercado abierto' : 'Mercado cerrado'}
            </span>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}

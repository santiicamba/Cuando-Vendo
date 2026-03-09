'use client'

import { useState, useEffect, useCallback } from 'react'
import { DollarSign, RefreshCw, Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatARS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MarketDataPanelProps {
  cclRate: number
  onCCLChange: (rate: number) => void
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function MarketDataPanel({ cclRate, onCCLChange }: MarketDataPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempRate, setTempRate] = useState(cclRate.toString())
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchCCL = useCallback(async () => {
    setFetchStatus('loading')
    try {
      const response = await fetch('/api/ccl')
      const data = await response.json()
      
      if (data.success && data.rate) {
        onCCLChange(data.rate)
        setTempRate(data.rate.toString())
        setLastFetched(new Date())
        setFetchStatus('success')
        // Reset success status after 2 seconds
        setTimeout(() => setFetchStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Failed to fetch CCL')
      }
    } catch (error) {
      console.error('Error fetching CCL:', error)
      setFetchStatus('error')
    }
  }, [onCCLChange])

  // Auto-fetch on mount
  useEffect(() => {
    fetchCCL()
  }, [fetchCCL])

  const handleSave = () => {
    const rate = parseFloat(tempRate)
    if (!isNaN(rate) && rate > 0) {
      onCCLChange(rate)
      setIsEditing(false)
      setFetchStatus('idle')
    }
  }

  const handleCancel = () => {
    setTempRate(cclRate.toString())
    setIsEditing(false)
  }

  const handleManualEdit = () => {
    setTempRate(cclRate.toString())
    setIsEditing(true)
    setFetchStatus('idle')
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              fetchStatus === 'loading' && "bg-primary/20 animate-pulse",
              fetchStatus === 'success' && "bg-green-500/20",
              fetchStatus === 'error' && "bg-red-500/20",
              fetchStatus === 'idle' && "bg-primary/20"
            )}>
              {fetchStatus === 'loading' ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : fetchStatus === 'success' ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : fetchStatus === 'error' ? (
                <AlertCircle className="w-5 h-5 text-red-500" />
              ) : (
                <DollarSign className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Dólar CCL
              </p>
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
                  <Button size="sm" onClick={handleSave} className="h-8">
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-foreground">
                    {fetchStatus === 'loading' ? '...' : formatARS(cclRate)}
                  </p>
                  {fetchStatus === 'error' && (
                    <span className="text-xs text-red-500">(manual)</span>
                  )}
                </div>
              )}
              {lastFetched && fetchStatus !== 'loading' && !isEditing && (
                <p className="text-xs text-muted-foreground">
                  Actualizado: {lastFetched.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCCL}
                disabled={fetchStatus === 'loading'}
                className="border-primary/30 hover:bg-primary/10"
              >
                <RefreshCw className={cn(
                  "w-4 h-4 mr-2",
                  fetchStatus === 'loading' && "animate-spin"
                )} />
                {fetchStatus === 'loading' ? 'Cargando...' : 'Actualizar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualEdit}
                className="text-muted-foreground hover:text-foreground"
              >
                Editar manual
              </Button>
            </div>
          )}
        </div>
        
        {fetchStatus === 'error' && !isEditing && (
          <p className="text-xs text-red-500 mt-2">
            No se pudo obtener el CCL automaticamente. Podes ingresarlo manualmente.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

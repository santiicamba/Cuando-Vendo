'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Info } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AlertConfig,
  getAlerts,
  setAlert,
  getNotificationPermission,
  requestNotificationPermission,
  NotificationPermission,
} from '@/lib/alerts'
import { cn } from '@/lib/utils'

interface AlertDialogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  positionId: string
  ticker: string
  currentReturnUSD: number
}

export function AlertDialogModal({
  open,
  onOpenChange,
  positionId,
  ticker,
  currentReturnUSD,
}: AlertDialogModalProps) {
  const [enabled, setEnabled] = useState(false)
  const [targetGain, setTargetGain] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [requesting, setRequesting] = useState(false)

  // Load existing config and current permission whenever dialog opens
  useEffect(() => {
    if (!open) return
    setPermission(getNotificationPermission())
    const alerts = getAlerts()
    const existing = alerts[positionId]
    if (existing) {
      setEnabled(existing.enabled)
      setTargetGain(existing.targetGainUSD !== null ? String(existing.targetGainUSD) : '')
      setStopLoss(existing.stopLossUSD !== null ? String(Math.abs(existing.stopLossUSD)) : '')
    } else {
      setEnabled(false)
      setTargetGain('')
      setStopLoss('')
    }
  }, [open, positionId])

  const handleRequestPermission = async () => {
    setRequesting(true)
    const result = await requestNotificationPermission()
    setPermission(result)
    setRequesting(false)
  }

  const handleSave = () => {
    const config: AlertConfig = {
      positionId,
      ticker,
      enabled,
      targetGainUSD: targetGain ? parseFloat(targetGain) : null,
      stopLossUSD: stopLoss ? parseFloat(stopLoss) : null,
    }
    setAlert(config)
    onOpenChange(false)
  }

  const hasThreshold = targetGain !== '' || stopLoss !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-card border-border" aria-describedby="alert-dialog-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Bell className="w-4 h-4 text-primary" />
            Alertas — {ticker}
          </DialogTitle>
          <DialogDescription id="alert-dialog-desc">
            Configura notificaciones para cuando el retorno de esta posicion alcance los umbrales definidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Permission banner */}
          {permission === 'denied' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Las alertas requieren permiso de notificaciones del navegador. Habilitalo en la configuracion de tu navegador para este sitio.
              </p>
            </div>
          )}

          {permission === 'default' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Para recibir alertas necesitas permitir las notificaciones del navegador.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRequestPermission}
                  disabled={requesting}
                  className="h-7 text-xs"
                >
                  {requesting ? 'Solicitando...' : 'Permitir notificaciones'}
                </Button>
              </div>
            </div>
          )}

          {permission === 'unsupported' && (
            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 py-2.5">
              <BellOff className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tu navegador no soporta notificaciones push. Podes configurar umbrales de todas formas; se mostraran en la tarjeta.
              </p>
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Alertas activas</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Retorno actual en USD: {currentReturnUSD >= 0 ? '+' : ''}{currentReturnUSD.toFixed(2)}%
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={permission === 'denied'}
            />
          </div>

          {/* Threshold inputs */}
          <div
            className={cn(
              'space-y-4 transition-opacity duration-200',
              !enabled && 'opacity-50 pointer-events-none'
            )}
          >
            <div className="space-y-1.5">
              <Label htmlFor="alert-target" className="text-xs font-medium text-foreground">
                Avisame cuando mi retorno en USD supere (%)
              </Label>
              <Input
                id="alert-target"
                type="number"
                step="0.1"
                min="0"
                placeholder="ej: 20"
                value={targetGain}
                onChange={(e) => setTargetGain(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alert-stop" className="text-xs font-medium text-foreground">
                Avisame cuando mi retorno en USD caiga por debajo de (%)
              </Label>
              <Input
                id="alert-stop"
                type="number"
                step="0.1"
                min="0"
                placeholder="ej: 10"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el valor absoluto. Ej: 10 significa alertar cuando el retorno baje de -10%.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={enabled && !hasThreshold}
          >
            Guardar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

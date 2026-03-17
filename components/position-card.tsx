'use client'

import { useState } from 'react'
import { Calendar, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, DollarSign, Clock, Info, ArrowUpDown, Banknote, BarChart3, AlertTriangle, ChevronDown, Plus, Target } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { RatioCorrectionModal } from '@/components/ratio-correction-modal'
import { PurchaseDialog } from '@/components/purchase-dialog'
import { CalculatedPosition, Purchase, formatARS, formatUSD, formatPercent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PositionCardProps {
  position: CalculatedPosition
  cclRate: number
  onDelete: (id: string) => void
  onRatioUpdate: (positionId: string, newRatio: number) => void
  onAddPurchase: (positionId: string, purchase: Omit<Purchase, 'id'>) => void
  onEditPurchase: (positionId: string, purchaseId: string, purchase: Omit<Purchase, 'id'>) => void
  onDeletePurchase: (positionId: string, purchaseId: string) => void
  onUpdateTargets: (positionId: string, targetGainUSD: number | null, stopLossUSD: number | null) => void
}

export function PositionCard({ 
  position, 
  cclRate, 
  onDelete, 
  onRatioUpdate, 
  onAddPurchase,
  onEditPurchase,
  onDeletePurchase,
  onUpdateTargets,
}: PositionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRatioModal, setShowRatioModal] = useState(false)
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false)
  const [showTargetDialog, setShowTargetDialog] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null)
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [targetGainInput, setTargetGainInput] = useState('')
  const [stopLossInput, setStopLossInput] = useState('')
  
  const isPositiveARS = position.returnARS >= 0

  // --- Target system ---
  const hasTarget = position.targetGainUSD !== null || position.stopLossUSD !== null

  // Determine target state using returnUSD (pure stock performance)
  const returnUSD = position.returnUSD
  const targetGain = position.targetGainUSD   // e.g. 20 = +20%
  const stopLoss = position.stopLossUSD       // e.g. 10 = -10% threshold (stored as positive)

  const goalReached = targetGain !== null && returnUSD >= targetGain
  const lossReached = stopLoss !== null && returnUSD <= -Math.abs(stopLoss)

  // Progress toward target (0–100 clamped, based on returnUSD vs targetGain)
  let progressPct = 0
  if (targetGain !== null && targetGain > 0) {
    progressPct = Math.min(100, Math.max(0, (returnUSD / targetGain) * 100))
  }

  const targetStateLabel = (() => {
    if (!hasTarget) return null
    if (goalReached) return 'Alcanzaste el objetivo que definiste.'
    if (lossReached) return 'Tu posicion esta por debajo del limite que definiste.'
    if (targetGain !== null) {
      const remaining = targetGain - returnUSD
      return `Te falta un ${remaining.toFixed(2)}% para alcanzar el objetivo que definiste.`
    }
    return null
  })()

  const openTargetDialog = () => {
    setTargetGainInput(position.targetGainUSD !== null ? String(position.targetGainUSD) : '')
    setStopLossInput(position.stopLossUSD !== null ? String(Math.abs(position.stopLossUSD)) : '')
    setShowTargetDialog(true)
  }

  const handleSaveTargets = () => {
    onUpdateTargets(
      position.id,
      targetGainInput ? parseFloat(targetGainInput) : null,
      stopLossInput ? parseFloat(stopLossInput) : null,
    )
    setShowTargetDialog(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleAddPurchase = () => {
    setEditingPurchase(null)
    setShowPurchaseDialog(true)
  }

  const handleEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase)
    setShowPurchaseDialog(true)
  }

  const handleSavePurchase = (data: Omit<Purchase, 'id'>) => {
    if (editingPurchase) {
      onEditPurchase(position.id, editingPurchase.id, data)
    } else {
      onAddPurchase(position.id, data)
    }
    setEditingPurchase(null)
  }

  const handleDeletePurchase = (purchaseId: string) => {
    setDeletingPurchaseId(purchaseId)
  }

  const confirmDeletePurchase = () => {
    if (deletingPurchaseId) {
      onDeletePurchase(position.id, deletingPurchaseId)
      setDeletingPurchaseId(null)
    }
  }

  const sortedPurchases = [...position.purchases].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        goalReached
          ? "ring-2 ring-success/60 bg-success/5"
          : lossReached
          ? "ring-2 ring-loss/40 bg-loss/5"
          : isPositiveARS 
          ? "hover:ring-2 hover:ring-success/30" 
          : "hover:ring-2 hover:ring-loss/30"
      )}>
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isPositiveARS ? "bg-gradient-to-r from-success/80 to-success" : "bg-gradient-to-r from-loss/80 to-loss"
        )} />
        
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold shadow-sm",
                isPositiveARS 
                  ? "bg-gradient-to-br from-success/20 to-success/10 text-success" 
                  : "bg-gradient-to-br from-loss/20 to-loss/10 text-loss"
              )}>
                {position.ticker.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-bold">
                    {position.ticker}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {position.market}
                  </Badge>
                  {position.priceFetchError && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          Precio desactualizado
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>No se pudo actualizar el precio. Mostrando el ultimo valor conocido.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {position.name}
                </p>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-loss focus:text-loss"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar Posicion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Three Return Metrics */}
          <div className="space-y-2">
            {/* Return in USD */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              position.returnUSD >= 0 ? "bg-success/10" : "bg-loss/10"
            )}>
              <div className="flex items-center gap-2">
                <DollarSign className={cn(
                  "w-4 h-4",
                  position.returnUSD >= 0 ? "text-success" : "text-loss"
                )} />
                <span className="text-sm font-medium text-foreground">Retorno en USD</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p>Cuanto gano o perdio la accion en Wall Street, sin importar lo que hizo el dolar.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                {position.returnUSD >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                <span className={cn(
                  "text-lg font-bold",
                  position.returnUSD >= 0 ? "text-success" : "text-loss"
                )}>
                  {formatPercent(position.returnUSD)}
                </span>
              </div>
            </div>

            {/* Return in ARS */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              position.returnARS >= 0 ? "bg-success/10" : "bg-loss/10"
            )}>
              <div className="flex items-center gap-2">
                <Banknote className={cn(
                  "w-4 h-4",
                  position.returnARS >= 0 ? "text-success" : "text-loss"
                )} />
                <span className="text-sm font-medium text-foreground">Retorno en ARS</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p>Cuanto ganas o perdes en pesos hoy si vendieras al precio teorico.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                {position.returnARS >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                <span className={cn(
                  "text-lg font-bold",
                  position.returnARS >= 0 ? "text-success" : "text-loss"
                )}>
                  {formatPercent(position.returnARS)}
                </span>
              </div>
            </div>

            {/* CCL Effect */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              position.cclEffect >= 0 ? "bg-success/10" : "bg-loss/10"
            )}>
              <div className="flex items-center gap-2">
                <ArrowUpDown className={cn(
                  "w-4 h-4",
                  position.cclEffect >= 0 ? "text-success" : "text-loss"
                )} />
                <span className="text-sm font-medium text-foreground">Efecto CCL</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p>Cuanto de tu ganancia (o perdida) en pesos se debe a la variacion del tipo de cambio.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-1">
                {position.cclEffect >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-loss" />
                )}
                <span className={cn(
                  "text-lg font-bold",
                  position.cclEffect >= 0 ? "text-success" : "text-loss"
                )}>
                  {formatPercent(position.cclEffect)}
                </span>
              </div>
            </div>
          </div>

          {/* Target / Mi objetivo section */}
          {hasTarget ? (
            <div className={cn(
              'rounded-lg border p-3 space-y-2 transition-colors duration-300',
              goalReached
                ? 'border-success/40 bg-success/10'
                : lossReached
                ? 'border-loss/30 bg-loss/8'
                : 'border-border bg-secondary/30'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Target className={cn(
                    'w-3.5 h-3.5',
                    goalReached ? 'text-success' : lossReached ? 'text-loss' : 'text-muted-foreground'
                  )} />
                  <span className="text-xs font-medium text-foreground">Mi objetivo</span>
                </div>
                <button
                  onClick={openTargetDialog}
                  className="text-xs text-primary hover:underline"
                >
                  Editar
                </button>
              </div>

              {/* Progress bar — only when there's a gain target */}
              {targetGain !== null && targetGain > 0 && !lossReached && (
                <div className="space-y-1">
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        goalReached ? 'bg-success' : 'bg-primary'
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatPercent(returnUSD)}</span>
                    <span>Objetivo: +{targetGain}%</span>
                  </div>
                </div>
              )}

              {targetStateLabel && (
                <p className={cn(
                  'text-xs leading-relaxed',
                  goalReached ? 'text-success font-medium' : lossReached ? 'text-loss font-medium' : 'text-muted-foreground'
                )}>
                  {targetStateLabel}
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs text-center">
              <button
                onClick={openTargetDialog}
                className="text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
              >
                Definir mi objetivo
              </button>
            </div>
          )}

          {/* Daily change row */}
          {(() => {
            const hasDailyData = position.dailyChangePercent !== null && position.dailyChangeARS !== null
            const isPositive = (position.dailyChangePercent ?? 0) > 0
            const isZero = (position.dailyChangePercent ?? 0) === 0

            return (
              <div className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg text-sm border',
                !hasDailyData || isZero
                  ? 'bg-muted/40 border-border text-muted-foreground'
                  : isPositive
                  ? 'bg-success/8 border-success/20'
                  : 'bg-loss/8 border-loss/20',
              )}>
                <span className={cn(
                  'font-medium',
                  !hasDailyData || isZero
                    ? 'text-muted-foreground'
                    : isPositive ? 'text-success' : 'text-loss',
                )}>
                  Hoy
                </span>
                {hasDailyData ? (
                  <span className={cn(
                    'font-semibold tabular-nums',
                    isZero ? 'text-muted-foreground' : isPositive ? 'text-success' : 'text-loss',
                  )}>
                    {formatARS(position.dailyChangeARS!)}
                    {' '}
                    {formatPercent(position.dailyChangePercent!)}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Sin datos</span>
                )}
              </div>
            )
          })()}

          {/* Price comparison */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Precio Prom.</p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {formatARS(position.avgPurchasePriceARS)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Precio Teorico</p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {formatARS(position.theoreticalPrice)}
              </p>
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              isPositiveARS ? "bg-success/10" : "bg-loss/10"
            )}>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className={cn(
                "text-sm font-semibold mt-1",
                isPositiveARS ? "text-success" : "text-loss"
              )}>
                {formatARS(position.priceDifference)}
              </p>
            </div>
          </div>

          {/* Ratio correction hint */}
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>El precio teorico no coincide con el de tu broker?</span>
            <button
              onClick={() => setShowRatioModal(true)}
              className="text-primary hover:underline font-medium"
            >
              Corregir ratio
            </button>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Stock USD:</span>
              <span className="font-medium text-foreground ml-auto">{formatUSD(position.currentStockPriceUSD)}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">CCL prom.:</span>
              <span className="font-medium text-foreground ml-auto">{formatARS(position.avgCclAtPurchase)}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">CCL actual:</span>
              <span className="font-medium text-foreground ml-auto">{formatARS(cclRate)}</span>
            </div>
          </div>

          {/* Investment summary */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cantidad:</span>
              <span className="font-medium text-foreground">{position.totalQuantity} CEDEARs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Invertido:</span>
              <span className="font-medium text-foreground">{formatARS(position.totalInvested)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor Actual:</span>
              <span className="font-medium text-foreground">{formatARS(position.currentValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">P&L:</span>
              <span className={cn(
                "font-semibold",
                isPositiveARS ? "text-success" : "text-loss"
              )}>
                {formatARS(position.profitLoss)}
              </span>
            </div>
          </div>

          {/* Footer with dates */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(position.firstPurchaseDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{position.daysHeld} dias</span>
            </div>
          </div>

          {/* Purchase History Collapsible */}
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      historyOpen && "rotate-180"
                    )} />
                    Historial de compras ({position.purchases.length})
                  </button>
                </CollapsibleTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddPurchase}
                  className="h-7 px-2 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Agregar compra
                </Button>
              </div>
              
              <CollapsibleContent className="mt-3 space-y-2">
                {sortedPurchases.map((purchase, index) => (
                  <div 
                    key={purchase.id}
                    className={cn(
                      "p-3 rounded-lg bg-secondary/30 text-sm",
                      index < sortedPurchases.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-foreground">
                        {formatDate(purchase.date)}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleEditPurchase(purchase)}
                        >
                          <Pencil className="w-3 h-3" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-loss hover:text-loss"
                          onClick={() => handleDeletePurchase(purchase.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Cantidad:</span>
                        <span className="ml-1 font-medium text-foreground">{purchase.quantity}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Precio:</span>
                        <span className="ml-1 font-medium text-foreground">{formatARS(purchase.priceARS)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CCL:</span>
                        <span className="ml-1 font-medium text-foreground">{formatARS(purchase.cclAtPurchase)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stock USD:</span>
                        <span className="ml-1 font-medium text-foreground">{formatUSD(purchase.stockPriceUSD)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Delete Position Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar posicion</AlertDialogTitle>
            <AlertDialogDescription>
              {`Estas seguro de que queres eliminar toda tu posicion de ${position.ticker}? Esta accion no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(position.id)}
              className="bg-loss hover:bg-loss/90 text-loss-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Purchase Dialog */}
      <AlertDialog open={!!deletingPurchaseId} onOpenChange={(open) => !open && setDeletingPurchaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar compra</AlertDialogTitle>
            <AlertDialogDescription>
              {position.purchases.length === 1 
                ? 'Esta es la unica compra de esta posicion. Al eliminarla se eliminara toda la posicion.'
                : 'Estas seguro de que queres eliminar esta compra? Los promedios se recalcularan automaticamente.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePurchase}
              className="bg-loss hover:bg-loss/90 text-loss-foreground"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RatioCorrectionModal
        open={showRatioModal}
        onOpenChange={setShowRatioModal}
        currentRatio={position.ratio}
        onSave={(newRatio) => onRatioUpdate(position.id, newRatio)}
      />

      <PurchaseDialog
        open={showPurchaseDialog}
        onOpenChange={setShowPurchaseDialog}
        ticker={position.ticker}
        ratio={position.ratio}
        purchase={editingPurchase}
        onSave={handleSavePurchase}
        mode={editingPurchase ? 'edit' : 'create'}
      />

      {/* Target edit dialog */}
      <Dialog open={showTargetDialog} onOpenChange={setShowTargetDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Mi objetivo — {position.ticker}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Opcional. Define tus metas personales en USD para esta posicion.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-targetGain" className="text-xs">Objetivo de ganancia (%)</Label>
                <Input
                  id="dlg-targetGain"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ej: 20"
                  value={targetGainInput}
                  onChange={(e) => setTargetGainInput(e.target.value)}
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dlg-stopLoss" className="text-xs">Limite de perdida (%)</Label>
                <Input
                  id="dlg-stopLoss"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ej: 10"
                  value={stopLossInput}
                  onChange={(e) => setStopLossInput(e.target.value)}
                  className="bg-card"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              El porcentaje se compara con el retorno en USD de la posicion.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowTargetDialog(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveTargets}>
              Guardar objetivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

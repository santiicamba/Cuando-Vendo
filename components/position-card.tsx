'use client'

import { useState } from 'react'
import { Calendar, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, DollarSign, Hash, Clock, Info, ArrowUpDown, Banknote, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { RatioCorrectionModal } from '@/components/ratio-correction-modal'
import { CalculatedPosition, formatARS, formatUSD, formatPercent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PositionCardProps {
  position: CalculatedPosition
  cclRate: number
  onEdit: (position: CalculatedPosition) => void
  onDelete: (id: string) => void
  onRatioUpdate: (positionId: string, newRatio: number) => void
}

export function PositionCard({ position, cclRate, onEdit, onDelete, onRatioUpdate }: PositionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRatioModal, setShowRatioModal] = useState(false)
  const isPositiveARS = position.returnARS >= 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        isPositiveARS 
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
                <DropdownMenuItem onClick={() => onEdit(position)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-loss focus:text-loss"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
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

          {/* Price comparison */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-secondary/50">
              <p className="text-xs text-muted-foreground">Precio Compra</p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {formatARS(position.purchasePrice)}
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
            <span>El precio teórico no coincide con el de tu broker?</span>
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
              <span className="font-medium text-foreground ml-auto">{formatUSD(position.stockPriceUSD)}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">CCL compra:</span>
              <span className="font-medium text-foreground ml-auto">{formatARS(position.cclAtPurchase)}</span>
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
              <span className="font-medium text-foreground">{position.quantity} CEDEARs</span>
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

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(position.purchaseDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{position.daysHeld} dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar posicion</AlertDialogTitle>
            <AlertDialogDescription>
              {`Estas seguro de que queres eliminar tu posicion de ${position.ticker}? Esta accion no se puede deshacer.`}
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

      <RatioCorrectionModal
        open={showRatioModal}
        onOpenChange={setShowRatioModal}
        currentRatio={position.ratio}
        onSave={(newRatio) => onRatioUpdate(position.id, newRatio)}
      />
    </TooltipProvider>
  )
}

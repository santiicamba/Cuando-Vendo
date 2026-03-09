'use client'

import { useState } from 'react'
import { Calendar, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, DollarSign, Hash, Clock } from 'lucide-react'
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
import { CalculatedPosition, formatARS, formatUSD, formatPercent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PositionCardProps {
  position: CalculatedPosition
  cclRate: number
  onEdit: (position: CalculatedPosition) => void
  onDelete: (id: string) => void
}

export function PositionCard({ position, cclRate, onEdit, onDelete }: PositionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const isPositive = position.realReturn >= 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        isPositive 
          ? "hover:ring-2 hover:ring-success/30" 
          : "hover:ring-2 hover:ring-loss/30"
      )}>
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1",
          isPositive ? "bg-gradient-to-r from-success/80 to-success" : "bg-gradient-to-r from-loss/80 to-loss"
        )} />
        
        <CardHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl text-lg font-bold shadow-sm",
                isPositive 
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
                  <span className="sr-only">Abrir menú</span>
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

        <CardContent className="space-y-4 pt-0">
          {/* Real Return - Large and prominent */}
          <div className={cn(
            "flex items-center justify-center py-4 px-4 rounded-xl",
            isPositive 
              ? "bg-gradient-to-br from-success/20 to-success/5" 
              : "bg-gradient-to-br from-loss/20 to-loss/5"
          )}>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Rendimiento Real</p>
              <div className="flex items-center justify-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-loss" />
                )}
                <span className={cn(
                  "text-3xl font-bold",
                  isPositive ? "text-success" : "text-loss"
                )}>
                  {formatPercent(position.realReturn)}
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
              <p className="text-xs text-muted-foreground">Precio Teórico</p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {formatARS(position.theoreticalPrice)}
              </p>
            </div>
            <div className={cn(
              "p-2 rounded-lg",
              isPositive ? "bg-success/10" : "bg-loss/10"
            )}>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <p className={cn(
                "text-sm font-semibold mt-1",
                isPositive ? "text-success" : "text-loss"
              )}>
                {formatARS(position.priceDifference)}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Stock USD:</span>
              <span className="font-medium text-foreground ml-auto">{formatUSD(position.stockPriceUSD)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Ratio:</span>
              <span className="font-medium text-foreground ml-auto">
                {position.ratio}
                {position.ratioOverridden && (
                  <span className="text-xs text-primary ml-1">(mod)</span>
                )}
              </span>
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
                isPositive ? "text-success" : "text-loss"
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
              <span>{position.daysHeld} días</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar posición</AlertDialogTitle>
            <AlertDialogDescription>
              {`¿Estás seguro de que querés eliminar tu posición de ${position.ticker}? Esta acción no se puede deshacer.`}
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
    </>
  )
}

'use client'

import { TrendingUp, TrendingDown, Wallet, PiggyBank, Award, AlertTriangle, DollarSign, Banknote, ArrowUpDown, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PortfolioSummary as PortfolioSummaryType, formatARS, formatPercent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const isPositiveARS = summary.overallReturnARS >= 0
  const isPositiveUSD = summary.overallReturnUSD >= 0
  const isPositiveCCL = summary.overallCclEffect >= 0

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Invertido</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatARS(summary.totalInvested)}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Value */}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Actual</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatARS(summary.totalCurrentValue)}
                </p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary">
                <PiggyBank className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Three Returns + Hoy Card */}
        <Card className="bg-card border-border/50 lg:col-span-1">
          <CardContent className="pt-0">
            <div className="space-y-2">
              {/* Return USD */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DollarSign className={cn("w-4 h-4", isPositiveUSD ? "text-success" : "text-loss")} />
                  <span className="text-xs text-muted-foreground">USD</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Rendimiento puro de las acciones</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  {isPositiveUSD ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-loss" />}
                  <span className={cn("text-sm font-bold", isPositiveUSD ? "text-success" : "text-loss")}>
                    {formatPercent(summary.overallReturnUSD)}
                  </span>
                </div>
              </div>

              {/* Return ARS */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Banknote className={cn("w-4 h-4", isPositiveARS ? "text-success" : "text-loss")} />
                  <span className="text-xs text-muted-foreground">ARS</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Rendimiento total en pesos</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  {isPositiveARS ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-loss" />}
                  <span className={cn("text-sm font-bold", isPositiveARS ? "text-success" : "text-loss")}>
                    {formatPercent(summary.overallReturnARS)}
                  </span>
                </div>
              </div>

              {/* CCL Effect */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className={cn("w-4 h-4", isPositiveCCL ? "text-success" : "text-loss")} />
                  <span className="text-xs text-muted-foreground">CCL</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Info className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Efecto del tipo de cambio</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  {isPositiveCCL ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingDown className="w-3 h-3 text-loss" />}
                  <span className={cn("text-sm font-bold", isPositiveCCL ? "text-success" : "text-loss")}>
                    {formatPercent(summary.overallCclEffect)}
                  </span>
                </div>
              </div>

              {/* Hoy separator + row */}
              {summary.dailyChangeARS !== null && summary.dailyChangePercent !== null && (
                <>
                  <div className="border-t border-border my-1" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Hoy</span>
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      summary.dailyChangePercent > 0 ? "text-success" :
                      summary.dailyChangePercent < 0 ? "text-loss" :
                      "text-muted-foreground"
                    )}>
                      {formatARS(summary.dailyChangeARS)}
                      {' '}
                      {formatPercent(summary.dailyChangePercent)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Best/Worst Performers */}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3">
              {summary.bestPerformer && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-success" />
                  <span className="text-xs text-muted-foreground">Mejor:</span>
                  <span className="text-sm font-medium text-foreground">
                    {summary.bestPerformer.ticker}
                  </span>
                  <span className="text-xs text-success ml-auto">
                    {formatPercent(summary.bestPerformer.returnARS)}
                  </span>
                </div>
              )}
              {summary.worstPerformer && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-loss" />
                  <span className="text-xs text-muted-foreground">Peor:</span>
                  <span className="text-sm font-medium text-foreground">
                    {summary.worstPerformer.ticker}
                  </span>
                  <span className="text-xs text-loss ml-auto">
                    {formatPercent(summary.worstPerformer.returnARS)}
                  </span>
                </div>
              )}
              {!summary.bestPerformer && !summary.worstPerformer && (
                <p className="text-sm text-muted-foreground">
                  Sin posiciones
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

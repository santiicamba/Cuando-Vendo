'use client'

import { TrendingUp, TrendingDown, Wallet, PiggyBank, Award, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PortfolioSummary as PortfolioSummaryType, formatARS, formatPercent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const isPositive = summary.overallReturn >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      <Card className={cn(
        "bg-card border-border/50",
        isPositive ? "ring-1 ring-success/30" : "ring-1 ring-loss/30"
      )}>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Rendimiento Total</p>
              <p className={cn(
                "text-2xl font-bold mt-1",
                isPositive ? "text-success" : "text-loss"
              )}>
                {formatPercent(summary.overallReturn)}
              </p>
            </div>
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              isPositive ? "bg-success/20" : "bg-loss/20"
            )}>
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-loss" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                  {formatPercent(summary.bestPerformer.realReturn)}
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
                  {formatPercent(summary.worstPerformer.realReturn)}
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
  )
}

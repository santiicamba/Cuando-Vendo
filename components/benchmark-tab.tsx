'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { TrendingUp, TrendingDown, Calendar, Award, AlertCircle, Home } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Position, CalculatedPosition, calculatePosition, formatARS, formatPercent } from '@/lib/types'
import { getPositions, getMarketData } from '@/lib/store'
import { cn } from '@/lib/utils'

interface BenchmarkTabProps {
  onSwitchToHome: () => void
}

interface BenchmarkData {
  spy: { priceAtStart: number; priceNow: number; returnUSD: number; returnARS: number } | null
  ccl: { cclAtStart: number; cclNow: number; returnARS: number } | null
  plazoFijo: { returnARS: number } | null
}

export function BenchmarkTab({ onSwitchToHome }: BenchmarkTabProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [calculatedPositions, setCalculatedPositions] = useState<CalculatedPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData>({ spy: null, ccl: null, plazoFijo: null })
  const [tnaInput, setTnaInput] = useState('75')
  const [isFetchingSPY, setIsFetchingSPY] = useState(false)
  const hasFetchedSPY = useRef(false)

  // Load TNA from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tna_plazo_fijo')
      if (stored) setTnaInput(stored)
    } catch {
      // localStorage not available
    }
  }, [])

  // Save TNA to localStorage on change
  const handleTnaChange = (value: string) => {
    setTnaInput(value)
    try {
      localStorage.setItem('tna_plazo_fijo', value)
    } catch {
      // localStorage not available
    }
  }

  // Load positions and calculate
  useEffect(() => {
    const storedPositions = getPositions()
    const marketData = getMarketData()
    setPositions(storedPositions)
    const calcs = storedPositions.map(p => calculatePosition(p, marketData.cclRate))
    setCalculatedPositions(calcs)
    setIsLoading(false)
  }, [])

  // Get earliest purchase date — if mixed portfolio, only consider non-Merval positions
  // (so SPY comparison starts from when the first CEDEAR was bought)
  const getEarliestDate = useCallback((): Date | null => {
    if (positions.length === 0) return null
    const nonMerval = positions.filter(p => p.market !== 'MERVAL')
    const source = nonMerval.length > 0 ? nonMerval : positions
    const allDates = source.flatMap(p => p.purchases.map(pu => new Date(pu.date)))
    if (allDates.length === 0) return null
    return new Date(Math.min(...allDates.map(d => d.getTime())))
  }, [positions])

  // Get earliest CCL at purchase — skip Merval positions (stored with cclAtPurchase: 1 as a workaround)
  const getEarliestCCL = useCallback((): number | null => {
    if (positions.length === 0) return null
    let earliest: { date: Date; ccl: number } | null = null
    for (const pos of positions) {
      if (pos.market === 'MERVAL') continue  // Merval positions have fake CCL of 1
      for (const pu of pos.purchases) {
        const d = new Date(pu.date)
        if (!earliest || d < earliest.date) {
          earliest = { date: d, ccl: pu.cclAtPurchase }
        }
      }
    }
    return earliest?.ccl ?? null
  }, [positions])

  const earliestDate = getEarliestDate()
  const daysInvested = earliestDate ? Math.floor((Date.now() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
  const currentCCL = getMarketData().cclRate
  const earliestCCL = getEarliestCCL()

  // Calculate portfolio returns
  const portfolioReturnUSD = calculatedPositions.length > 0
    ? calculatedPositions.reduce((sum, p) => sum + p.returnUSD * p.totalInvested, 0) / calculatedPositions.reduce((sum, p) => sum + p.totalInvested, 0)
    : 0
  const portfolioReturnARS = calculatedPositions.length > 0
    ? calculatedPositions.reduce((sum, p) => sum + p.returnARS * p.totalInvested, 0) / calculatedPositions.reduce((sum, p) => sum + p.totalInvested, 0)
    : 0

  // Fetch SPY historical data
  const fetchSPYData = useCallback(async () => {
    if (!earliestDate) return
    setIsFetchingSPY(true)
    try {
      const startTimestamp = Math.floor(earliestDate.getTime() / 1000)
      const endTimestamp = Math.floor(Date.now() / 1000)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`
      
      const res = await fetch(`/api/stock/SPY?period1=${startTimestamp}&period2=${endTimestamp}`)
      if (!res.ok) throw new Error('Failed to fetch SPY')
      const data = await res.json()
      
      if (data.success && data.historicalStart !== undefined) {
        const priceAtStart = data.historicalStart
        const priceNow = data.price
        const returnUSD = ((priceNow / priceAtStart) - 1) * 100
        // ARS return: apply CCL change
        const cclChange = earliestCCL && earliestCCL > 0 ? (currentCCL / earliestCCL) : 1
        const returnARS = ((priceNow / priceAtStart) * cclChange - 1) * 100
        setBenchmarkData(prev => ({ ...prev, spy: { priceAtStart, priceNow, returnUSD, returnARS } }))
      }
    } catch (err) {
      console.error('[v0] SPY fetch error:', err)
    } finally {
      setIsFetchingSPY(false)
    }
  }, [earliestDate, earliestCCL, currentCCL])

  // Calculate CCL benchmark
  useEffect(() => {
    if (earliestCCL && earliestCCL > 0) {
      const returnARS = ((currentCCL / earliestCCL) - 1) * 100
      setBenchmarkData(prev => ({ ...prev, ccl: { cclAtStart: earliestCCL, cclNow: currentCCL, returnARS } }))
    }
  }, [earliestCCL, currentCCL])

  // Calculate plazo fijo
  useEffect(() => {
    const tna = parseFloat(tnaInput) || 0
    if (tna > 0 && daysInvested > 0) {
      // Simple daily compound: (1 + TNA/365)^days - 1
      const dailyRate = tna / 100 / 365
      const returnARS = (Math.pow(1 + dailyRate, daysInvested) - 1) * 100
      setBenchmarkData(prev => ({ ...prev, plazoFijo: { returnARS } }))
    } else {
      setBenchmarkData(prev => ({ ...prev, plazoFijo: null }))
    }
  }, [tnaInput, daysInvested])

  // Fetch SPY exactly once when positions exist — use ref to prevent loops
  useEffect(() => {
    if (!isLoading && positions.length > 0 && earliestDate && !hasFetchedSPY.current) {
      hasFetchedSPY.current = true
      fetchSPYData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, positions.length])

  // Best and worst performer
  const sortedByUSD = [...calculatedPositions].sort((a, b) => b.returnUSD - a.returnUSD)
  const bestPerformer = sortedByUSD[0] || null
  const worstPerformer = sortedByUSD[sortedByUSD.length - 1] || null

  // Badge logic
  const getBadge = (benchmarkReturn: number, portfolioReturn: number) => {
    if (portfolioReturn > benchmarkReturn) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Le ganaste</span>
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-loss/20 text-loss font-medium">Te gano</span>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    )
  }

  // Empty state
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground text-center mb-2">
          Todavia no cargaste ninguna posicion
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
          Agrega tu primer CEDEAR desde la pestana Inicio para ver como te esta yendo.
        </p>
        <Button onClick={onSwitchToHome} className="gap-2">
          <Home className="w-4 h-4" />
          Ir a Inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Como me esta yendo?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comparamos tu cartera contra las alternativas mas comunes desde tu primera compra.
        </p>
      </div>

      {/* TNA Input */}
      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-[200px] space-y-1.5">
          <Label htmlFor="tna" className="text-xs text-muted-foreground">TNA del plazo fijo en ese periodo (%)</Label>
          <Input
            id="tna"
            type="number"
            step="0.1"
            min="0"
            value={tnaInput}
            onChange={(e) => handleTnaChange(e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      {/* Main comparison card */}
      <Card className="border-border/50">
        <CardContent className="divide-y divide-border">
          {/* Row 1 - Tu cartera */}
          <div className="py-4 first:pt-0 last:pb-0 bg-[#ECFDF5] -mx-6 px-6 first:-mt-6 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Tu cartera</p>
              </div>
              <div className="text-right">
                <p className={cn("text-lg font-bold", portfolioReturnARS >= 0 ? "text-success" : "text-loss")}>
                  {formatPercent(portfolioReturnARS)} ARS
                </p>
                <p className={cn("text-sm", portfolioReturnUSD >= 0 ? "text-success" : "text-loss")}>
                  {formatPercent(portfolioReturnUSD)} USD
                </p>
              </div>
            </div>
          </div>

          {/* Row 2 - S&P 500 */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">S&P 500 (SPY)</p>
                {isFetchingSPY && <Spinner className="w-4 h-4 text-muted-foreground" />}
              </div>
              {benchmarkData.spy ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", benchmarkData.spy.returnARS >= 0 ? "text-success" : "text-loss")}>
                      {formatPercent(benchmarkData.spy.returnARS)} ARS
                    </p>
                    <p className={cn("text-xs", benchmarkData.spy.returnUSD >= 0 ? "text-success" : "text-loss")}>
                      {formatPercent(benchmarkData.spy.returnUSD)} USD
                    </p>
                  </div>
                  {getBadge(benchmarkData.spy.returnARS, portfolioReturnARS)}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Cargando...</span>
              )}
            </div>
          </div>

          {/* Row 3 - Dolar CCL */}
          <div className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Dolar CCL</p>
              {benchmarkData.ccl ? (
                <div className="flex items-center gap-3">
                  <p className={cn("text-sm font-semibold", benchmarkData.ccl.returnARS >= 0 ? "text-success" : "text-loss")}>
                    {formatPercent(benchmarkData.ccl.returnARS)} ARS
                  </p>
                  {getBadge(benchmarkData.ccl.returnARS, portfolioReturnARS)}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>

          {/* Row 4 - Plazo fijo */}
          <div className="py-4 last:pb-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Plazo fijo ARS</p>
              {benchmarkData.plazoFijo ? (
                <div className="flex items-center gap-3">
                  <p className={cn("text-sm font-semibold", benchmarkData.plazoFijo.returnARS >= 0 ? "text-success" : "text-loss")}>
                    {formatPercent(benchmarkData.plazoFijo.returnARS)} ARS
                  </p>
                  {getBadge(benchmarkData.plazoFijo.returnARS, portfolioReturnARS)}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen del periodo */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen del periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Fecha de inicio</span>
            </div>
            <span className="font-medium text-foreground">
              {earliestDate ? earliestDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Dias invertido</span>
            </div>
            <span className="font-medium text-foreground">{daysInvested} dias</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="w-4 h-4" />
              <span>Mejor decision</span>
            </div>
            {bestPerformer ? (
              <span className="font-medium text-success">
                {bestPerformer.ticker} ({formatPercent(bestPerformer.returnUSD)})
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="w-4 h-4" />
              <span>Peor decision</span>
            </div>
            {worstPerformer ? (
              <span className="font-medium text-loss">
                {worstPerformer.ticker} ({formatPercent(worstPerformer.returnUSD)})
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

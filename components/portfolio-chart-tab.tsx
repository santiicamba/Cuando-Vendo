'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Position, CalculatedPosition, calculatePosition, formatARS } from '@/lib/types'
import { getPositions, getMarketData } from '@/lib/store'

interface PortfolioChartTabProps {
  onSwitchToHome: () => void
}

interface CategoryData {
  name: string
  value: number
  color: string
  positions: CalculatedPosition[]
}

interface TickerData {
  name: string
  ticker: string
  value: number
  color: string
}

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  'CEDEARs': '#059669',
  'Acciones Locales': '#f59e0b',
  'Bonos': '#6366f1',
}

// Ticker color palette
const TICKER_COLORS = [
  '#059669', '#10b981', '#34d399', '#6ee7b7',
  '#f59e0b', '#fbbf24', '#fcd34d',
  '#6366f1', '#818cf8', '#a5b4fc',
  '#ec4899', '#f43f5e'
]

// Custom active shape for hover effect
const renderActiveShape = (props: {
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  fill: string
}) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

export function PortfolioChartTab({ onSwitchToHome }: PortfolioChartTabProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [calculatedPositions, setCalculatedPositions] = useState<CalculatedPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  // Load positions and calculate
  useEffect(() => {
    const storedPositions = getPositions()
    const marketData = getMarketData()
    setPositions(storedPositions)
    const calcs = storedPositions.map(p => calculatePosition(p, marketData.cclRate))
    setCalculatedPositions(calcs)
    setIsLoading(false)
  }, [])

  // Get category for a position
  const getCategory = useCallback((pos: CalculatedPosition): string => {
    if (pos.market === 'MERVAL') return 'Acciones Locales'
    if (pos.market === 'BOND') return 'Bonos'
    return 'CEDEARs'
  }, [])

  // Group positions by category
  const categoryData = useMemo((): CategoryData[] => {
    const groups: Record<string, CalculatedPosition[]> = {}
    
    for (const pos of calculatedPositions) {
      const cat = getCategory(pos)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(pos)
    }
    
    return Object.entries(groups).map(([name, positions]) => ({
      name,
      value: positions.reduce((sum, p) => sum + p.currentValue, 0),
      color: CATEGORY_COLORS[name] || '#6b7280',
      positions,
    })).sort((a, b) => b.value - a.value)
  }, [calculatedPositions, getCategory])

  // Get ticker data for drilled-down category
  const tickerData = useMemo((): TickerData[] => {
    if (!drillDownCategory) return []
    
    const category = categoryData.find(c => c.name === drillDownCategory)
    if (!category) return []
    
    return category.positions
      .map((pos, idx) => ({
        name: pos.name,
        ticker: pos.ticker,
        value: pos.currentValue,
        color: TICKER_COLORS[idx % TICKER_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [drillDownCategory, categoryData])

  // Total portfolio value
  const totalValue = useMemo(() => {
    return calculatedPositions.reduce((sum, p) => sum + p.currentValue, 0)
  }, [calculatedPositions])

  // Category total for drill-down
  const categoryTotal = useMemo(() => {
    if (!drillDownCategory) return 0
    const cat = categoryData.find(c => c.name === drillDownCategory)
    return cat?.value || 0
  }, [drillDownCategory, categoryData])

  // Current chart data
  const chartData = drillDownCategory ? tickerData : categoryData

  // Handle slice click
  const handleSliceClick = (data: CategoryData | TickerData) => {
    if (!drillDownCategory && 'positions' in data) {
      setDrillDownCategory(data.name)
      setActiveIndex(undefined)
    }
  }

  // Handle legend row click
  const handleLegendClick = (item: CategoryData | TickerData) => {
    if (!drillDownCategory && 'positions' in item) {
      setDrillDownCategory(item.name)
      setActiveIndex(undefined)
    }
  }

  // Go back to Level 1
  const handleBack = () => {
    setDrillDownCategory(null)
    setActiveIndex(undefined)
  }

  // Handle mouse enter/leave for active shape
  const onPieEnter = (_: unknown, index: number) => setActiveIndex(index)
  const onPieLeave = () => setActiveIndex(undefined)

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
          Todavia no tenes posiciones cargadas
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
          Agrega tu primera posicion desde la pestana Inicio para ver la distribucion de tu cartera.
        </p>
        <Button onClick={onSwitchToHome} className="gap-2">
          <Home className="w-4 h-4" />
          Ir al Inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Cartera</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza la distribucion de tus inversiones.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Mi Cartera</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {drillDownCategory
                  ? `${drillDownCategory} - detalle por ticker`
                  : 'Distribucion por tipo de activo'}
              </p>
            </div>
            {drillDownCategory && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="w-3 h-3" />
                Volver
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Chart */}
          <div className="relative h-[280px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 110}
                  dataKey="value"
                  nameKey="name"
                  onClick={handleSliceClick}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  style={{ cursor: drillDownCategory ? 'default' : 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>

              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {drillDownCategory ? (
                  <span className="text-sm font-medium text-foreground">{drillDownCategory}</span>
                ) : (
                  <span className="text-sm font-bold text-foreground">{formatARS(totalValue)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-2">
            {chartData.map((item, idx) => {
              const total = drillDownCategory ? categoryTotal : totalValue
              const percent = total > 0 ? (item.value / total) * 100 : 0
              const displayName = 'ticker' in item ? item.ticker : item.name
              
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between py-2 px-2 rounded-md transition-colors ${
                    !drillDownCategory ? 'cursor-pointer hover:bg-muted/50' : ''
                  }`}
                  onClick={() => handleLegendClick(item as CategoryData)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground truncate max-w-[140px] sm:max-w-[200px]">
                      {displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-sm font-medium text-muted-foreground">
                      {percent.toFixed(1)}%
                    </span>
                    <span className="text-sm font-semibold text-foreground min-w-[100px] text-right">
                      {formatARS(item.value)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

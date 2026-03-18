'use client'

import { useState, useEffect, useMemo } from 'react'
import { RotateCcw, AlertCircle, Home, ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Position, CalculatedPosition, calculatePosition, formatARS, formatPercent } from '@/lib/types'
import { getPositions, getMarketData } from '@/lib/store'
import { cn } from '@/lib/utils'

interface SimulatorTabProps {
  onSwitchToHome: () => void
}

export function SimulatorTab({ onSwitchToHome }: SimulatorTabProps) {
  const [positions, setPositions] = useState<Position[]>([])
  const [calculatedPositions, setCalculatedPositions] = useState<CalculatedPosition[]>([])
  const [currentCCL, setCurrentCCL] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Slider states
  const [cclChange, setCclChange] = useState(0) // -50 to +100
  const [globalMarketChange, setGlobalMarketChange] = useState(0) // -50 to +100
  const [positionOverrides, setPositionOverrides] = useState<Record<string, number>>({}) // position id -> change %
  const [adjustOpen, setAdjustOpen] = useState(false)

  // Load data
  useEffect(() => {
    const storedPositions = getPositions()
    const marketData = getMarketData()
    setPositions(storedPositions)
    setCurrentCCL(marketData.cclRate)
    const calcs = storedPositions.map(p => calculatePosition(p, marketData.cclRate))
    setCalculatedPositions(calcs)
    setIsLoading(false)
  }, [])

  // Current portfolio value
  const currentValue = useMemo(() => {
    return calculatedPositions.reduce((sum, p) => sum + p.currentValue, 0)
  }, [calculatedPositions])

  // Simulated values
  const simulatedCCL = currentCCL * (1 + cclChange / 100)

  const simulatedPositions = useMemo(() => {
    return positions.map(pos => {
      // Check if there's an individual override
      const override = positionOverrides[pos.id]
      const priceChange = override !== undefined ? override : globalMarketChange
      
      // Simulate new stock price
      const simulatedStockPrice = pos.currentStockPriceUSD * (1 + priceChange / 100)
      
      // Create simulated position
      const simPos: Position = {
        ...pos,
        currentStockPriceUSD: simulatedStockPrice,
      }
      
      return calculatePosition(simPos, simulatedCCL)
    })
  }, [positions, positionOverrides, globalMarketChange, simulatedCCL])

  const simulatedValue = useMemo(() => {
    return simulatedPositions.reduce((sum, p) => sum + p.currentValue, 0)
  }, [simulatedPositions])

  const difference = simulatedValue - currentValue
  const differencePercent = currentValue > 0 ? (difference / currentValue) * 100 : 0
  const isPositive = difference >= 0

  // Preset handlers
  const applyPreset = (cclPct: number, marketPct: number) => {
    setCclChange(cclPct)
    setGlobalMarketChange(marketPct)
    setPositionOverrides({})
  }

  const resetAll = () => {
    setCclChange(0)
    setGlobalMarketChange(0)
    setPositionOverrides({})
  }

  const handlePositionOverride = (positionId: string, value: number) => {
    setPositionOverrides(prev => ({ ...prev, [positionId]: value }))
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
          No hay posiciones para simular
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
          Agrega tu primer CEDEAR desde la pestana Inicio.
        </p>
        <Button onClick={onSwitchToHome} className="gap-2">
          <Home className="w-4 h-4" />
          Ir a Inicio
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-32">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Que pasaria si?</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simula distintos escenarios y descubri como afectarian tu cartera. Tus datos reales no se modifican.
        </p>
      </div>

      {/* Sticky summary card */}
      <Card className={cn(
        "sticky top-0 z-10 border-2 transition-colors duration-300",
        isPositive ? "bg-success/10 border-success/30" : "bg-loss/10 border-loss/30"
      )}>
        <CardContent className="py-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor actual de tu cartera:</span>
            <span className="font-medium text-foreground">{formatARS(currentValue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor en este escenario:</span>
            <span className="font-semibold text-foreground">{formatARS(simulatedValue)}</span>
          </div>
          <div className="flex justify-between text-base pt-1">
            <span className="text-muted-foreground">Diferencia:</span>
            <span className={cn("font-bold", isPositive ? "text-success" : "text-loss")}>
              {isPositive ? '+' : ''}{formatARS(difference)} ({formatPercent(differencePercent)})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preset scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card 
          className="cursor-pointer hover:border-loss/50 transition-colors border-border/50"
          onClick={() => applyPreset(-20, -30)}
        >
          <CardContent className="py-4">
            <p className="font-medium text-foreground text-sm">Escenario Crisis</p>
            <p className="text-xs text-muted-foreground mt-0.5">CCL -20%, mercado global -30%</p>
            <p className="text-xs text-loss mt-2">Cuanto perderias si se repite un crash como el de 2020?</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:border-success/50 transition-colors border-border/50"
          onClick={() => applyPreset(40, 25)}
        >
          <CardContent className="py-4">
            <p className="font-medium text-foreground text-sm">Escenario Boom</p>
            <p className="text-xs text-muted-foreground mt-0.5">CCL +40%, mercado global +25%</p>
            <p className="text-xs text-success mt-2">Cuanto ganarias si se da un rally fuerte?</p>
          </CardContent>
        </Card>
      </div>

      {/* Global sliders */}
      <div className="space-y-6">
        {/* CCL Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <label className="text-sm font-medium text-foreground">
              Si el dolar CCL cambia un {cclChange >= 0 ? '+' : ''}{cclChange}%...
            </label>
            <span className="text-sm text-muted-foreground">
              {formatARS(simulatedCCL)}
            </span>
          </div>
          <Slider
            value={[cclChange]}
            onValueChange={([v]) => setCclChange(v)}
            min={-50}
            max={100}
            step={1}
            className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-50%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>

        {/* Global market slider */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">
            Si todas las acciones suben o bajan un {globalMarketChange >= 0 ? '+' : ''}{globalMarketChange}%...
          </label>
          <Slider
            value={[globalMarketChange]}
            onValueChange={([v]) => setGlobalMarketChange(v)}
            min={-50}
            max={100}
            step={1}
            className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>-50%</span>
            <span>0%</span>
            <span>+100%</span>
          </div>
        </div>
      </div>

      {/* Per-position adjustments */}
      <Collapsible open={adjustOpen} onOpenChange={setAdjustOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>Ajuste por posicion</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", adjustOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {simulatedPositions.map((simPos, idx) => {
            const pos = positions[idx]
            const override = positionOverrides[pos.id]
            const effectiveChange = override !== undefined ? override : globalMarketChange
            
            return (
              <div key={pos.id} className="space-y-2 pb-4 border-b border-border last:border-0">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="font-medium text-foreground text-sm">{pos.ticker}</span>
                    <span className="text-xs text-muted-foreground ml-2">{pos.name}</span>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-medium", simPos.returnUSD >= 0 ? "text-success" : "text-loss")}>
                      {formatPercent(simPos.returnUSD)}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatARS(simPos.currentValue)}</p>
                  </div>
                </div>
                <Slider
                  value={[effectiveChange]}
                  onValueChange={([v]) => handlePositionOverride(pos.id, v)}
                  min={-80}
                  max={200}
                  step={1}
                  className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-80%</span>
                  <span>{effectiveChange >= 0 ? '+' : ''}{effectiveChange}%</span>
                  <span>+200%</span>
                </div>
              </div>
            )
          })}
        </CollapsibleContent>
      </Collapsible>

      {/* Floating reset button */}
      <Button
        onClick={resetAll}
        variant="secondary"
        className="fixed bottom-20 right-4 z-50 shadow-lg gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Restablecer
      </Button>
    </div>
  )
}

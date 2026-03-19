'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarIcon, Info, RefreshCw, Loader2, AlertCircle, Check, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { CEDEARCombobox } from '@/components/cedear-combobox'
import { Purchase } from '@/lib/types'
import { CEDEARS, type CEDEAR } from '@/lib/cedears'
import { cn } from '@/lib/utils'

interface PositionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    ticker: string
    name: string
    ratio: number
    ratioOverridden: boolean
    market: string
    purchase: Omit<Purchase, 'id'>
    targetGainUSD: number | null
    stopLossUSD: number | null
  }) => void
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function PositionDialog({ open, onOpenChange, onSave }: PositionDialogProps) {
  const [selectedCedear, setSelectedCedear] = useState<CEDEAR | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined)
  const [priceARS, setPriceARS] = useState('')
  const [cclAtPurchase, setCclAtPurchase] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stockPriceUSD, setStockPriceUSD] = useState('')
  const [customRatio, setCustomRatio] = useState('')
  const [useCustomRatio, setUseCustomRatio] = useState(false)
  const [priceFetchStatus, setPriceFetchStatus] = useState<FetchStatus>('idle')
  const [targetGainUSD, setTargetGainUSD] = useState('')
  const [stopLossUSD, setStopLossUSD] = useState('')

  const fetchStockPrice = useCallback(async (ticker: string) => {
    setPriceFetchStatus('loading')
    try {
      const response = await fetch(`/api/stock/${encodeURIComponent(ticker)}`)
      const data = await response.json()
      if (data.success && data.price) {
        setStockPriceUSD(data.price.toFixed(2))
        setPriceFetchStatus('success')
        setTimeout(() => setPriceFetchStatus('idle'), 2000)
      } else {
        throw new Error(data.error || 'Failed to fetch price')
      }
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error)
      setPriceFetchStatus('error')
    }
  }, [])

  useEffect(() => {
    if (open) {
      setSelectedCedear(null)
      setPurchaseDate(undefined)
      setPriceARS('')
      setCclAtPurchase('')
      setQuantity('')
      setStockPriceUSD('')
      setCustomRatio('')
      setUseCustomRatio(false)
      setPriceFetchStatus('idle')
      setTargetGainUSD('')
      setStopLossUSD('')
    }
  }, [open])

  const handleCedearSelect = (cedear: CEDEAR | null) => {
    setSelectedCedear(cedear)
    if (cedear) {
      if (!useCustomRatio) setCustomRatio(cedear.ratio.toString())
      fetchStockPrice(cedear.ticker)
    } else {
      setStockPriceUSD('')
      setPriceFetchStatus('idle')
    }
  }

  const handleSave = () => {
    if (!selectedCedear || !purchaseDate || !priceARS || !cclAtPurchase || !quantity || !stockPriceUSD) return

    const effectiveRatio = useCustomRatio && customRatio
      ? parseFloat(customRatio)
      : selectedCedear.ratio

    const theoreticalPrice = (parseFloat(stockPriceUSD) / effectiveRatio) * parseFloat(cclAtPurchase)
    const priceDifference = Math.abs((theoreticalPrice - parseFloat(priceARS)) / parseFloat(priceARS))

    if (priceDifference > 0.7) {
      const shouldContinue = window.confirm(
        'El precio teorico difiere mucho del precio de compra. Es posible que el ratio este incorrecto. Verificá en byma.com.ar/cedears antes de continuar. Deseas continuar igual?'
      )
      if (!shouldContinue) return
    }

    onSave({
      ticker: selectedCedear.ticker,
      name: selectedCedear.name,
      ratio: effectiveRatio,
      ratioOverridden: useCustomRatio,
      market: selectedCedear.market,
      purchase: {
        date: purchaseDate.toISOString(),
        quantity: parseFloat(quantity),
        priceARS: parseFloat(priceARS),
        cclAtPurchase: parseFloat(cclAtPurchase),
        stockPriceUSD: parseFloat(stockPriceUSD),
      },
      targetGainUSD: targetGainUSD ? parseFloat(targetGainUSD) : null,
      stopLossUSD: stopLossUSD ? parseFloat(stopLossUSD) : null,
    })
    onOpenChange(false)
  }

  const isValid = selectedCedear && purchaseDate && priceARS && cclAtPurchase && quantity && stockPriceUSD

  if (!open) return null

  return (
    /* Full-screen overlay on mobile, centered modal on desktop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Agregar Posicion"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet panel */}
      <div className={cn(
        "relative z-10 flex flex-col bg-background",
        "w-full sm:max-w-[500px] sm:rounded-xl sm:shadow-2xl",
        // Mobile: full height sheet from bottom
        "h-[92dvh] sm:h-auto sm:max-h-[90dvh]",
        "rounded-t-2xl sm:rounded-xl",
      )}>

        {/* ── Pinned header with ticker selector ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border space-y-3">
          {/* Drag handle on mobile */}
          <div className="flex justify-center sm:hidden">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Agregar Posicion</h2>
              <p className="text-xs text-muted-foreground">Agrega una nueva posicion de CEDEAR</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ticker selector — always visible at top */}
          <div className="space-y-1.5">
            <Label className="text-sm">CEDEAR</Label>
            <CEDEARCombobox
              value={selectedCedear?.ticker || ''}
              onSelect={handleCedearSelect}
            />
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

          <div className="space-y-1.5">
            <Label>Fecha de Compra</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal bg-card',
                    !purchaseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {purchaseDate
                    ? format(purchaseDate, "PPP", { locale: es })
                    : <span>Seleccionar fecha...</span>
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={purchaseDate}
                  onSelect={setPurchaseDate}
                  disabled={(date) => date > new Date()}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quantity">Cantidad de CEDEARs</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              min="1"
              placeholder="ej: 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-card"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="priceARS">Precio por Unidad (ARS)</Label>
              <Input
                id="priceARS"
                type="number"
                step="0.01"
                min="0"
                placeholder="ej: 15000"
                value={priceARS}
                onChange={(e) => setPriceARS(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cclAtPurchase">CCL al Comprar</Label>
              <Input
                id="cclAtPurchase"
                type="number"
                step="0.01"
                min="0"
                placeholder="ej: 1150"
                value={cclAtPurchase}
                onChange={(e) => setCclAtPurchase(e.target.value)}
                className="bg-card"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="stockPriceUSD">Precio del Activo (USD)</Label>
              {selectedCedear && (
                <button
                  type="button"
                  onClick={() => fetchStockPrice(selectedCedear.ticker)}
                  disabled={priceFetchStatus === 'loading'}
                  className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {priceFetchStatus === 'loading' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : priceFetchStatus === 'success' ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : priceFetchStatus === 'error' ? (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  {priceFetchStatus === 'loading' ? 'Cargando...' : 'Actualizar'}
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                id="stockPriceUSD"
                type="number"
                step="0.01"
                min="0"
                placeholder={priceFetchStatus === 'loading' ? 'Obteniendo precio...' : 'ej: 175.50'}
                value={stockPriceUSD}
                onChange={(e) => setStockPriceUSD(e.target.value)}
                className={cn('bg-card pr-10', priceFetchStatus === 'loading' && 'opacity-50')}
                disabled={priceFetchStatus === 'loading'}
              />
              {priceFetchStatus === 'loading' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              {priceFetchStatus === 'error'
                ? 'No se pudo obtener el precio. Ingresalo manualmente.'
                : 'Precio actual de la accion en el mercado de origen'}
            </p>
          </div>

          {/* Ratio section */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useCustomRatio" className="text-sm">Ratio Personalizado</Label>
                <p className="text-xs text-muted-foreground">
                  Ratio actual: {selectedCedear?.ratio || '—'}
                </p>
              </div>
              <Switch
                id="useCustomRatio"
                checked={useCustomRatio}
                onCheckedChange={setUseCustomRatio}
              />
            </div>
            {useCustomRatio && (
              <Input
                id="customRatio"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ratio personalizado"
                value={customRatio}
                onChange={(e) => setCustomRatio(e.target.value)}
                className="bg-card"
              />
            )}
            <p className="text-xs text-muted-foreground">
              Verificá que el ratio coincida con el de tu broker. Podés consultarlo en{' '}
              <a href="https://byma.com.ar/cedears" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                byma.com.ar/cedears
              </a>
            </p>
          </div>

          {/* Optional targets */}
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Mi objetivo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Opcional — podes completar esto despues</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="targetGainUSD" className="text-xs">Objetivo de ganancia (%)</Label>
                <Input
                  id="targetGainUSD"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ej: 20"
                  value={targetGainUSD}
                  onChange={(e) => setTargetGainUSD(e.target.value)}
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stopLossUSD" className="text-xs">Limite de perdida (%)</Label>
                <Input
                  id="stopLossUSD"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="ej: 10"
                  value={stopLossUSD}
                  onChange={(e) => setStopLossUSD(e.target.value)}
                  className="bg-card"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se comparará con el retorno en USD de la posicion.
            </p>
          </div>

          {/* Bottom spacer so last field clears the fixed footer */}
          <div className="h-2" />
        </div>

        {/* ── STATIC save button — never conditionally rendered ── */}
        {/* Uses fixed positioning independent of flex to guarantee visibility on mobile */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-border bg-background z-20"
          style={{ position: 'sticky', bottom: 0 }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            style={{
              backgroundColor: isValid ? '#059669' : '#d1d5db',
              color: '#ffffff',
              width: '100%',
              height: '48px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.5,
              border: 'none',
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          >
            Agregar Posicion
          </button>
        </div>
        {/* Bottom spacer to prevent content overlap with sticky button */}
        <div className="h-20 flex-shrink-0" aria-hidden="true" />
      </div>
    </div>
  )
}

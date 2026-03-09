'use client'

import { useState, useEffect, useCallback } from 'react'
import { CalendarIcon, Info, RefreshCw, Loader2, AlertCircle, Check } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Position, CalculatedPosition } from '@/lib/types'
import { CEDEARS, type CEDEAR } from '@/lib/cedears'
import { cn } from '@/lib/utils'

interface PositionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  position?: CalculatedPosition | null
  onSave: (data: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>) => void
  mode: 'create' | 'edit'
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function PositionDialog({ open, onOpenChange, position, onSave, mode }: PositionDialogProps) {
  const [selectedCedear, setSelectedCedear] = useState<CEDEAR | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined)
  const [purchasePrice, setPurchasePrice] = useState('')
  const [cclAtPurchase, setCclAtPurchase] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stockPriceUSD, setStockPriceUSD] = useState('')
  const [customRatio, setCustomRatio] = useState('')
  const [useCustomRatio, setUseCustomRatio] = useState(false)
  const [priceFetchStatus, setPriceFetchStatus] = useState<FetchStatus>('idle')

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
      if (mode === 'edit' && position) {
        const cedear = CEDEARS.find(c => c.ticker === position.ticker)
        setSelectedCedear(cedear || null)
        setPurchaseDate(new Date(position.purchaseDate))
        setPurchasePrice(position.purchasePrice.toString())
        setCclAtPurchase(position.cclAtPurchase.toString())
        setQuantity(position.quantity.toString())
        setStockPriceUSD(position.stockPriceUSD.toString())
        setUseCustomRatio(position.ratioOverridden)
        setCustomRatio(position.ratioOverridden ? position.ratio.toString() : '')
        setPriceFetchStatus('idle')
        // Fetch latest price on edit
        if (cedear) {
          fetchStockPrice(cedear.ticker)
        }
      } else {
        setSelectedCedear(null)
        setPurchaseDate(undefined)
        setPurchasePrice('')
        setCclAtPurchase('')
        setQuantity('')
        setStockPriceUSD('')
        setCustomRatio('')
        setUseCustomRatio(false)
        setPriceFetchStatus('idle')
      }
    }
  }, [open, mode, position, fetchStockPrice])

  const handleCedearSelect = (cedear: CEDEAR | null) => {
    setSelectedCedear(cedear)
    if (cedear) {
      if (!useCustomRatio) {
        setCustomRatio(cedear.ratio.toString())
      }
      // Auto-fetch stock price when CEDEAR is selected
      fetchStockPrice(cedear.ticker)
    } else {
      setStockPriceUSD('')
      setPriceFetchStatus('idle')
    }
  }

  const handleRefreshPrice = () => {
    if (selectedCedear) {
      fetchStockPrice(selectedCedear.ticker)
    }
  }

  const handleSave = () => {
    if (!selectedCedear || !purchaseDate || !purchasePrice || !cclAtPurchase || !quantity || !stockPriceUSD) {
      return
    }

    const effectiveRatio = useCustomRatio && customRatio
      ? parseFloat(customRatio)
      : selectedCedear.ratio

    onSave({
      ticker: selectedCedear.ticker,
      name: selectedCedear.name,
      ratio: effectiveRatio,
      ratioOverridden: useCustomRatio,
      market: selectedCedear.market,
      purchaseDate: purchaseDate.toISOString(),
      purchasePrice: parseFloat(purchasePrice),
      cclAtPurchase: parseFloat(cclAtPurchase),
      quantity: parseFloat(quantity),
      stockPriceUSD: parseFloat(stockPriceUSD),
    })
    onOpenChange(false)
  }

  const isValid = selectedCedear && purchaseDate && purchasePrice && cclAtPurchase && quantity && stockPriceUSD

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Posición' : 'Editar Posición'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Agregá una nueva posición de CEDEAR a tu portfolio.' 
              : 'Modificá los datos de tu posición.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>CEDEAR</Label>
            <CEDEARCombobox
              value={selectedCedear?.ticker || ''}
              onSelect={handleCedearSelect}
              disabled={mode === 'edit'}
            />
          </div>

          <div className="space-y-2">
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
                  {purchaseDate ? (
                    format(purchaseDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha...</span>
                  )}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Precio de Compra (ARS)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="ej: 15000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cclAtPurchase">CCL al Comprar (ARS/USD)</Label>
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

          <div className="space-y-2">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stockPriceUSD">Precio del Activo (USD)</Label>
              {selectedCedear && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshPrice}
                  disabled={priceFetchStatus === 'loading'}
                  className="h-6 px-2 text-xs"
                >
                  {priceFetchStatus === 'loading' ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : priceFetchStatus === 'success' ? (
                    <Check className="w-3 h-3 mr-1 text-green-600" />
                  ) : priceFetchStatus === 'error' ? (
                    <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  {priceFetchStatus === 'loading' ? 'Cargando...' : 'Actualizar'}
                </Button>
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
                className={cn(
                  "bg-card pr-10",
                  priceFetchStatus === 'loading' && "opacity-50"
                )}
                disabled={priceFetchStatus === 'loading'}
              />
              {priceFetchStatus === 'loading' && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              {priceFetchStatus === 'error' 
                ? 'No se pudo obtener el precio. Ingresalo manualmente.'
                : 'Precio actual de la acción en el mercado de origen (se obtiene automaticamente)'}
            </p>
          </div>

          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="customRatio" className="text-sm">Ratio Personalizado</Label>
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {mode === 'create' ? 'Agregar Posición' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

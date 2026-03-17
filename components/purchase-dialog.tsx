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
import { Purchase } from '@/lib/types'
import { cn } from '@/lib/utils'

interface PurchaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticker: string
  ratio: number
  purchase?: Purchase | null
  onSave: (data: Omit<Purchase, 'id'>) => void
  mode: 'create' | 'edit'
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export function PurchaseDialog({ open, onOpenChange, ticker, ratio, purchase, onSave, mode }: PurchaseDialogProps) {
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(undefined)
  const [priceARS, setPriceARS] = useState('')
  const [cclAtPurchase, setCclAtPurchase] = useState('')
  const [quantity, setQuantity] = useState('')
  const [stockPriceUSD, setStockPriceUSD] = useState('')
  const [priceFetchStatus, setPriceFetchStatus] = useState<FetchStatus>('idle')

  const fetchStockPrice = useCallback(async () => {
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
  }, [ticker])

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && purchase) {
        setPurchaseDate(new Date(purchase.date))
        setPriceARS(purchase.priceARS.toString())
        setCclAtPurchase(purchase.cclAtPurchase.toString())
        setQuantity(purchase.quantity.toString())
        setStockPriceUSD(purchase.stockPriceUSD.toString())
        setPriceFetchStatus('idle')
      } else {
        setPurchaseDate(undefined)
        setPriceARS('')
        setCclAtPurchase('')
        setQuantity('')
        setStockPriceUSD('')
        setPriceFetchStatus('idle')
        // Fetch current price for new purchase
        fetchStockPrice()
      }
    }
  }, [open, mode, purchase, fetchStockPrice])

  const handleSave = () => {
    if (!purchaseDate || !priceARS || !cclAtPurchase || !quantity || !stockPriceUSD) {
      return
    }

    // Check if theoretical price differs from purchase price by more than 70%
    const theoreticalPrice = (parseFloat(stockPriceUSD) / ratio) * parseFloat(cclAtPurchase)
    const priceDifference = Math.abs((theoreticalPrice - parseFloat(priceARS)) / parseFloat(priceARS))

    if (priceDifference > 0.7) {
      const shouldContinue = window.confirm(
        'El precio teorico difiere mucho del precio de compra. Es posible que el ratio este incorrecto. Deseas continuar igual?'
      )
      if (!shouldContinue) {
        return
      }
    }

    onSave({
      date: purchaseDate.toISOString(),
      quantity: parseFloat(quantity),
      priceARS: parseFloat(priceARS),
      cclAtPurchase: parseFloat(cclAtPurchase),
      stockPriceUSD: parseFloat(stockPriceUSD),
    })
    onOpenChange(false)
  }

  const isValid = purchaseDate && priceARS && cclAtPurchase && quantity && stockPriceUSD

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Agregar Compra' : 'Editar Compra'} - {ticker}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Registra una nueva compra para esta posicion.' 
              : 'Modifica los datos de esta compra.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="stockPriceUSD">Precio Stock USD (al comprar)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchStockPrice}
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
                Actual
              </Button>
            </div>
            <Input
              id="stockPriceUSD"
              type="number"
              step="0.01"
              min="0"
              placeholder="ej: 175.50"
              value={stockPriceUSD}
              onChange={(e) => setStockPriceUSD(e.target.value)}
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Precio del activo en USD en el momento de la compra
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {mode === 'create' ? 'Agregar Compra' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

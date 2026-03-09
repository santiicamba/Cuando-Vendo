'use client'

import { useState } from 'react'
import { DollarSign, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatARS } from '@/lib/types'

interface MarketDataPanelProps {
  cclRate: number
  onCCLChange: (rate: number) => void
}

export function MarketDataPanel({ cclRate, onCCLChange }: MarketDataPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempRate, setTempRate] = useState(cclRate.toString())

  const handleSave = () => {
    const rate = parseFloat(tempRate)
    if (!isNaN(rate) && rate > 0) {
      onCCLChange(rate)
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setTempRate(cclRate.toString())
    setIsEditing(false)
  }

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="py-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Dólar CCL
              </p>
              {isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    value={tempRate}
                    onChange={(e) => setTempRate(e.target.value)}
                    className="w-32 h-8 text-sm bg-card"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') handleCancel()
                    }}
                  />
                  <Button size="sm" onClick={handleSave} className="h-8">
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <p className="text-lg font-bold text-foreground">
                  {formatARS(cclRate)}
                </p>
              )}
            </div>
          </div>
          
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempRate(cclRate.toString())
                setIsEditing(true)
              }}
              className="border-primary/30 hover:bg-primary/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar CCL
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

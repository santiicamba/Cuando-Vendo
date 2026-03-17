'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RatioCorrectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRatio: number
  onSave: (newRatio: number) => void
}

export function RatioCorrectionModal({
  open,
  onOpenChange,
  currentRatio,
  onSave,
}: RatioCorrectionModalProps) {
  const [ratio, setRatio] = useState(currentRatio.toString())

  const handleSave = () => {
    const newRatio = parseFloat(ratio)
    if (!isNaN(newRatio) && newRatio > 0) {
      onSave(newRatio)
      onOpenChange(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setRatio(currentRatio.toString())
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Corregir Ratio</DialogTitle>
          <DialogDescription>
            Modificá el ratio de conversion del CEDEAR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ratio">Ratio</Label>
            <Input
              id="ratio"
              type="number"
              step="0.01"
              min="0.01"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="bg-card"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Consultá el ratio oficial actualizado en:</p>
            <div className="flex gap-2">
              <a
                href="https://www.byma.com.ar/cedears"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 text-sm font-medium text-center text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                BYMA
              </a>
              <a
                href="https://www.invertironline.com/cedears"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-3 py-2 text-sm font-medium text-center text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              >
                Invertir Online
              </a>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

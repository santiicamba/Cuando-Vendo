'use client'

import { Briefcase, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddPosition: () => void
}

export function EmptyState({ onAddPosition }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
        <Briefcase className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {'Todavía no cargaste ninguna posición'}
      </h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        {'¡Empezá agregando tu primer CEDEAR! Vas a poder seguir el rendimiento real de tus inversiones en tiempo real.'}
      </p>
      <Button onClick={onAddPosition} size="lg" className="gap-2">
        <Plus className="w-5 h-5" />
        Agregar mi primer CEDEAR
      </Button>
    </div>
  )
}

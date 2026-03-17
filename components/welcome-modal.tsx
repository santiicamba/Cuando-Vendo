'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function WelcomeModal() {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const shown = localStorage.getItem('welcomeShown')
    if (!shown) {
      setOpen(true)
      // tiny delay so the animation plays from invisible → visible
      requestAnimationFrame(() => setVisible(true))
    }
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    localStorage.setItem('welcomeShown', '1')
    setTimeout(() => setOpen(false), 300)
  }

  if (!open) return null

  return (
    /* Overlay */
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 px-4',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={handleDismiss}
    >
      {/* Card — stop propagation so clicking inside doesn't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full bg-card rounded-2xl shadow-2xl p-6 space-y-5 transition-all duration-300',
          'max-w-[340px]',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        )}
      >
        {/* Header accent bar */}
        <div className="h-1 rounded-full bg-gradient-to-r from-primary to-accent -mx-6 -mt-6 rounded-t-2xl" />

        <div className="pt-1 space-y-3">
          <h2 className="text-xl font-bold text-foreground text-balance">
            Bienvenido a Cuando Vendo!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Para sacarle el maximo provecho a la app, te recomendamos agregarla a la pantalla de inicio de tu celular. Asi vas a poder acceder mas rapido y recibir alertas cuando tus inversiones lleguen a tu objetivo.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={handleDismiss}
          >
            Entendido!
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            No volver a mostrar este mensaje
          </p>
        </div>
      </div>
    </div>
  )
}

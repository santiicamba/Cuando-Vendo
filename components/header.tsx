'use client'

import { TrendingUp } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary shadow-lg">
            <TrendingUp className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {'¿Cuándo Vendo?'}
            </h1>
            <p className="text-xs text-muted-foreground">
              CEDEAR Investment Tracker
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

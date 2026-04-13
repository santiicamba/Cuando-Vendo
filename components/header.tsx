'use client'

import Image from 'next/image'

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-lg overflow-hidden flex-shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Cuando Vendo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {'¿Cuándo Vendo?'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Investment Tracker
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

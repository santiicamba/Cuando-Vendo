'use client'

import { useState } from 'react'
import { Home, BarChart3, SlidersHorizontal } from 'lucide-react'
import { Dashboard } from '@/components/dashboard'
import { BenchmarkTab } from '@/components/benchmark-tab'
import { SimulatorTab } from '@/components/simulator-tab'
import { cn } from '@/lib/utils'

type TabId = 'home' | 'benchmark' | 'simulator'

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'benchmark', label: 'Como me esta yendo?', icon: BarChart3 },
  { id: 'simulator', label: 'Que pasaria si?', icon: SlidersHorizontal },
]

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('home')

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Tab content */}
      <div className={cn(activeTab === 'home' ? 'block' : 'hidden')}>
        <Dashboard />
      </div>

      {activeTab === 'benchmark' && (
        <div className="container mx-auto px-4 py-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <BenchmarkTab onSwitchToHome={() => setActiveTab('home')} />
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="container mx-auto px-4 py-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <SimulatorTab onSwitchToHome={() => setActiveTab('home')} />
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                  isActive ? "text-[#059669]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className={cn(
                  "text-[10px] leading-tight text-center px-1 line-clamp-1",
                  isActive && "font-medium"
                )}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CEDEARS, type CEDEAR } from '@/lib/cedears'

interface CEDEARComboboxProps {
  value: string
  onSelect: (cedear: CEDEAR | null) => void
  disabled?: boolean
}

export function CEDEARCombobox({ value, onSelect, disabled }: CEDEARComboboxProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedCedear = CEDEARS.find((c) => c.ticker === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-card border-border hover:bg-secondary/50"
        >
          {selectedCedear ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-semibold">{selectedCedear.ticker}</span>
              <span className="text-muted-foreground truncate">{selectedCedear.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Search className="w-4 h-4" />
              Buscar CEDEAR...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar por ticker o nombre..." />
          <CommandList>
            <CommandEmpty>No se encontró ningún CEDEAR.</CommandEmpty>
            <CommandGroup>
              {CEDEARS.map((cedear) => (
                <CommandItem
                  key={cedear.ticker}
                  value={`${cedear.ticker} ${cedear.name}`}
                  onSelect={() => {
                    onSelect(cedear.ticker === value ? null : cedear)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === cedear.ticker ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-semibold text-foreground w-14">{cedear.ticker}</span>
                    <span className="text-muted-foreground truncate flex-1">{cedear.name}</span>
                    <span className="text-xs text-muted-foreground">{cedear.market}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

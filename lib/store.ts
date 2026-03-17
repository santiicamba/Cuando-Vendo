import { Position, MarketData } from './types'

const POSITIONS_KEY = 'cedear-positions'
const MARKET_DATA_KEY = 'cedear-market-data'

export function getPositions(): Position[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(POSITIONS_KEY)
  if (!stored) return []
  const parsed: Position[] = JSON.parse(stored)
  // Backwards compat: fill in fields added after initial release
  return parsed.map(p => ({
    previousCloseUSD: null,
    priceFetchError: false,
    ...p,
  }))
}

export function savePositions(positions: Position[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
}

export function addPosition(position: Omit<Position, 'id' | 'createdAt' | 'updatedAt'>): Position {
  const positions = getPositions()
  const newPosition: Position = {
    ...position,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  positions.push(newPosition)
  savePositions(positions)
  return newPosition
}

export function updatePosition(id: string, updates: Partial<Omit<Position, 'id' | 'createdAt'>>): Position | null {
  const positions = getPositions()
  const index = positions.findIndex(p => p.id === id)
  if (index === -1) return null
  
  positions[index] = {
    ...positions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  savePositions(positions)
  return positions[index]
}

export function deletePosition(id: string): boolean {
  const positions = getPositions()
  const filtered = positions.filter(p => p.id !== id)
  if (filtered.length === positions.length) return false
  savePositions(filtered)
  return true
}

export function getMarketData(): MarketData {
  if (typeof window === 'undefined') {
    return { cclRate: 1200, lastUpdated: new Date().toISOString(), lastPricesUpdated: null }
  }
  const stored = localStorage.getItem(MARKET_DATA_KEY)
  if (!stored) return { cclRate: 1200, lastUpdated: new Date().toISOString(), lastPricesUpdated: null }
  const parsed = JSON.parse(stored)
  // Backwards compat: add missing field
  if (!('lastPricesUpdated' in parsed)) parsed.lastPricesUpdated = null
  return parsed
}

export function saveMarketData(data: MarketData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(MARKET_DATA_KEY, JSON.stringify(data))
}

export function updateCCLRate(rate: number): MarketData {
  const existing = getMarketData()
  const data: MarketData = {
    ...existing,
    cclRate: rate,
    lastUpdated: new Date().toISOString(),
  }
  saveMarketData(data)
  return data
}

export function updateLastPricesTimestamp(): MarketData {
  const existing = getMarketData()
  const data: MarketData = {
    ...existing,
    lastPricesUpdated: new Date().toISOString(),
  }
  saveMarketData(data)
  return data
}

import { Position, Purchase, MarketData } from './types'

const POSITIONS_KEY = 'cedear-positions'
const MARKET_DATA_KEY = 'cedear-market-data'

// Old position format for migration
interface LegacyPosition {
  id: string
  ticker: string
  name: string
  ratio: number
  ratioOverridden: boolean
  market: string
  purchaseDate: string
  purchasePrice: number
  cclAtPurchase: number
  quantity: number
  stockPriceUSD: number
  previousCloseUSD?: number | null
  priceFetchError?: boolean
  createdAt: string
  updatedAt: string
}

function isLegacyPosition(p: unknown): p is LegacyPosition {
  return (
    typeof p === 'object' &&
    p !== null &&
    'purchaseDate' in p &&
    'purchasePrice' in p &&
    !('purchases' in p)
  )
}

function migratePosition(legacy: LegacyPosition): Position {
  const purchase: Purchase = {
    id: crypto.randomUUID(),
    date: legacy.purchaseDate,
    quantity: legacy.quantity,
    priceARS: legacy.purchasePrice,
    cclAtPurchase: legacy.cclAtPurchase,
    stockPriceUSD: legacy.stockPriceUSD,
  }

  return {
    id: legacy.id,
    ticker: legacy.ticker,
    name: legacy.name,
    ratio: legacy.ratio,
    ratioOverridden: legacy.ratioOverridden,
    market: legacy.market,
    purchases: [purchase],
    currentStockPriceUSD: legacy.stockPriceUSD,
    previousCloseUSD: legacy.previousCloseUSD ?? null,
    priceFetchError: legacy.priceFetchError ?? false,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  }
}

export function getPositions(): Position[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(POSITIONS_KEY)
  if (!stored) return []

  const parsed: unknown[] = JSON.parse(stored)
  let needsSave = false

  const positions: Position[] = parsed.map((p) => {
    if (isLegacyPosition(p)) {
      needsSave = true
      return migratePosition(p)
    }
    // Ensure new fields exist (including optional target fields)
    const pos = p as Position
    return {
      targetGainUSD: null,
      stopLossUSD: null,
      ...pos,
      currentStockPriceUSD: pos.currentStockPriceUSD ?? 0,
      previousCloseUSD: pos.previousCloseUSD ?? null,
      priceFetchError: pos.priceFetchError ?? false,
      purchases: pos.purchases ?? [],
    }
  })

  // Auto-save migrated data
  if (needsSave) {
    savePositions(positions)
  }

  return positions
}

export function savePositions(positions: Position[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions))
}

export function addPosition(data: {
  ticker: string
  name: string
  ratio: number
  ratioOverridden: boolean
  market: string
  purchase: Omit<Purchase, 'id'>
}): Position {
  const positions = getPositions()
  
  // Check if position for this ticker already exists
  const existing = positions.find(p => p.ticker === data.ticker)
  if (existing) {
    // Add purchase to existing position
    const newPurchase: Purchase = {
      ...data.purchase,
      id: crypto.randomUUID(),
    }
    existing.purchases.push(newPurchase)
    existing.updatedAt = new Date().toISOString()
    // Update ratio if changed
    if (data.ratioOverridden) {
      existing.ratio = data.ratio
      existing.ratioOverridden = true
    }
    savePositions(positions)
    return existing
  }

  // Create new position
  const newPosition: Position = {
    id: crypto.randomUUID(),
    ticker: data.ticker,
    name: data.name,
    ratio: data.ratio,
    ratioOverridden: data.ratioOverridden,
    market: data.market,
    purchases: [{
      ...data.purchase,
      id: crypto.randomUUID(),
    }],
    currentStockPriceUSD: data.purchase.stockPriceUSD,
    previousCloseUSD: null,
    priceFetchError: false,
    targetGainUSD: null,
    stopLossUSD: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  positions.push(newPosition)
  savePositions(positions)
  return newPosition
}

export function addPurchaseToPosition(positionId: string, purchase: Omit<Purchase, 'id'>): Position | null {
  const positions = getPositions()
  const index = positions.findIndex(p => p.id === positionId)
  if (index === -1) return null

  const newPurchase: Purchase = {
    ...purchase,
    id: crypto.randomUUID(),
  }
  positions[index].purchases.push(newPurchase)
  positions[index].updatedAt = new Date().toISOString()
  savePositions(positions)
  return positions[index]
}

export function updatePurchase(positionId: string, purchaseId: string, updates: Partial<Omit<Purchase, 'id'>>): Position | null {
  const positions = getPositions()
  const posIndex = positions.findIndex(p => p.id === positionId)
  if (posIndex === -1) return null

  const purchaseIndex = positions[posIndex].purchases.findIndex(pu => pu.id === purchaseId)
  if (purchaseIndex === -1) return null

  positions[posIndex].purchases[purchaseIndex] = {
    ...positions[posIndex].purchases[purchaseIndex],
    ...updates,
  }
  positions[posIndex].updatedAt = new Date().toISOString()
  savePositions(positions)
  return positions[posIndex]
}

export function deletePurchase(positionId: string, purchaseId: string): { position: Position | null; positionDeleted: boolean } {
  const positions = getPositions()
  const posIndex = positions.findIndex(p => p.id === positionId)
  if (posIndex === -1) return { position: null, positionDeleted: false }

  const position = positions[posIndex]
  position.purchases = position.purchases.filter(pu => pu.id !== purchaseId)
  position.updatedAt = new Date().toISOString()

  // If no purchases left, delete the entire position
  if (position.purchases.length === 0) {
    positions.splice(posIndex, 1)
    savePositions(positions)
    return { position: null, positionDeleted: true }
  }

  savePositions(positions)
  return { position, positionDeleted: false }
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

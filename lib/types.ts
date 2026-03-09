export interface Position {
  id: string
  ticker: string
  name: string
  ratio: number
  ratioOverridden: boolean
  market: string
  purchaseDate: string
  purchasePrice: number
  quantity: number
  stockPriceUSD: number
  createdAt: string
  updatedAt: string
}

export interface MarketData {
  cclRate: number
  lastUpdated: string
}

export interface CalculatedPosition extends Position {
  theoreticalPrice: number
  realReturn: number
  totalInvested: number
  currentValue: number
  profitLoss: number
  daysHeld: number
  priceDifference: number
}

export function calculatePosition(position: Position, cclRate: number): CalculatedPosition {
  // Theoretical Price (ARS) = (Stock price in USD / Ratio) × CCL rate
  const theoreticalPrice = (position.stockPriceUSD / position.ratio) * cclRate
  
  // Real Return % = (Theoretical Price / Purchase Price in ARS − 1) × 100
  const realReturn = ((theoreticalPrice / position.purchasePrice) - 1) * 100
  
  // Total invested ARS
  const totalInvested = position.purchasePrice * position.quantity
  
  // Current value ARS
  const currentValue = theoreticalPrice * position.quantity
  
  // P&L in ARS
  const profitLoss = currentValue - totalInvested
  
  // Days held
  const purchaseDate = new Date(position.purchaseDate)
  const today = new Date()
  const daysHeld = Math.floor((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Price difference
  const priceDifference = theoreticalPrice - position.purchasePrice
  
  return {
    ...position,
    theoreticalPrice,
    realReturn,
    totalInvested,
    currentValue,
    profitLoss,
    daysHeld,
    priceDifference,
  }
}

export interface PortfolioSummary {
  totalInvested: number
  totalCurrentValue: number
  overallReturn: number
  bestPerformer: CalculatedPosition | null
  worstPerformer: CalculatedPosition | null
}

export function calculatePortfolioSummary(positions: CalculatedPosition[]): PortfolioSummary {
  if (positions.length === 0) {
    return {
      totalInvested: 0,
      totalCurrentValue: 0,
      overallReturn: 0,
      bestPerformer: null,
      worstPerformer: null,
    }
  }
  
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)
  const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0)
  const overallReturn = totalInvested > 0 ? ((totalCurrentValue / totalInvested) - 1) * 100 : 0
  
  const sorted = [...positions].sort((a, b) => b.realReturn - a.realReturn)
  const bestPerformer = sorted[0] || null
  const worstPerformer = sorted[sorted.length - 1] || null
  
  return {
    totalInvested,
    totalCurrentValue,
    overallReturn,
    bestPerformer,
    worstPerformer,
  }
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

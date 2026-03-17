export interface Position {
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
  previousCloseUSD: number | null  // previous session close from Yahoo Finance
  priceFetchError: boolean          // true if last auto-fetch failed for this ticker
  createdAt: string
  updatedAt: string
}

export interface MarketData {
  cclRate: number
  lastUpdated: string
  lastPricesUpdated: string | null  // ISO timestamp of last successful bulk price refresh
}

export interface CalculatedPosition extends Position {
  theoreticalPrice: number
  returnARS: number
  returnUSD: number
  cclEffect: number
  totalInvested: number
  currentValue: number
  profitLoss: number
  daysHeld: number
  priceDifference: number
  purchasePriceUSD: number
  currentPriceUSD: number
  // Daily change fields
  dailyChangeUSD: number | null      // stock price delta in USD vs previous close
  dailyChangePercent: number | null  // % change vs previous close
  dailyChangeARS: number | null      // ARS impact on position value today
}

export function calculatePosition(position: Position, cclRate: number): CalculatedPosition {
  // Theoretical Price (ARS) = (Stock price in USD / Ratio) × CCL rate
  const theoreticalPrice = (position.stockPriceUSD / position.ratio) * cclRate
  
  // 1. Return in ARS (total return including stock + exchange rate movement)
  // Return ARS % = (Theoretical Price / Purchase Price in ARS − 1) × 100
  const returnARS = ((theoreticalPrice / position.purchasePrice) - 1) * 100
  
  // 2. Return in USD (pure stock performance, CCL-neutral)
  // Purchase price in USD = Purchase price in ARS / CCL at purchase
  const purchasePriceUSD = position.purchasePrice / position.cclAtPurchase
  // Current price in USD = Stock price in USD / Ratio
  const currentPriceUSD = position.stockPriceUSD / position.ratio
  // Return USD % = (Current price in USD / Purchase price in USD − 1) × 100
  const returnUSD = ((currentPriceUSD / purchasePriceUSD) - 1) * 100
  
  // 3. CCL Effect (how much of ARS return is from exchange rate movement)
  // CCL Effect % = (CCL today / CCL at purchase − 1) × 100
  const cclEffect = ((cclRate / position.cclAtPurchase) - 1) * 100
  
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

  // Daily change (requires previousClose)
  let dailyChangeUSD: number | null = null
  let dailyChangePercent: number | null = null
  let dailyChangeARS: number | null = null

  if (position.previousCloseUSD !== null && position.previousCloseUSD !== undefined) {
    dailyChangeUSD = position.stockPriceUSD - position.previousCloseUSD
    dailyChangePercent = (dailyChangeUSD / position.previousCloseUSD) * 100
    // ARS impact on full position: (currentStock - prevClose) / ratio * cclRate * quantity
    dailyChangeARS = (dailyChangeUSD / position.ratio) * cclRate * position.quantity
  }

  return {
    ...position,
    theoreticalPrice,
    returnARS,
    returnUSD,
    cclEffect,
    totalInvested,
    currentValue,
    profitLoss,
    daysHeld,
    priceDifference,
    purchasePriceUSD,
    currentPriceUSD,
    dailyChangeUSD,
    dailyChangePercent,
    dailyChangeARS,
  }
}

export interface PortfolioSummary {
  totalInvested: number
  totalCurrentValue: number
  overallReturnARS: number
  overallReturnUSD: number
  overallCclEffect: number
  bestPerformer: CalculatedPosition | null
  worstPerformer: CalculatedPosition | null
  dailyChangeARS: number | null         // combined ARS daily P&L across all positions
  dailyChangePercent: number | null     // weighted average daily % change
}

export function calculatePortfolioSummary(positions: CalculatedPosition[]): PortfolioSummary {
  if (positions.length === 0) {
    return {
      totalInvested: 0,
      totalCurrentValue: 0,
      overallReturnARS: 0,
      overallReturnUSD: 0,
      overallCclEffect: 0,
      bestPerformer: null,
      worstPerformer: null,
      dailyChangeARS: null,
      dailyChangePercent: null,
    }
  }
  
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)
  const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0)
  
  const overallReturnARS = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.returnARS * p.totalInvested, 0) / totalInvested 
    : 0
  const overallReturnUSD = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.returnUSD * p.totalInvested, 0) / totalInvested 
    : 0
  const overallCclEffect = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.cclEffect * p.totalInvested, 0) / totalInvested 
    : 0

  // Daily aggregates — only when at least one position has previousClose data
  const positionsWithDaily = positions.filter(p => p.dailyChangeARS !== null)
  const dailyChangeARS = positionsWithDaily.length > 0
    ? positionsWithDaily.reduce((sum, p) => sum + (p.dailyChangeARS ?? 0), 0)
    : null
  // Weighted average daily % by totalInvested for positions with data
  const dailyInvested = positionsWithDaily.reduce((sum, p) => sum + p.totalInvested, 0)
  const dailyChangePercent = positionsWithDaily.length > 0 && dailyInvested > 0
    ? positionsWithDaily.reduce((sum, p) => sum + (p.dailyChangePercent ?? 0) * p.totalInvested, 0) / dailyInvested
    : null

  const sorted = [...positions].sort((a, b) => b.returnARS - a.returnARS)
  const bestPerformer = sorted[0] || null
  const worstPerformer = sorted[sorted.length - 1] || null
  
  return {
    totalInvested,
    totalCurrentValue,
    overallReturnARS,
    overallReturnUSD,
    overallCclEffect,
    bestPerformer,
    worstPerformer,
    dailyChangeARS,
    dailyChangePercent,
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

/**
 * Returns true when NYSE is currently open.
 * NYSE hours: Mon–Fri 09:30–16:00 ET = 10:30–17:00 ART (UTC-3, no DST).
 * We approximate using UTC offset: ART = UTC-3, so NYSE open = 12:30–21:00 UTC.
 * Holidays are NOT checked — this is a best-effort indicator only.
 */
export function isNYSEOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false
  const hours = now.getUTCHours()
  const minutes = now.getUTCMinutes()
  const totalMinutes = hours * 60 + minutes
  // 12:30 UTC = 750 min, 21:00 UTC = 1260 min
  return totalMinutes >= 750 && totalMinutes < 1260
}

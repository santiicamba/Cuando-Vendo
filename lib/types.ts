// Individual purchase entry within a position
export interface Purchase {
  id: string
  date: string
  quantity: number
  priceARS: number
  cclAtPurchase: number
  stockPriceUSD: number
}

// Position with multiple purchases
export interface Position {
  id: string
  ticker: string
  name: string
  ratio: number
  ratioOverridden: boolean
  market: string
  purchases: Purchase[]
  // Live market data (updated by refresh)
  currentStockPriceUSD: number
  previousCloseUSD: number | null
  priceFetchError: boolean
  // Optional personal targets (USD return %)
  targetGainUSD: number | null   // e.g. 20 means +20%
  stopLossUSD: number | null     // e.g. -10 means -10%
  createdAt: string
  updatedAt: string
}

export interface MarketData {
  cclRate: number
  lastUpdated: string
  lastPricesUpdated: string | null
}

// Calculated values derived from purchases and current market data
export interface CalculatedPosition extends Position {
  // Weighted averages from purchases
  totalQuantity: number
  avgPurchasePriceARS: number
  avgCclAtPurchase: number
  avgStockPriceUSD: number
  totalInvested: number
  // Current values
  theoreticalPrice: number
  currentValue: number
  profitLoss: number
  priceDifference: number
  // Returns (using weighted averages as base)
  returnARS: number
  returnUSD: number
  cclEffect: number
  purchasePriceUSD: number
  currentPriceUSD: number
  // Daily change
  dailyChangeUSD: number | null
  dailyChangePercent: number | null
  dailyChangeARS: number | null
  // Duration
  firstPurchaseDate: string
  daysHeld: number
}

export function calculatePosition(position: Position, cclRate: number): CalculatedPosition {
  const purchases = position.purchases
  const isMerval = position.market === "MERVAL"
  
  // Calculate totals and weighted averages
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0)
  const totalInvested = purchases.reduce((sum, p) => sum + p.quantity * p.priceARS, 0)
  
  // Weighted averages
  const avgPurchasePriceARS = totalQuantity > 0 
    ? totalInvested / totalQuantity 
    : 0
  const avgCclAtPurchase = totalQuantity > 0 
    ? purchases.reduce((sum, p) => sum + p.quantity * p.cclAtPurchase, 0) / totalQuantity 
    : 0
  const avgStockPriceUSD = totalQuantity > 0 
    ? purchases.reduce((sum, p) => sum + p.quantity * p.stockPriceUSD, 0) / totalQuantity 
    : 0

  let theoreticalPrice: number
  let currentValue: number
  let profitLoss: number
  let priceDifference: number
  let returnARS: number
  let returnUSD: number
  let cclEffect: number
  let purchasePriceUSD: number
  let currentPriceUSD: number
  let dailyChangeUSD: number | null
  let dailyChangePercent: number | null
  let dailyChangeARS: number | null

  if (isMerval) {
    // For Merval: prices are in ARS, no USD conversion, no CCL, no ratio
    theoreticalPrice = position.currentStockPriceUSD  // price stored directly in ARS
    currentValue = theoreticalPrice * totalQuantity
    profitLoss = currentValue - totalInvested
    priceDifference = theoreticalPrice - avgPurchasePriceARS
    returnARS = avgPurchasePriceARS > 0 ? ((theoreticalPrice / avgPurchasePriceARS) - 1) * 100 : 0
    returnUSD = 0
    cclEffect = 0
    purchasePriceUSD = 0
    currentPriceUSD = 0
    dailyChangeUSD = null
    dailyChangePercent = null
    dailyChangeARS = null
  } else {
    // For non-Merval (CEDEARs): existing logic
    // Theoretical Price (ARS) = (Current stock price in USD / Ratio) × CCL rate
    theoreticalPrice = (position.currentStockPriceUSD / position.ratio) * cclRate
    
    // Current value ARS
    currentValue = theoreticalPrice * totalQuantity
    
    // P&L in ARS
    profitLoss = currentValue - totalInvested
    
    // Price difference per unit
    priceDifference = theoreticalPrice - avgPurchasePriceARS

    // 1. Return in ARS (total return including stock + exchange rate movement)
    returnARS = avgPurchasePriceARS > 0 
      ? ((theoreticalPrice / avgPurchasePriceARS) - 1) * 100 
      : 0
    
    // 2. Return in USD (pure stock performance, CCL-neutral)
    purchasePriceUSD = avgCclAtPurchase > 0 
      ? avgPurchasePriceARS / avgCclAtPurchase 
      : 0
    currentPriceUSD = position.currentStockPriceUSD / position.ratio
    returnUSD = purchasePriceUSD > 0 
      ? ((currentPriceUSD / purchasePriceUSD) - 1) * 100 
      : 0
    
    // 3. CCL Effect
    cclEffect = avgCclAtPurchase > 0 
      ? ((cclRate / avgCclAtPurchase) - 1) * 100 
      : 0

    // Daily change
    dailyChangeUSD = null
    dailyChangePercent = null
    dailyChangeARS = null

    if (position.previousCloseUSD !== null) {
      dailyChangeUSD = position.currentStockPriceUSD - position.previousCloseUSD
      dailyChangePercent = (dailyChangeUSD / position.previousCloseUSD) * 100
      dailyChangeARS = (dailyChangeUSD / position.ratio) * cclRate * totalQuantity
    }
  }

  // Days held (from first purchase)
  const sortedPurchases = [...purchases].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const firstPurchaseDate = sortedPurchases[0]?.date || position.createdAt
  const today = new Date()
  const daysHeld = Math.floor((today.getTime() - new Date(firstPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))

  return {
    ...position,
    totalQuantity,
    avgPurchasePriceARS,
    avgCclAtPurchase,
    avgStockPriceUSD,
    totalInvested,
    theoreticalPrice,
    currentValue,
    profitLoss,
    priceDifference,
    returnARS,
    returnUSD,
    cclEffect,
    purchasePriceUSD,
    currentPriceUSD,
    dailyChangeUSD,
    dailyChangePercent,
    dailyChangeARS,
    firstPurchaseDate,
    daysHeld,
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
  dailyChangeARS: number | null
  dailyChangePercent: number | null
  hasCedears: boolean
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
      hasCedears: false,
    }
  }
  
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)
  const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0)
  
  // Check if any position is a CEDEAR (not MERVAL)
  const hasCedears = positions.some(p => p.market !== "MERVAL")
  
  // Only consider non-Merval positions for USD return and CCL effect
  const cedearPositions = positions.filter(p => p.market !== "MERVAL")
  const cedearInvested = cedearPositions.reduce((sum, p) => sum + p.totalInvested, 0)
  
  const overallReturnARS = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.returnARS * p.totalInvested, 0) / totalInvested 
    : 0
  
  const overallReturnUSD = cedearInvested > 0
    ? cedearPositions.reduce((sum, p) => sum + p.returnUSD * p.totalInvested, 0) / cedearInvested
    : 0
  
  const overallCclEffect = cedearInvested > 0
    ? cedearPositions.reduce((sum, p) => sum + p.cclEffect * p.totalInvested, 0) / cedearInvested
    : 0

  const positionsWithDaily = positions.filter(p => p.dailyChangeARS !== null)
  const dailyChangeARS = positionsWithDaily.length > 0
    ? positionsWithDaily.reduce((sum, p) => sum + (p.dailyChangeARS ?? 0), 0)
    : null
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
    hasCedears,
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

export function isNYSEOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false
  const hours = now.getUTCHours()
  const minutes = now.getUTCMinutes()
  const totalMinutes = hours * 60 + minutes
  return totalMinutes >= 750 && totalMinutes < 1260
}

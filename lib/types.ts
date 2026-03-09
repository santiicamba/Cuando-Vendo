export interface Position {
  id: string
  ticker: string
  name: string
  ratio: number
  ratioOverridden: boolean
  market: string
  purchaseDate: string
  purchasePrice: number
  cclAtPurchase: number // CCL rate at purchase date (ARS/USD)
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
  returnARS: number // Total return in ARS (includes stock + CCL movement)
  returnUSD: number // Pure stock performance (CCL-neutral)
  cclEffect: number // How much of ARS return is from exchange rate movement
  totalInvested: number
  currentValue: number
  profitLoss: number
  daysHeld: number
  priceDifference: number
  purchasePriceUSD: number // Purchase price converted to USD
  currentPriceUSD: number // Current price in USD
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
  }
}

export interface PortfolioSummary {
  totalInvested: number
  totalCurrentValue: number
  overallReturnARS: number // Weighted average return in ARS
  overallReturnUSD: number // Weighted average return in USD
  overallCclEffect: number // Weighted average CCL effect
  bestPerformer: CalculatedPosition | null
  worstPerformer: CalculatedPosition | null
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
    }
  }
  
  const totalInvested = positions.reduce((sum, p) => sum + p.totalInvested, 0)
  const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0)
  
  // Weighted averages by position size (totalInvested)
  const overallReturnARS = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.returnARS * p.totalInvested, 0) / totalInvested 
    : 0
  const overallReturnUSD = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.returnUSD * p.totalInvested, 0) / totalInvested 
    : 0
  const overallCclEffect = totalInvested > 0 
    ? positions.reduce((sum, p) => sum + p.cclEffect * p.totalInvested, 0) / totalInvested 
    : 0
  
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

import { NextResponse } from 'next/server'

// Known MERVAL tickers that require .BA suffix for Yahoo Finance
const MERVAL_TICKERS = new Set([
  'GGAL', 'YPFD', 'BMA', 'BBAR', 'SUPV', 'CRES', 'ALUA', 'TXAR', 'PAMP',
  'TGSU2', 'TGNO4', 'CGPA2', 'COME', 'MIRG', 'MOLI', 'LOMA', 'HARG', 'BYMA',
  'CEPU', 'EDN', 'TECO2', 'VALO'
])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const { searchParams } = new URL(request.url)
  const period1 = searchParams.get('period1')
  const period2 = searchParams.get('period2')
  
  try {
    // Build Yahoo Finance ticker: append .BA for MERVAL stocks
    const yahooTicker = MERVAL_TICKERS.has(ticker.toUpperCase())
      ? `${ticker}.BA`
      : ticker

    // Build URL with optional historical range
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}`
    if (period1 && period2) {
      url += `?period1=${period1}&period2=${period2}&interval=1d`
    }
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Yahoo Finance API responded with status ${response.status}`)
    }

    const data = await response.json()
    
    // Yahoo Finance chart API returns:
    // data.chart.result[0].meta.regularMarketPrice
    // or data.chart.result[0].indicators.quote[0].close[-1] for the latest close
    const result = data?.chart?.result?.[0]
    
    if (!result) {
      throw new Error('No data found for ticker')
    }

    const price = result.meta?.regularMarketPrice
    const currency = result.meta?.currency || 'USD'
    const name = result.meta?.shortName || result.meta?.longName || ticker
    const previousClose = result.meta?.previousClose
    const marketState = result.meta?.marketState

    if (price === undefined || price === null) {
      throw new Error('Price not available')
    }

    // If historical range requested, get the first available close price
    let historicalStart: number | undefined
    if (period1 && period2) {
      const closes = result.indicators?.quote?.[0]?.close as number[] | undefined
      if (closes && closes.length > 0) {
        // Find first non-null close
        historicalStart = closes.find((c: number | null) => c !== null && c !== undefined)
      }
    }

    // Always return the clean ticker (without .BA) to the client
    return NextResponse.json({
      success: true,
      ticker,
      price,
      currency,
      name,
      previousClose,
      marketState,
      change: previousClose ? price - previousClose : null,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : null,
      historicalStart,
    })
  } catch (error) {
    console.error(`Error fetching stock price for ${ticker}:`, error)
    return NextResponse.json(
      { success: false, error: `Failed to fetch price for ${ticker}` },
      { status: 500 }
    )
  }
}

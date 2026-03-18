import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params
  const { searchParams } = new URL(request.url)
  const period1 = searchParams.get('period1')
  const period2 = searchParams.get('period2')
  
  try {
    // Build URL with optional historical range
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`
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

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares/contadoconliqui', {
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`)
    }

    const data = await response.json()
    
    // dolarapi.com returns: { moneda, casa, nombre, compra, venta, fechaActualizacion }
    return NextResponse.json({
      success: true,
      rate: data.venta || data.compra,
      buy: data.compra,
      sell: data.venta,
      lastUpdated: data.fechaActualizacion,
    })
  } catch (error) {
    console.error('Error fetching CCL rate:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch CCL rate' },
      { status: 500 }
    )
  }
}

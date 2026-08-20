import { NextResponse } from 'next/server'
import { KiteClient, getFullMCXInstrumentsCached, type KiteBasketOrder } from '@/lib/kite'
import { MCX_INSTRUMENTS } from '@/lib/options'

export const runtime  = 'nodejs'
export const dynamic  = 'force-dynamic'

interface LegInput {
  strike: number
  type:   'CE' | 'PE' | 'FUT'
  action: 'BUY' | 'SELL'
  qty:    number
}

function isLegInput(v: unknown): v is LegInput {
  if (!v || typeof v !== 'object') return false
  const l = v as Record<string, unknown>
  return typeof l.strike === 'number' && Number.isFinite(l.strike)
    && (l.type === 'CE' || l.type === 'PE' || l.type === 'FUT')
    && (l.action === 'BUY' || l.action === 'SELL')
    && typeof l.qty === 'number' && Number.isInteger(l.qty) && l.qty > 0
}

export async function POST(request: Request) {
  let body: { instrument?: string; expiry?: string; legs?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const instrument = body.instrument?.toUpperCase()
  const expiry      = body.expiry
  const legs         = body.legs

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }
  if (!expiry || typeof expiry !== 'string') {
    return NextResponse.json({ error: 'Missing expiry' }, { status: 400 })
  }
  if (!Array.isArray(legs) || legs.length === 0 || !legs.every(isLegInput)) {
    return NextResponse.json({ error: 'Invalid legs' }, { status: 400 })
  }

  try {
    if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
      throw new Error('Kite credentials not configured')
    }

    // Resolve every leg against the real, currently-listed instrument set —
    // never trust a client-submitted tradingsymbol for an authenticated
    // external API call. Same source getOptionsChain() already uses.
    const allInstruments = await getFullMCXInstrumentsCached()

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const nearFut = allInstruments
      .filter(i => i.name.toUpperCase() === instrument && i.instrument_type === 'FUT' && new Date(i.expiry) >= today)
      .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())[0]

    const lotSize = MCX_INSTRUMENTS[instrument].lotSize
    const orders: KiteBasketOrder[] = []

    for (const leg of legs as LegInput[]) {
      const resolved = leg.type === 'FUT'
        ? nearFut
        : allInstruments.find(i =>
            i.name.toUpperCase() === instrument &&
            i.instrument_type === leg.type &&
            i.expiry === expiry &&
            i.strike === leg.strike,
          )

      if (!resolved) {
        return NextResponse.json({ error: `No live contract found for one of the legs` }, { status: 400 })
      }

      orders.push({
        exchange:         'MCX',
        tradingsymbol:    resolved.tradingsymbol,
        transaction_type: leg.action,
        variety:           'regular',
        product:            'NRML',
        order_type:         'MARKET',
        quantity:           leg.qty * lotSize,
        price:              0,
        trigger_price:      0,
      })
    }

    const kc     = new KiteClient(process.env.KITE_API_KEY, process.env.KITE_ACCESS_TOKEN)
    const margin = await kc.basketMargin(orders)

    return NextResponse.json(margin, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Strategy Margin API]', msg)
    const status = msg === 'Kite credentials not configured' ? 503 : 500
    return NextResponse.json(
      { error: 'Margin data is temporarily unavailable.' },
      { status },
    )
  }
}

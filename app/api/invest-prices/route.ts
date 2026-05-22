import { NextResponse } from 'next/server'

// Cache route for 60s — removes force-dynamic so individual fetch caches work,
// and avoids firing 29 Stooq requests on every single page load.
export const revalidate = 60

// ── NSE symbols for Kite ──────────────────────────────────────────────────────
const NSE_SYMBOLS = [
  'GOLDBEES', 'SBIGETS', 'HDFCMFGETF', 'AXISGOLD',
  'SILVERBEES', 'ICICISILVER',
  'HINDALCO', 'VEDL', 'HINDCOPPER', 'HINDZINC',
  'NMDC', 'COALINDIA', 'SAIL', 'JSWSTEEL', 'MOIL',
  'ONGC', 'GAIL',
]

// ── Stooq symbols for global ETFs/stocks ─────────────────────────────────────
const GLOBAL_SYMBOLS: Record<string, string> = {
  'GLD':   'gld.us',
  'IAU':   'iau.us',
  'IAUM':  'iaum.us',
  'SLV':   'slv.us',
  'SIVR':  'sivr.us',
  'GDX':   'gdx.us',
  'GDXJ':  'gdxj.us',
  'COPX':  'copx.us',
  'USO':   'uso.us',
  'BNO':   'bno.us',
  'XME':   'xme.us',
  'PICK':  'pick.us',
  'LIT':   'lit.us',
  'REMX':  'remx.us',
  'GOLD':  'gold.us',
  'NEM':   'nem.us',
  'WPM':   'wpm.us',
  'FCX':   'fcx.us',
  'BHP':   'bhp.us',
  'RIO':   'rio.us',
  'VALE':  'vale.us',
  'GLNCY': 'glncy.us',
  'ALB':   'alb.us',
  'AA':    'aa.us',
  'TECK':  'teck.us',
  'AEM':   'aem.us',
}

interface KiteQuoteRaw {
  last_price: number
  net_change:  number
  change:      number
  ohlc: { open: number; high: number; low: number; close: number }
}

async function fetchKiteNSE(): Promise<Record<string, { price: number; open: number; change: number; changePct: number }>> {
  const API_KEY      = process.env.KITE_API_KEY
  const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  if (!API_KEY || !ACCESS_TOKEN) return {}

  try {
    const qs  = NSE_SYMBOLS.map(s => `i=NSE:${s}`).join('&')
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
      // No next.revalidate — revalidate is controlled at route level
    })
    if (!res.ok) {
      console.warn('[invest-prices] Kite NSE fetch failed:', res.status)
      return {}
    }
    const { data } = await res.json() as { data: Record<string, KiteQuoteRaw> }
    const out: Record<string, { price: number; open: number; change: number; changePct: number }> = {}
    for (const [key, val] of Object.entries(data ?? {})) {
      const sym      = key.replace('NSE:', '')
      const prevClose = val.ohlc?.close ?? 0
      const changePct = prevClose > 0 ? ((val.last_price - prevClose) / prevClose) * 100 : 0
      out[sym] = {
        price:     val.last_price,
        open:      val.ohlc?.open ?? val.last_price,
        change:    val.last_price - prevClose,
        changePct,
      }
    }
    return out
  } catch (e) {
    console.warn('[invest-prices] Kite NSE error:', (e as Error).message)
    return {}
  }
}

async function fetchStooqOne(sym: string): Promise<{ price: number; open: number; changePct: number } | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 300 },  // Cache individual Stooq responses for 5 min
    })
    if (!res.ok) return null
    const lines = (await res.text()).trim().split('\n')
    if (lines.length < 2) return null
    const cols  = lines[1].split(',')
    const open  = parseFloat(cols[3])
    const close = parseFloat(cols[6])
    if (isNaN(close) || close <= 0) return null
    const changePct = open > 0 ? ((close - open) / open) * 100 : 0
    return { price: close, open, changePct }
  } catch { return null }
}

export async function GET() {
  const [nse, ...globalResults] = await Promise.all([
    fetchKiteNSE(),
    ...Object.entries(GLOBAL_SYMBOLS).map(async ([ticker, sym]) => ({
      ticker,
      data: await fetchStooqOne(sym),
    })),
  ])

  const global: Record<string, { price: number; open: number; changePct: number }> = {}
  for (const r of globalResults as { ticker: string; data: { price: number; open: number; changePct: number } | null }[]) {
    if (r.data) global[r.ticker] = r.data
  }

  console.log(`[invest-prices] NSE: ${Object.keys(nse).length}, Global: ${Object.keys(global).length}`)

  return NextResponse.json(
    { nse, global, fetchedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
  )
}

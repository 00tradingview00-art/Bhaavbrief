import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
  // iShares / SPDR / VanEck ETFs
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
  // Global stocks
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
  'TECK':  'teck.b.us',
  'AEM':   'aem.us',
}

async function fetchKiteNSE(): Promise<Record<string, { price: number; open: number }>> {
  const API_KEY    = process.env.KITE_API_KEY
  const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  if (!API_KEY || !ACCESS_TOKEN) return {}

  try {
    const qs  = NSE_SYMBOLS.map(s => `i=NSE:${s}`).join('&')
    const res = await fetch(`https://api.kite.trade/quote?${qs}`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const { data } = await res.json() as { data: Record<string, { last_price: number; ohlc: { open: number }; net_change: number; change: number }> }
    const out: Record<string, { price: number; open: number; change: number; changePct: number }> = {}
    for (const [key, val] of Object.entries(data ?? {})) {
      const sym = key.replace('NSE:', '')
      out[sym] = {
        price:     val.last_price,
        open:      val.ohlc?.open ?? val.last_price,
        change:    val.net_change ?? 0,
        changePct: val.change ?? 0,
      }
    }
    return out
  } catch { return {} }
}

async function fetchStooqOne(sym: string, ticker: string): Promise<{ price: number; open: number; changePct: number } | null> {
  try {
    const res = await fetch(`https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`, {
      signal: AbortSignal.timeout(6000),
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
    ...Object.entries(GLOBAL_SYMBOLS).map(async ([ticker, sym]) => {
      const data = await fetchStooqOne(sym, ticker)
      return { ticker, data }
    }),
  ])

  const global: Record<string, { price: number; open: number; changePct: number }> = {}
  for (const r of globalResults as { ticker: string; data: { price: number; open: number; changePct: number } | null }[]) {
    if (r.data) global[r.ticker] = r.data
  }

  return NextResponse.json(
    { nse, global, fetchedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}

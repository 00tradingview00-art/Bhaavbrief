/**
 * lib/prices.ts
 * Server-side price fetcher used by API routes and server components.
 *
 * Priority for COMEX reference prices:
 *   1. Twelve Data (TWELVE_DATA_API_KEY set) — free tier, works from Vercel IPs
 *   2. Yahoo Finance chart API               — fallback, blocked on Vercel shared IPs
 *   3. Frankfurter ECB API                   — USD/INR only, always works
 *
 * Priority for MCX prices:
 *   1. Kite Connect (KITE_ACCESS_TOKEN set)  — live MCX quotes
 *   2. Derived from COMEX prices via formula — fallback
 */

import { KiteClient, type KiteQuote } from './kite'

const FALLBACK_TOKENS = { gold: 57359623, silver: 58368263, crude: 59513095, copper: 52728327, natgas: 57960199 }

// ── Twelve Data ───────────────────────────────────────────────────────────────
// Free tier: 800 credits/day, 8/min. Each symbol in a batch = 1 credit.
// With 7 symbols and 15-min cache: 4 calls/hr × 7 = 28 credits/hr = 672/day — under limit.

const TD_SYMBOL_MAP: Record<string, string> = {
  'GC=F':     'XAU/USD',    // COMEX Gold
  'SI=F':     'XAG/USD',    // COMEX Silver
  'CL=F':     'WTI/USD',    // WTI Crude
  'BZ=F':     'BRENT/USD',  // Brent Crude
  'HG=F':     'COPPER/USD', // COMEX Copper
  'NG=F':     'NG/USD',     // Henry Hub Natural Gas
  'USDINR=X': 'USD/INR',    // USD/INR spot
}

async function fetchTwelveData(): Promise<Record<string, any> | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return null

  const tdSymbols = Object.values(TD_SYMBOL_MAP).join(',')
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${apiKey}`

  const res = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 900 }, // 15-min cache to stay within 800 credits/day free tier
  })
  if (!res.ok) throw new Error(`Twelve Data: ${res.status}`)

  const data = await res.json()

  // When multiple symbols are requested the response is keyed by TD symbol.
  // Map back to Yahoo-style keys so deriveFromYahoo works unchanged.
  const map: Record<string, any> = {}
  for (const [yahooSym, tdSym] of Object.entries(TD_SYMBOL_MAP)) {
    const q = data[tdSym]
    if (!q || q.status === 'error') continue
    map[yahooSym] = {
      regularMarketPrice:         parseFloat(q.close ?? q.price ?? '0'),
      regularMarketChangePercent: parseFloat(q.percent_change ?? '0'),
    }
  }
  return Object.keys(map).length > 0 ? map : null
}

// ── Yahoo Finance ─────────────────────────────────────────────────────────────

async function fetchYahoo(): Promise<Record<string, any>> {
  // 1. Try Twelve Data (requires TWELVE_DATA_API_KEY — works from Vercel IPs)
  try {
    const td = await fetchTwelveData()
    if (td) return td
  } catch (e) {
    console.warn('Twelve Data failed:', (e as Error).message)
  }

  // 2. Fall back to Yahoo Finance chart API (blocked on Vercel shared IPs, but try anyway)
  const symbols = ['GC=F','SI=F','CL=F','BZ=F','HG=F','NG=F','USDINR=X']
  const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  const settled = await Promise.allSettled(
    symbols.map(async (sym) => {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d&includePrePost=false`,
        { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
      )
      if (!r.ok) throw new Error(`Yahoo chart ${sym}: ${r.status}`)
      const d = await r.json()
      const meta = d?.chart?.result?.[0]?.meta
      if (!meta) throw new Error(`Yahoo chart ${sym}: no result`)
      const price     = meta.regularMarketPrice ?? 0
      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price
      const pct       = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0
      return { symbol: sym, regularMarketPrice: price, regularMarketChangePercent: pct }
    })
  )

  const map: Record<string, any> = {}
  for (const r of settled) {
    if (r.status === 'fulfilled') map[r.value.symbol] = r.value
    else console.warn('fetchYahoo:', r.reason?.message)
  }
  return map  // may be empty — Frankfurter covers USD/INR as a floor
}

// Frankfurter is a free, open-source ECB rates API — no key, no rate-limit, works from any cloud IP
async function fetchUsdInr(): Promise<number> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    })
    if (!r.ok) return 0
    const d = await r.json()
    return d?.rates?.INR ?? 0
  } catch {
    return 0
  }
}

// ── MCX derivation from COMEX ─────────────────────────────────────────────────

function deriveFromYahoo(yahoo: Record<string, any>, usdinrFallback = 0) {
  const usdinr    = yahoo['USDINR=X']?.regularMarketPrice ?? (usdinrFallback || 96.0)
  const comexGold = yahoo['GC=F']?.regularMarketPrice     ?? 0
  const comexSilv = yahoo['SI=F']?.regularMarketPrice     ?? 0
  const wti       = yahoo['CL=F']?.regularMarketPrice     ?? 0
  const brent     = yahoo['BZ=F']?.regularMarketPrice     ?? 0
  const comexCu   = yahoo['HG=F']?.regularMarketPrice     ?? 0
  const henryHub  = yahoo['NG=F']?.regularMarketPrice     ?? 0

  return {
    usdinr, brent, comexGold, comexSilver: comexSilv,
    wti, comexCopper: comexCu, henryHub,
    // MCX derived prices
    mcxGold:   comexGold > 0 ? (comexGold / 31.1035) * 10   * usdinr * 1.15 : 0,
    mcxSilver: comexSilv > 0 ? (comexSilv / 31.1035) * 1000 * usdinr * 1.10 : 0,
    mcxCrude:  wti       > 0 ? wti        * usdinr   * 1.02 : 0,
    mcxCopper: comexCu   > 0 ? comexCu    * 2.20462  * usdinr * 1.05 : 0,
    mcxNatGas: henryHub  > 0 ? henryHub   * usdinr            : 0,
    // Change %
    goldPct:    yahoo['GC=F']?.regularMarketChangePercent    ?? 0,
    silverPct:  yahoo['SI=F']?.regularMarketChangePercent    ?? 0,
    crudePct:   yahoo['CL=F']?.regularMarketChangePercent    ?? 0,
    brentPct:   yahoo['BZ=F']?.regularMarketChangePercent    ?? 0,
    copperPct:  yahoo['HG=F']?.regularMarketChangePercent    ?? 0,
    gasPct:     yahoo['NG=F']?.regularMarketChangePercent    ?? 0,
    usdinrPct:  yahoo['USDINR=X']?.regularMarketChangePercent ?? 0,
  }
}

// ── Kite quotes ───────────────────────────────────────────────────────────────

async function fetchKiteQuotes(): Promise<Record<string, KiteQuote> | null> {
  const apiKey      = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN

  if (!apiKey || !accessToken) return null

  // Use hardcoded fallback tokens for front-month MCX contracts
  let tokens: typeof FALLBACK_TOKENS | null = FALLBACK_TOKENS

  if (!tokens) {
    // Try to discover tokens live if cache is missing
    try {
      const client = new KiteClient(apiKey, accessToken)
      tokens = await client.discoverAndCacheTokens()
    } catch (err) {
      console.warn('Kite instrument discovery failed:', (err as Error).message)
      return null
    }
  }

  try {
    const client = new KiteClient(apiKey, accessToken)
    const instrumentList = [
      tokens.gold, tokens.silver, tokens.crude, tokens.copper, tokens.natgas,
    ]
    return await client.getQuotes(instrumentList)
  } catch (err) {
    console.warn('Kite quote fetch failed:', (err as Error).message)
    return null
  }
}

// ── Unified price shape ───────────────────────────────────────────────────────

export interface PriceData {
  source: 'kite+twelvedata' | 'twelvedata' | 'kite+yahoo' | 'yahoo'
  updatedAt: string
  marketOpen: boolean

  // Forex
  usdinr:        number
  usdinrChangePct: number

  // Global reference
  comexGold:     number
  comexSilver:   number
  wti:           number
  brent:         number
  comexCopper:   number
  henryHub:      number
  goldComexPct:  number
  silverComexPct:number
  crudePct:      number
  brentPct:      number
  copperComexPct:number
  gasPct:        number

  // MCX commodities
  gold:    { mcx: number; mcxChangePct: number; mcxChange: number; comex: number; comexChangePct: number }
  silver:  { mcx: number; mcxChangePct: number; mcxChange: number; comex: number; comexChangePct: number }
  crude:   { mcx: number; mcxChangePct: number; mcxChange: number; wti: number; wtiChangePct: number; brent: number; brentChangePct: number }
  copper:  { mcx: number; mcxChangePct: number; mcxChange: number }
  natgas:  { mcx: number; mcxChangePct: number; mcxChange: number }
  aluminium: { lme: number; lmeChangePct: number }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function getPrices(): Promise<PriceData | null> {
  try {
    const [yahoo, kiteQuotes, usdinrFallback] = await Promise.all([
      fetchYahoo(),
      fetchKiteQuotes(),
      fetchUsdInr(),
    ])

    const y = deriveFromYahoo(yahoo, usdinrFallback)

    // Is MCX currently open? 9:00 AM – 11:30 PM IST = 03:30–18:00 UTC
    const nowUTC  = new Date()
    const utcH    = nowUTC.getUTCHours()
    const utcM    = nowUTC.getUTCMinutes()
    const utcMins = utcH * 60 + utcM
    const marketOpen = utcMins >= 210 && utcMins <= 1080 // 3:30 AM–6:00 PM UTC

    // Helper to extract Kite quote by token
    function kiteByToken(token: number): KiteQuote | null {
      if (!kiteQuotes) return null
      return Object.values(kiteQuotes).find(
        (q: KiteQuote) => q.instrument_token === token
      ) ?? null
    }

    const tokens = FALLBACK_TOKENS

    const goldQ   = tokens ? kiteByToken(tokens.gold)   : null
    const silverQ = tokens ? kiteByToken(tokens.silver) : null
    const crudeQ  = tokens ? kiteByToken(tokens.crude)  : null
    const copperQ = tokens ? kiteByToken(tokens.copper) : null
    const natgasQ = tokens ? kiteByToken(tokens.natgas) : null

    const usingKite    = !!(kiteQuotes && goldQ)
    const usingTwelve  = !!process.env.TWELVE_DATA_API_KEY

    return {
      source: usingKite
        ? (usingTwelve ? 'kite+twelvedata' : 'kite+yahoo')
        : (usingTwelve ? 'twelvedata'      : 'yahoo'),
      updatedAt: new Date().toISOString(),
      marketOpen,

      usdinr:         y.usdinr,
      usdinrChangePct:y.usdinrPct,

      comexGold:      y.comexGold,
      comexSilver:    y.comexSilver,
      wti:            y.wti,
      brent:          y.brent,
      comexCopper:    y.comexCopper,
      henryHub:       y.henryHub,
      goldComexPct:   y.goldPct,
      silverComexPct: y.silverPct,
      crudePct:       y.crudePct,
      brentPct:       y.brentPct,
      copperComexPct: y.copperPct,
      gasPct:         y.gasPct,

      gold: {
        mcx:           goldQ   ? goldQ.last_price               : y.mcxGold,
        mcxChangePct:  goldQ   ? KiteClient.changePct(goldQ)    : y.goldPct,
        mcxChange:     goldQ   ? goldQ.net_change               : 0,
        comex:         y.comexGold,
        comexChangePct:y.goldPct,
      },
      silver: {
        mcx:           silverQ ? silverQ.last_price             : y.mcxSilver,
        mcxChangePct:  silverQ ? KiteClient.changePct(silverQ)  : y.silverPct,
        mcxChange:     silverQ ? silverQ.net_change             : 0,
        comex:         y.comexSilver,
        comexChangePct:y.silverPct,
      },
      crude: {
        mcx:           crudeQ  ? crudeQ.last_price              : y.mcxCrude,
        mcxChangePct:  crudeQ  ? KiteClient.changePct(crudeQ)   : y.crudePct,
        mcxChange:     crudeQ  ? crudeQ.net_change              : 0,
        wti:           y.wti,
        wtiChangePct:  y.crudePct,
        brent:         y.brent,
        brentChangePct:y.brentPct,
      },
      copper: {
        mcx:           copperQ ? copperQ.last_price             : y.mcxCopper,
        mcxChangePct:  copperQ ? KiteClient.changePct(copperQ)  : y.copperPct,
        mcxChange:     copperQ ? copperQ.net_change             : 0,
      },
      natgas: {
        mcx:           natgasQ ? natgasQ.last_price             : y.mcxNatGas,
        mcxChangePct:  natgasQ ? KiteClient.changePct(natgasQ)  : y.gasPct,
        mcxChange:     natgasQ ? natgasQ.net_change             : 0,
      },
      aluminium: { lme: 0, lmeChangePct: 0 },
    }
  } catch (err) {
    console.error('getPrices error:', err)
    return null
  }
}

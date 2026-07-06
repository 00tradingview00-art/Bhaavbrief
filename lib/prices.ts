/**
 * lib/prices.ts — server-side price fetcher for API routes and server components.
 *
 * COMEX/reference price priority:
 *   1. Twelve Data  (XAU/USD, USD/INR) — free tier, 15-min cache
 *   2. Alpha Vantage (WTI, Brent, NatGas, Silver) — free tier, 6-hr cache, 25 calls/day
 *   3. Stooq CSV — free, no API key, COMEX/NYMEX futures
 *   4. Frankfurter ECB — USD/INR floor, always works
 *
 * MCX prices: Kite Connect live quotes only. Shows 0 (unavailable) when Kite is down.
 */

import { unstable_cache } from 'next/cache'
import { KiteClient, type KiteQuote, type InstrumentInfo } from './kite'
import fs from 'fs'
import path from 'path'

// ── Instrument token management ───────────────────────────────────────────────

const FALLBACK_INSTRUMENTS: Record<string, InstrumentInfo> = {
  gold:     { token: 117574919, symbol: 'GOLD',        expiry: '' },
  goldMini: { token: 125882119, symbol: 'GOLDM',       expiry: '' },
  silver:   { token: 118822407, symbol: 'SILVER',      expiry: '' },
  crude:    { token: 127768327, symbol: 'CRUDEOIL',    expiry: '' },
  copper:   { token: 130682887, symbol: 'COPPER',      expiry: '' },
  natgas:   { token: 125057287, symbol: 'NATURALGAS',  expiry: '' },
}

function loadInstrumentTokens(): Record<string, InstrumentInfo> {
  try {
    const file = path.join(process.cwd(), 'data/kite-instruments.json')
    if (!fs.existsSync(file)) return FALLBACK_INSTRUMENTS
    const data = JSON.parse(fs.readFileSync(file, 'utf8'))

    // New format: { gold: { token, symbol, expiry }, ... }
    if (data.gold && typeof data.gold === 'object' && data.gold.token > 0) return data

    // Old format: { gold: 12345, ... } — migrate on the fly
    if (typeof data.gold === 'number' && data.gold > 0) {
      return {
        gold:     { token: data.gold,     symbol: 'GOLD',       expiry: '' },
        goldMini: { token: data.goldMini, symbol: 'GOLDM',      expiry: '' },
        silver:   { token: data.silver,   symbol: 'SILVER',     expiry: '' },
        crude:    { token: data.crude,    symbol: 'CRUDEOIL',   expiry: '' },
        copper:   { token: data.copper,   symbol: 'COPPER',     expiry: '' },
        natgas:   { token: data.natgas,   symbol: 'NATURALGAS', expiry: '' },
      }
    }
    return FALLBACK_INSTRUMENTS
  } catch {
    return FALLBACK_INSTRUMENTS
  }
}

// ── Twelve Data ───────────────────────────────────────────────────────────────

const TD_SYMBOL_MAP: Record<string, string> = {
  'GC=F':     'XAU/USD',
  'USDINR=X': 'USD/INR',
}

async function fetchTwelveData(): Promise<Record<string, any> | null> {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return null

  const tdSymbols = Object.values(TD_SYMBOL_MAP).join(',')
  const res = await fetch(
    `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(tdSymbols)}&apikey=${apiKey}`,
    { signal: AbortSignal.timeout(10000), next: { revalidate: 900 } }
  )
  if (!res.ok) throw new Error(`Twelve Data: ${res.status}`)
  const data = await res.json()

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

// ── Alpha Vantage ─────────────────────────────────────────────────────────────
// Free: 25 calls/day, 5/min. Sequential fetch + 6-hr cache = ~16 calls/day.

async function fetchAlphaVantage(): Promise<Record<string, any>> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY
  if (!apiKey) return {}

  const map: Record<string, any> = {}

  for (const { yahooSym, fn, interval } of [
    { yahooSym: 'CL=F', fn: 'WTI',         interval: 'daily' },
    { yahooSym: 'BZ=F', fn: 'BRENT',       interval: 'daily' },
    { yahooSym: 'NG=F', fn: 'NATURAL_GAS', interval: 'daily' },
  ]) {
    try {
      const r = await fetch(
        `https://www.alphavantage.co/query?function=${fn}&interval=${interval}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(10000), next: { revalidate: 21600 } }
      )
      if (!r.ok) throw new Error(`AV ${fn}: ${r.status}`)
      const d = await r.json()
      if (d['Information'] || d['Note']) throw new Error(`AV ${fn}: rate limited`)
      const rawSeries: Array<{ date: string; value: string }> = d?.data ?? []
      if (rawSeries.length < 2) throw new Error(`AV ${fn}: no data`)
      const series = [...rawSeries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      if ((Date.now() - new Date(series[0].date).getTime()) / 86400000 > 14)
        throw new Error(`AV ${fn}: stale`)
      const latest = parseFloat(series[0].value)
      const prev   = parseFloat(series[1].value)
      map[yahooSym] = {
        regularMarketPrice:         latest,
        regularMarketChangePercent: prev > 0 ? ((latest - prev) / prev) * 100 : 0,
      }
    } catch (e) { console.warn('AV:', (e as Error).message) }
  }

  // Silver via FX_DAILY XAG/USD
  try {
    const r = await fetch(
      `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=XAG&to_symbol=USD&outputsize=compact&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10000), next: { revalidate: 21600 } }
    )
    if (!r.ok) throw new Error(`AV XAG: ${r.status}`)
    const d = await r.json()
    if (d['Information'] || d['Note']) throw new Error('AV XAG: rate limited')
    const series = d?.['Time Series FX (Daily)'] as Record<string, Record<string, string>> | undefined
    if (!series) throw new Error('AV XAG: no data')
    const dates = Object.keys(series).sort().reverse()
    if (dates.length < 2) throw new Error('AV XAG: insufficient data')
    const latest = parseFloat(series[dates[0]]['4. close'])
    const prev   = parseFloat(series[dates[1]]['4. close'])
    map['SI=F'] = {
      regularMarketPrice:         latest,
      regularMarketChangePercent: prev > 0 ? ((latest - prev) / prev) * 100 : 0,
    }
  } catch (e) { console.warn('AV:', (e as Error).message) }

  return map
}

const fetchTwelveDataCached   = unstable_cache(fetchTwelveData,   ['td-prices'],    { revalidate: 900   })
const fetchAlphaVantageCached = unstable_cache(fetchAlphaVantage, ['av-prices-v2'], { revalidate: 21600 })

// ── Yahoo Finance v8 (primary COMEX/NYMEX source — no key, intraday) ──────────

const YAHOO_COMEX = [
  { key: 'GC=F',     sym: 'GC%3DF'     },  // COMEX Gold
  { key: 'SI=F',     sym: 'SI%3DF'     },  // COMEX Silver
  { key: 'CL=F',     sym: 'CL%3DF'     },  // WTI Crude
  { key: 'BZ=F',     sym: 'BZ%3DF'     },  // Brent
  { key: 'HG=F',     sym: 'HG%3DF'     },  // COMEX Copper
  { key: 'NG=F',     sym: 'NG%3DF'     },  // Henry Hub
  { key: 'USDINR=X', sym: 'USDINR%3DX' },  // USD/INR
]

async function fetchYahooComex(): Promise<Record<string, any>> {
  const map: Record<string, any> = {}
  await Promise.all(
    YAHOO_COMEX.map(async ({ key, sym }) => {
      try {
        const r = await fetch(
          `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=2d`,
          { headers: { 'User-Agent': 'Mozilla/5.0 BhaavBrief/2.0', Accept: 'application/json' }, signal: AbortSignal.timeout(9000), next: { revalidate: 900 } }
        )
        if (!r.ok) return
        const { chart } = await r.json()
        const meta = chart?.result?.[0]?.meta
        if (!meta) return
        const price     = meta.regularMarketPrice    ?? 0
        const prevClose = meta.chartPreviousClose    ?? 0
        if (!(price > 0)) return
        map[key] = {
          regularMarketPrice:         price,
          regularMarketChangePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
        }
      } catch {}
    })
  )
  return map
}

// ── Stooq (fallback — free CSV, no key, COMEX/NYMEX futures) ─────────────────

async function fetchStooq(): Promise<Record<string, any>> {
  // Symbol,Date,Time,Open,High,Low,Close,Volume — Close at index 6
  const stooqMap: Record<string, string> = {
    'GC=F': 'gc.f',    // COMEX Gold $/troy oz
    'SI=F': 'si.f',    // COMEX Silver $/troy oz
    'CL=F': 'cl.f',    // NYMEX WTI Crude $/bbl
    'HG=F': 'hg.f',    // COMEX Copper ¢/lb
    'NG=F': 'ng.f',    // Henry Hub Nat Gas $/mmBtu
  }
  const map: Record<string, any> = {}
  await Promise.all(
    Object.entries(stooqMap).map(async ([yfKey, sym]) => {
      try {
        const r = await fetch(
          `https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`,
          { signal: AbortSignal.timeout(8000), next: { revalidate: 300 } }
        )
        if (!r.ok) return
        const lines = (await r.text()).trim().split('\n')
        if (lines.length < 2) return
        const cols  = lines[1].split(',')
        const close = parseFloat(cols[6])
        const open  = parseFloat(cols[3])
        if (!isNaN(close) && close > 0) {
          // SI (silver) is quoted in ¢/troy oz on CME/Stooq; HG (copper) in ¢/lb
          // Normalize both to $/unit so deriveFromYahoo formulas stay consistent
          const divisor = (yfKey === 'SI=F' || yfKey === 'HG=F') ? 100 : 1
          map[yfKey] = {
            regularMarketPrice:         close / divisor,
            regularMarketChangePercent: open  > 0 ? ((close - open) / open) * 100 : 0,
          }
        }
      } catch {}
    })
  )
  return map
}

async function fetchComexPrices(): Promise<Record<string, any>> {
  // Yahoo v8 is primary — intraday, no key, covers all 6 symbols reliably
  const yahoo = await fetchYahooComex()
  if (Object.keys(yahoo).length >= 4) return yahoo

  // Partial Yahoo result — fill gaps with TD + AV
  const [td, av] = await Promise.allSettled([fetchTwelveDataCached(), fetchAlphaVantageCached()])
  const tdMap = td.status === 'fulfilled' && td.value ? td.value : {}
  const avMap = av.status === 'fulfilled' ? av.value : {}
  const combined = { ...yahoo, ...avMap, ...tdMap }

  // Last resort: Stooq for anything still missing
  const allKeys = ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'HG=F', 'NG=F'] as const
  const missing = allKeys.filter(k => !combined[k]?.regularMarketPrice)
  if (missing.length > 0) {
    const stooq = await fetchStooq()
    for (const k of missing) { if (stooq[k]) combined[k] = stooq[k] }
  }

  return combined
}

async function fetchUsdInr(): Promise<number> {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=INR', {
      signal: AbortSignal.timeout(5000), next: { revalidate: 300 },
    })
    if (!r.ok) return 0
    const d = await r.json()
    return d?.rates?.INR ?? 0
  } catch { return 0 }
}

// ── MCX prev-close cache (written by intelligence engine after each Kite fetch) ─

interface MCXCache {
  ts:        string
  gold:      number | null
  goldPct:   number
  silver:    number | null
  silverPct: number
  crude:     number | null
  crudePct:  number
  copper:    number | null
  copperPct: number
  natgas:    number | null
  natgasPct: number
}

function loadMCXCache(): MCXCache | null {
  try {
    const file = path.join(process.cwd(), 'data/mcx-last-prices.json')
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as MCXCache
  } catch { return null }
}

// ── MCX derivation from COMEX ─────────────────────────────────────────────────

const USDINR_MIN = 82, USDINR_MAX = 110

function deriveFromYahoo(yahoo: Record<string, any>, usdinrFallback = 0) {
  const yahooUsd = yahoo['USDINR=X']?.regularMarketPrice ?? 0
  // Prefer Frankfurter (daily ECB rate, reliable) over Yahoo FX which can be stale.
  // Reject either value if outside the plausible ₹82–₹110 range.
  const usdinr =
    (usdinrFallback >= USDINR_MIN && usdinrFallback <= USDINR_MAX) ? usdinrFallback :
    (yahooUsd      >= USDINR_MIN && yahooUsd      <= USDINR_MAX) ? yahooUsd      :
    0
  const comexGold = yahoo['GC=F']?.regularMarketPrice     ?? 0
  const comexSilv = yahoo['SI=F']?.regularMarketPrice     ?? 0
  const wti       = yahoo['CL=F']?.regularMarketPrice     ?? 0
  const brent     = yahoo['BZ=F']?.regularMarketPrice     ?? 0
  const comexCu   = yahoo['HG=F']?.regularMarketPrice     ?? 0
  const henryHub  = yahoo['NG=F']?.regularMarketPrice     ?? 0
  return {
    usdinr, brent, comexGold, comexSilver: comexSilv,
    wti, comexCopper: comexCu, henryHub,
    goldPct:   yahoo['GC=F']?.regularMarketChangePercent    ?? 0,
    silverPct: yahoo['SI=F']?.regularMarketChangePercent    ?? 0,
    crudePct:  yahoo['CL=F']?.regularMarketChangePercent    ?? 0,
    brentPct:  yahoo['BZ=F']?.regularMarketChangePercent    ?? 0,
    copperPct: yahoo['HG=F']?.regularMarketChangePercent    ?? 0,
    gasPct:    yahoo['NG=F']?.regularMarketChangePercent    ?? 0,
    usdinrPct: yahoo['USDINR=X']?.regularMarketChangePercent ?? 0,
  }
}

// ── Kite quotes ───────────────────────────────────────────────────────────────

async function fetchKiteQuotes(): Promise<Record<string, KiteQuote> | null> {
  const apiKey      = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN
  if (!apiKey || !accessToken) return null

  const instruments = loadInstrumentTokens()
  try {
    const client = new KiteClient(apiKey, accessToken)
    const coreKeys   = ['gold', 'silver', 'crude', 'copper', 'natgas', 'zinc', 'lead', 'aluminium', 'nickel']
    const mcxTokens  = coreKeys.filter(k => instruments[k]?.token).map(k => instruments[k].token)
    const fxTokens   = instruments.currencies
      ? Object.values(instruments.currencies as unknown as Record<string, InstrumentInfo>).map(c => c.token)
      : []
    return await client.getQuotes([...mcxTokens, ...fxTokens])
  } catch (err) {
    console.warn('Kite quote fetch failed:', (err as Error).message)
    return null
  }
}

// ── Unified price shape ───────────────────────────────────────────────────────

export interface MCXData {
  mcx:          number   // last traded price
  mcxChangePct: number   // % change from prev close
  mcxChange:    number   // absolute change from prev close
  mcxOpen:      number   // today's open (0 if Kite unavailable)
  mcxHigh:      number   // today's high (0 if Kite unavailable)
  mcxLow:       number   // today's low  (0 if Kite unavailable)
  mcxPrevClose: number   // previous close / settlement
  mcxVolume:    number   // lots traded today (0 if Kite unavailable)
  mcxOI:        number   // open interest in lots (0 if Kite unavailable)
  mcxSymbol:    string   // e.g. "GOLDJUN26FUT" or "GOLD"
  mcxExpiry:    string   // ISO date e.g. "2026-06-05" or ""
}

export interface ForexData {
  ltp:        number
  changePct:  number
  change:     number
  open:       number
  high:       number
  low:        number
  prevClose:  number
  volume:     number
  symbol:     string
  expiry:     string
}

export interface PriceData {
  source:          'kite+twelvedata' | 'twelvedata' | 'kite+stooq' | 'stooq'
  updatedAt:       string
  generatedAtIST?: string   // IST timestamp from snapshot, e.g. "2026-06-10 09:30 IST"
  snapshotStale?:  boolean  // true when snapshot is >2h old during MCX hours
  marketOpen:      boolean

  usdinr:         number
  usdinrChangePct:number

  comexGold:      number
  comexSilver:    number
  wti:            number
  brent:          number
  comexCopper:    number
  henryHub:       number
  goldComexPct:   number
  silverComexPct: number
  crudePct:       number
  brentPct:       number
  copperComexPct: number
  gasPct:         number

  gold:   MCXData & { comex: number; comexChangePct: number }
  silver: MCXData & { comex: number; comexChangePct: number }
  crude:  MCXData & { wti: number; wtiChangePct: number; brent: number; brentChangePct: number }
  copper:    MCXData
  natgas:    MCXData
  zinc?:     MCXData
  lead?:     MCXData
  aluminium?: MCXData
  nickel?:   MCXData
  currencies?: {
    usdinr: ForexData
    eurinr: ForexData
    gbpinr: ForexData
    jpyinr: ForexData
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function buildMCXData(q: KiteQuote | null, fallbackPrice: number, fallbackPct: number, info: InstrumentInfo): MCXData {
  const hasLive = !!(q && q.last_price > 0)
  const prevClose = q?.ohlc?.close ?? 0
  return {
    mcx:          hasLive ? q!.last_price            : (prevClose > 0 ? prevClose : fallbackPrice),
    mcxChangePct: hasLive ? KiteClient.changePct(q!) : fallbackPct,
    mcxChange:    hasLive ? q!.net_change            : 0,
    mcxOpen:      hasLive ? (q!.ohlc?.open   ?? 0)  : 0,
    mcxHigh:      hasLive ? (q!.ohlc?.high   ?? 0)  : 0,
    mcxLow:       hasLive ? (q!.ohlc?.low    ?? 0)  : 0,
    mcxPrevClose: hasLive ? (q!.ohlc?.close  ?? 0)  : 0,
    mcxVolume:    hasLive ? (q!.volume        ?? 0)  : 0,
    mcxOI:        hasLive ? (q!.oi            ?? 0)  : 0,
    mcxSymbol:    info.symbol,
    mcxExpiry:    info.expiry,
  }
}

function buildForexData(q: KiteQuote | null, info: InstrumentInfo): ForexData {
  const hasLive = !!(q && q.last_price > 0)
  return {
    ltp:       hasLive ? q!.last_price           : 0,
    changePct: hasLive ? KiteClient.changePct(q!) : 0,
    change:    hasLive ? q!.net_change            : 0,
    open:      hasLive ? (q!.ohlc?.open  ?? 0)   : 0,
    high:      hasLive ? (q!.ohlc?.high  ?? 0)   : 0,
    low:       hasLive ? (q!.ohlc?.low   ?? 0)   : 0,
    prevClose: hasLive ? (q!.ohlc?.close ?? 0)   : 0,
    volume:    hasLive ? (q!.volume      ?? 0)   : 0,
    symbol:    info.symbol,
    expiry:    info.expiry,
  }
}

export async function getPrices(): Promise<PriceData | null> {
  try {
    const [comex, kiteQuotes, usdinrFallback] = await Promise.all([
      fetchComexPrices(),
      fetchKiteQuotes(),
      fetchUsdInr(),
    ])

    const y = deriveFromYahoo(comex, usdinrFallback)

    const utcMins = new Date().getUTCHours() * 60 + new Date().getUTCMinutes()
    const marketOpen = utcMins >= 210 && utcMins <= 1080  // 9 AM–11:30 PM IST

    const instruments = loadInstrumentTokens()

    function kiteByToken(token: number): KiteQuote | null {
      if (!kiteQuotes) return null
      return Object.values(kiteQuotes).find(q => q.instrument_token === token) ?? null
    }

    const goldQ      = kiteByToken(instruments.gold.token)
    const silverQ    = kiteByToken(instruments.silver.token)
    const crudeQ     = kiteByToken(instruments.crude.token)
    const copperQ    = kiteByToken(instruments.copper.token)
    const natgasQ    = kiteByToken(instruments.natgas.token)
    const zincQ      = instruments.zinc      ? kiteByToken(instruments.zinc.token)      : null
    const leadQ      = instruments.lead      ? kiteByToken(instruments.lead.token)      : null
    const aluminiumQ = instruments.aluminium ? kiteByToken(instruments.aluminium.token) : null
    const nickelQ    = instruments.nickel    ? kiteByToken(instruments.nickel.token)    : null

    const usingKite   = !!(kiteQuotes && goldQ)
    const usingTwelve = !!process.env.TWELVE_DATA_API_KEY

    // When Kite is down, use last cached prev-close prices so ticker shows real data
    const cache = usingKite ? null : loadMCXCache()

    return {
      source: usingKite
        ? (usingTwelve ? 'kite+twelvedata' : 'kite+stooq')
        : (usingTwelve ? 'twelvedata'      : 'stooq'),
      updatedAt:  new Date().toISOString(),
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
        ...buildMCXData(goldQ, cache?.gold ?? 0, cache?.goldPct ?? 0, instruments.gold),
        comex:          y.comexGold,
        comexChangePct: y.goldPct,
      },
      silver: {
        ...buildMCXData(silverQ, cache?.silver ?? 0, cache?.silverPct ?? 0, instruments.silver),
        comex:          y.comexSilver,
        comexChangePct: y.silverPct,
      },
      crude: {
        ...buildMCXData(crudeQ, cache?.crude ?? 0, cache?.crudePct ?? 0, instruments.crude),
        wti:            y.wti,
        wtiChangePct:   y.crudePct,
        brent:          y.brent,
        brentChangePct: y.brentPct,
      },
      copper: buildMCXData(copperQ, cache?.copper ?? 0, cache?.copperPct ?? 0, instruments.copper),
      natgas: buildMCXData(natgasQ, cache?.natgas ?? 0, cache?.natgasPct ?? 0, instruments.natgas),
      ...(zincQ      ? { zinc:      buildMCXData(zincQ,      0, 0, instruments.zinc!)      } : {}),
      ...(leadQ      ? { lead:      buildMCXData(leadQ,      0, 0, instruments.lead!)      } : {}),
      ...(aluminiumQ ? { aluminium: buildMCXData(aluminiumQ, 0, 0, instruments.aluminium!) } : {}),
      ...(nickelQ    ? { nickel:    buildMCXData(nickelQ,    0, 0, instruments.nickel!)    } : {}),
      ...(instruments.currencies ? {
        currencies: {
          usdinr: buildForexData(kiteByToken((instruments.currencies as any).usdinr.token), (instruments.currencies as any).usdinr),
          eurinr: buildForexData(kiteByToken((instruments.currencies as any).eurinr.token), (instruments.currencies as any).eurinr),
          gbpinr: buildForexData(kiteByToken((instruments.currencies as any).gbpinr.token), (instruments.currencies as any).gbpinr),
          jpyinr: buildForexData(kiteByToken((instruments.currencies as any).jpyinr.token), (instruments.currencies as any).jpyinr),
        }
      } : {}),
    }
  } catch (err) {
    console.error('getPrices error:', err)
    return null
  }
}

// ── Snapshot reader — try the committed snapshot before live fetching ─────────
// If data/market-snapshot.json is fresh (≤90 min), serve it directly.
// This makes the API consistent with what the brief was generated from.

function loadFromSnapshot(): PriceData | null {
  try {
    const file = path.join(process.cwd(), 'data/market-snapshot.json')
    if (!fs.existsSync(file)) return null
    const snap = JSON.parse(fs.readFileSync(file, 'utf8'))
    const ageMs = Date.now() - new Date(snap.generatedAt).getTime()
    if (ageMs > 90 * 60 * 1000) return null  // stale — fall back to live fetch
    const inst = snap.instruments
    if (!inst) return null

    const mcxUnits: Record<string, InstrumentInfo> = loadInstrumentTokens()

    function mcxData(key: string, instKey: string): MCXData & { comex?: number; comexChangePct?: number } {
      const d = inst[instKey]
      const info = mcxUnits[key] ?? { token: 0, symbol: '', expiry: '' }
      return {
        mcx:          d?.price         ?? 0,
        mcxChangePct: d?.changePct     ?? 0,
        mcxChange:    0,
        mcxOpen:      0,
        mcxHigh:      0,
        mcxLow:       0,
        mcxPrevClose: d?.prevClose     ?? 0,
        mcxVolume:    0,
        mcxOI:        0,
        mcxSymbol:    info.symbol,
        mcxExpiry:    info.expiry,
      }
    }

    return {
      source:         (snap.source?.includes('kite') ? 'kite+stooq' : 'stooq') as PriceData['source'],
      updatedAt:      snap.generatedAt,
      marketOpen:     true,

      usdinr:         inst.USDINR?.price         ?? 0,
      usdinrChangePct:inst.USDINR?.changePct      ?? 0,

      comexGold:      inst.COMEX_GOLD?.price      ?? 0,
      comexSilver:    inst.COMEX_SILVER?.price    ?? 0,
      wti:            inst.WTI?.price             ?? 0,
      brent:          inst.BRENT?.price           ?? 0,
      comexCopper:    0,
      henryHub:       inst.HENRY_HUB?.price       ?? 0,
      goldComexPct:   inst.COMEX_GOLD?.changePct  ?? 0,
      silverComexPct: inst.COMEX_SILVER?.changePct ?? 0,
      crudePct:       inst.WTI?.changePct         ?? 0,
      brentPct:       inst.BRENT?.changePct       ?? 0,
      copperComexPct: 0,
      gasPct:         inst.HENRY_HUB?.changePct   ?? 0,

      gold: {
        ...mcxData('gold', 'MCX_GOLD'),
        comex:          inst.COMEX_GOLD?.price     ?? 0,
        comexChangePct: inst.COMEX_GOLD?.changePct ?? 0,
      },
      silver: {
        ...mcxData('silver', 'MCX_SILVER'),
        comex:          inst.COMEX_SILVER?.price     ?? 0,
        comexChangePct: inst.COMEX_SILVER?.changePct ?? 0,
      },
      crude: {
        ...mcxData('crude', 'MCX_CRUDE'),
        wti:            inst.WTI?.price     ?? 0,
        wtiChangePct:   inst.WTI?.changePct ?? 0,
        brent:          inst.BRENT?.price   ?? 0,
        brentChangePct: inst.BRENT?.changePct ?? 0,
      },
      copper:    mcxData('copper', 'MCX_COPPER'),
      natgas:    mcxData('natgas', 'MCX_NATGAS'),
      ...(inst.MCX_ZINC      ? { zinc:      mcxData('zinc',      'MCX_ZINC')      } : {}),
      ...(inst.MCX_LEAD      ? { lead:      mcxData('lead',      'MCX_LEAD')      } : {}),
      ...(inst.MCX_ALUMINIUM ? { aluminium: mcxData('aluminium', 'MCX_ALUMINIUM') } : {}),
      ...(inst.MCX_NICKEL    ? { nickel:    mcxData('nickel',    'MCX_NICKEL')    } : {}),
    }
  } catch { return null }
}

export { loadFromSnapshot }

/**
 * lib/prices.ts — server-side price fetcher for API routes and server components.
 *
 * COMEX/reference price priority:
 *   1. Twelve Data  (XAU/USD, USD/INR) — free tier, 15-min cache
 *   2. Alpha Vantage (WTI, Brent, NatGas, Silver) — free tier, 6-hr cache, 25 calls/day
 *   3. Stooq CSV — free, no API key, COMEX/NYMEX futures
 *   4. Frankfurter ECB — USD/INR floor, always works
 *
 * MCX price priority:
 *   1. Kite Connect live quotes (OHLC, Volume, OI included)
 *   2. Derived from COMEX via formula (no OHLC/Volume/OI available)
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
  const [td, av] = await Promise.allSettled([fetchTwelveDataCached(), fetchAlphaVantageCached()])
  const tdMap = td.status === 'fulfilled' && td.value ? td.value : {}
  const avMap = av.status === 'fulfilled' ? av.value : {}

  const combined = { ...avMap, ...tdMap }  // TD wins on overlap
  if (Object.keys(combined).length > 0) return combined

  // Fallback: Stooq free CSV API
  return fetchStooq()
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
    mcxGold:   comexGold > 0 ? (comexGold / 31.1035) * 10   * usdinr * 1.15 : 0,
    mcxSilver: comexSilv > 0 ? (comexSilv / 31.1035) * 1000 * usdinr * 1.10 : 0,
    mcxCrude:  wti       > 0 ? wti * usdinr * 1.02 : 0,
    mcxCopper: comexCu   > 0 ? comexCu * 2.20462 * usdinr * 1.05 : 0,
    mcxNatGas: henryHub  > 0 ? henryHub * usdinr : 0,
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
    const tokenList = ['gold', 'silver', 'crude', 'copper', 'natgas'].map(k => instruments[k].token)
    return await client.getQuotes(tokenList)
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

export interface PriceData {
  source:     'kite+twelvedata' | 'twelvedata' | 'kite+stooq' | 'stooq'
  updatedAt:  string
  marketOpen: boolean

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
  copper: MCXData
  natgas: MCXData
  aluminium: { lme: number; lmeChangePct: number }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function buildMCXData(q: KiteQuote | null, fallbackPrice: number, fallbackPct: number, info: InstrumentInfo): MCXData {
  const hasLive = !!(q && q.last_price > 0)
  return {
    mcx:          hasLive ? q!.last_price            : fallbackPrice,
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

    const goldQ   = kiteByToken(instruments.gold.token)
    const silverQ = kiteByToken(instruments.silver.token)
    const crudeQ  = kiteByToken(instruments.crude.token)
    const copperQ = kiteByToken(instruments.copper.token)
    const natgasQ = kiteByToken(instruments.natgas.token)

    const usingKite   = !!(kiteQuotes && goldQ)
    const usingTwelve = !!process.env.TWELVE_DATA_API_KEY

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
        ...buildMCXData(goldQ, y.mcxGold, y.goldPct, instruments.gold),
        comex:          y.comexGold,
        comexChangePct: y.goldPct,
      },
      silver: {
        ...buildMCXData(silverQ, y.mcxSilver, y.silverPct, instruments.silver),
        comex:          y.comexSilver,
        comexChangePct: y.silverPct,
      },
      crude: {
        ...buildMCXData(crudeQ, y.mcxCrude, y.crudePct, instruments.crude),
        wti:            y.wti,
        wtiChangePct:   y.crudePct,
        brent:          y.brent,
        brentChangePct: y.brentPct,
      },
      copper: buildMCXData(copperQ, y.mcxCopper, y.copperPct, instruments.copper),
      natgas: buildMCXData(natgasQ, y.mcxNatGas, y.gasPct,    instruments.natgas),
      aluminium: { lme: 0, lmeChangePct: 0 },
    }
  } catch (err) {
    console.error('getPrices error:', err)
    return null
  }
}

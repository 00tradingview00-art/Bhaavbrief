/**
 * lib/kite.ts
 * Full Kite Connect v3 client.
 * Handles: auth, live quotes, instrument discovery, MCX front-month detection.
 */

import crypto from 'crypto'

const KITE_BASE   = 'https://api.kite.trade'
const KITE_V      = '3'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KiteQuote {
  instrument_token:  number
  timestamp:         string
  last_price:        number
  last_quantity:     number
  average_price:     number
  net_change:        number
  volume:            number
  buy_quantity:      number
  sell_quantity:     number
  oi:                number
  oi_day_high:       number
  oi_day_low:        number
  ohlc: {
    open:  number
    high:  number
    low:   number
    close: number
  }
  change: number  // % change from previous close
  // 5-level market depth — full quote mode only. Optional: not guaranteed
  // present for every segment/entitlement, MCX included — always read
  // defensively (depth?.buy?.[0]).
  depth?: {
    buy:  { price: number; quantity: number; orders: number }[]
    sell: { price: number; quantity: number; orders: number }[]
  }
}

export interface KiteBasketOrder {
  exchange:          string
  tradingsymbol:     string
  transaction_type:  'BUY' | 'SELL'
  variety:           string
  product:           string
  order_type:        string
  quantity:          number
  price:             number
  trigger_price:     number
}

export interface KiteBasketMargin {
  total:    number
  span:     number | null
  exposure: number | null
}

export interface InstrumentInfo {
  token:  number
  symbol: string
  expiry: string  // ISO date string, e.g. "2026-06-05" — empty string if unknown
}

export interface MCXInstrument {
  instrument_token: number
  exchange_token:   number
  tradingsymbol:    string
  name:             string
  last_price:       number
  expiry:           string
  strike:           number
  tick_size:        number
  lot_size:         number
  instrument_type:  string
  segment:          string
  exchange:         string
}

export interface MCXTokenMap {
  gold:     InstrumentInfo
  goldMini: InstrumentInfo
  silver:   InstrumentInfo
  crude:    InstrumentInfo
  copper:   InstrumentInfo
  natgas:   InstrumentInfo
  updatedAt: string
}

// ── KiteClient ────────────────────────────────────────────────────────────────

export class KiteClient {
  private apiKey:      string
  private accessToken: string

  constructor(apiKey: string, accessToken: string) {
    this.apiKey      = apiKey
    this.accessToken = accessToken
  }

  private headers() {
    return {
      'X-Kite-Version': KITE_V,
      'Authorization':  `token ${this.apiKey}:${this.accessToken}`,
      'Content-Type':   'application/x-www-form-urlencoded',
    }
  }

  // Exchange request_token for access_token
  static generateChecksum(apiKey: string, requestToken: string, apiSecret: string): string {
    return crypto
      .createHash('sha256')
      .update(apiKey + requestToken + apiSecret)
      .digest('hex')
  }

  static async exchangeToken(apiKey: string, requestToken: string, apiSecret: string) {
    const checksum = KiteClient.generateChecksum(apiKey, requestToken, apiSecret)
    const res = await fetch(`${KITE_BASE}/session/token`, {
      method: 'POST',
      headers: { 'X-Kite-Version': KITE_V, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }),
    })
    const data = await res.json()
    if (data.status !== 'success') throw new Error(data.message ?? 'Token exchange failed')
    return data.data as { access_token: string; user_id: string; login_time: string }
  }

  // ── Live Quotes ─────────────────────────────────────────────────────────────

  async getQuotes(instrumentTokens: number[]): Promise<Record<string, KiteQuote>> {
    if (!instrumentTokens.length) return {}
    const params = instrumentTokens.map(t => `i=${t}`).join('&')

    const res = await fetch(`${KITE_BASE}/quote?${params}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 403) throw new Error('Kite access token expired — run kite-morning-auth.js')
    if (!res.ok)           throw new Error(`Kite quote API: ${res.status}`)

    const data = await res.json()
    if (data.status !== 'success') throw new Error(data.message ?? 'Quote fetch failed')

    return data.data as Record<string, KiteQuote>
  }

  // Calculate % change from OHLC close
  static changePct(quote: KiteQuote): number {
    if (!quote.ohlc?.close || quote.ohlc.close === 0) return 0
    return ((quote.last_price - quote.ohlc.close) / quote.ohlc.close) * 100
  }

  // ── Basket Margin ─────────────────────────────────────────────────────────────
  // Real exchange-computed SPAN + exposure margin for a set of order legs, with
  // spread/hedge benefit already netted in (final.total) — not an approximation.
  // mode=compact strips the per-leg/charges breakdown we don't need.

  async basketMargin(orders: KiteBasketOrder[]): Promise<KiteBasketMargin> {
    if (!orders.length) throw new Error('No legs to price')

    const res = await fetch(`${KITE_BASE}/margins/basket?mode=compact`, {
      method: 'POST',
      headers: {
        'X-Kite-Version': KITE_V,
        'Authorization': `token ${this.apiKey}:${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orders),
      signal: AbortSignal.timeout(8000),
    })

    if (res.status === 403) throw new Error('Kite access token expired — run kite-morning-auth.js')
    if (!res.ok)            throw new Error(`Kite margin API: ${res.status}`)

    const data = await res.json()
    if (data.status !== 'success') throw new Error(data.message ?? 'Margin calculation failed')

    const final = data.data?.final
    if (!final || typeof final.total !== 'number') throw new Error('Unexpected margin response shape')

    return { total: final.total, span: final.span ?? null, exposure: final.exposure ?? null }
  }

  // ── Historical Data ──────────────────────────────────────────────────────────

  async getHistorical(
    token:    number,
    interval: 'day' | '60minute' | '30minute',
    from:     string,   // YYYY-MM-DD
    to:       string,   // YYYY-MM-DD
  ): Promise<Array<{ date: string; open: number; high: number; low: number; price: number; volume: number }>> {
    const params = new URLSearchParams({ from, to, continuous: '1', oi: '0' })
    const url = `${KITE_BASE}/instruments/historical/${token}/${interval}?${params}`

    const res = await fetch(url, {
      headers: this.headers(),
      signal:  AbortSignal.timeout(10000),
    })
    if (res.status === 403) throw new Error('Kite token expired')
    if (!res.ok)            throw new Error(`Kite historical: ${res.status}`)

    const data = await res.json()
    if (data.status !== 'success') throw new Error(data.message ?? 'Historical fetch failed')

    // candles: [timestamp, open, high, low, close, volume, oi]
    return (data.data.candles as [string, number, number, number, number, number][]).map(
      ([ts, open, high, low, close, volume]) => ({
        date:   ts.slice(0, 10),
        open, high, low,
        price:  close,
        volume,
      })
    )
  }

  // ── Instrument Discovery ─────────────────────────────────────────────────────

  async getMCXInstruments(): Promise<MCXInstrument[]> {
    const res = await fetch(`${KITE_BASE}/instruments/MCX`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Instruments fetch failed: ${res.status}`)

    const csv = await res.text()
    return KiteClient.parseInstrumentsCSV(csv)
  }

  static parseInstrumentsCSV(csv: string, typesFilter?: string[]): MCXInstrument[] {
    // Strip CRLF so last-column values don't carry \r
    const lines = csv.replace(/\r/g, '').split('\n').filter(Boolean)
    if (lines.length < 2) return []

    const header = lines[0].split(',').map(h => h.trim())
    const idx = (col: string) => header.indexOf(col)
    const str = (cols: string[], col: string) => (cols[idx(col)] ?? '').trim().replace(/^"|"$/g, '')

    return lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        instrument_token: parseInt(str(cols, 'instrument_token') || '0'),
        exchange_token:   parseInt(str(cols, 'exchange_token')   || '0'),
        tradingsymbol:    str(cols, 'tradingsymbol'),
        name:             str(cols, 'name'),
        last_price:       parseFloat(str(cols, 'last_price') || '0'),
        expiry:           str(cols, 'expiry'),
        strike:           parseFloat(str(cols, 'strike')     || '0'),
        tick_size:        parseFloat(str(cols, 'tick_size')  || '0'),
        lot_size:         parseInt(str(cols, 'lot_size')     || '0'),
        instrument_type:  str(cols, 'instrument_type'),
        segment:          str(cols, 'segment'),
        exchange:         str(cols, 'exchange'),
      }
    }).filter(i =>
      i.instrument_token > 0 &&
      (typesFilter ? typesFilter.includes(i.instrument_type) : i.instrument_type === 'FUT')
    )
  }

  // Returns all MCX instruments including CE and PE option contracts
  async getFullMCXInstruments(): Promise<MCXInstrument[]> {
    const res = await fetch(`${KITE_BASE}/instruments/MCX`, {
      headers: this.headers(),
      signal:  AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Instruments fetch failed: ${res.status}`)
    return KiteClient.parseInstrumentsCSV(await res.text(), ['FUT', 'CE', 'PE'])
  }

  // Find the front-month (nearest active) futures contract for a commodity
  static findFrontMonth(instruments: MCXInstrument[], commodityName: string): MCXInstrument | null {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const futures = instruments.filter(i =>
      i.name.toUpperCase() === commodityName.toUpperCase() &&
      i.instrument_type === 'FUT' &&
      i.expiry &&
      new Date(i.expiry) >= today
    )

    if (!futures.length) return null

    // Sort by expiry ascending — first is front month
    return futures.sort((a, b) =>
      new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
    )[0]
  }

  // Discover all MCX front-month tokens and cache to disk
  async discoverAndCacheTokens(): Promise<MCXTokenMap> {
    const instruments = await this.getMCXInstruments()

    const gold    = KiteClient.findFrontMonth(instruments, 'GOLD')
    const goldM   = KiteClient.findFrontMonth(instruments, 'GOLDM')
    const silver  = KiteClient.findFrontMonth(instruments, 'SILVER')
    const crude   = KiteClient.findFrontMonth(instruments, 'CRUDEOIL')
    const copper  = KiteClient.findFrontMonth(instruments, 'COPPER')
    const natgas  = KiteClient.findFrontMonth(instruments, 'NATURALGAS')

    if (!gold || !silver || !crude || !copper || !natgas) {
      throw new Error('Could not find front-month contracts — check instrument list')
    }

    console.log(`📋 Instrument tokens discovered:`)
    console.log(`   Gold (${gold.tradingsymbol}):    ${gold.instrument_token}`)
    console.log(`   Silver (${silver.tradingsymbol}):  ${silver.instrument_token}`)
    console.log(`   Crude (${crude.tradingsymbol}):   ${crude.instrument_token}`)
    console.log(`   Copper (${copper.tradingsymbol}):  ${copper.instrument_token}`)
    console.log(`   NatGas (${natgas.tradingsymbol}):  ${natgas.instrument_token}`)

    const tokenMap: MCXTokenMap = {
      gold:     { token: gold.instrument_token,                           symbol: gold.tradingsymbol,    expiry: gold.expiry    },
      goldMini: { token: goldM?.instrument_token ?? gold.instrument_token, symbol: goldM?.tradingsymbol ?? gold.tradingsymbol, expiry: goldM?.expiry ?? gold.expiry },
      silver:   { token: silver.instrument_token,                         symbol: silver.tradingsymbol,  expiry: silver.expiry  },
      crude:    { token: crude.instrument_token,                           symbol: crude.tradingsymbol,   expiry: crude.expiry   },
      copper:   { token: copper.instrument_token,                          symbol: copper.tradingsymbol,  expiry: copper.expiry  },
      natgas:   { token: natgas.instrument_token,                          symbol: natgas.tradingsymbol,  expiry: natgas.expiry  },
      updatedAt: new Date().toISOString(),
    }

    return tokenMap
  }
}

// ── Kite login URL helper ─────────────────────────────────────────────────────
export function getLoginUrl(apiKey: string): string {
  return `https://kite.trade/connect/login?api_key=${apiKey}&v=3`
}

// ── Cached instrument discovery ────────────────────────────────────────────────
// getFullMCXInstruments() re-fetches and re-parses the entire MCX instruments CSV
// (every commodity, every FUT+CE+PE contract) on every call. Which strikes/expiries/
// tokens exist changes rarely intraday — cache it.
//
// Plain in-memory cache, not Next's unstable_cache: the parsed payload is several
// MB (every commodity's FUT+CE+PE contracts), past unstable_cache's data-cache
// size ceiling, which made every cache-repopulate attempt throw instead of
// caching — taking down every caller (the options chain API, the ATM IV snapshot
// cron) whenever the hourly revalidate window expired, even though the
// underlying Kite fetch itself had already succeeded. An in-memory cache has no
// serialization/size limit to hit, and still avoids re-fetching the CSV on every
// request within the same warm serverless instance.
let cachedInstruments: MCXInstrument[] | null = null
let cachedInstrumentsAt = 0
const INSTRUMENTS_CACHE_TTL_MS = 3600_000

export async function getFullMCXInstrumentsCached(): Promise<MCXInstrument[]> {
  if (cachedInstruments && Date.now() - cachedInstrumentsAt < INSTRUMENTS_CACHE_TTL_MS) {
    return cachedInstruments
  }
  const apiKey      = process.env.KITE_API_KEY
  const accessToken = process.env.KITE_ACCESS_TOKEN
  if (!apiKey || !accessToken) throw new Error('Kite credentials not configured')
  const instruments = await new KiteClient(apiKey, accessToken).getFullMCXInstruments()
  cachedInstruments   = instruments
  cachedInstrumentsAt = Date.now()
  return instruments
}

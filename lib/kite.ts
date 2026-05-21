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
  net_change:        number
  volume:            number
  buy_quantity:      number
  sell_quantity:     number
  ohlc: {
    open:  number
    high:  number
    low:   number
    close: number
  }
  change: number  // % change from previous close
}

export interface MCXInstrument {
  instrument_token: number
  exchange_token:   number
  tradingsymbol:    string
  name:             string
  last_price:       number
  expiry:           string
  tick_size:        number
  lot_size:         number
  instrument_type:  string
  segment:          string
  exchange:         string
}

export interface MCXTokenMap {
  gold:    number
  silver:  number
  crude:   number
  copper:  number
  natgas:  number
  goldMini:number
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

  static parseInstrumentsCSV(csv: string): MCXInstrument[] {
    const lines = csv.split('\n').filter(Boolean)
    if (lines.length < 2) return []

    const header = lines[0].split(',')
    const idx = (col: string) => header.indexOf(col)

    return lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        instrument_token: parseInt(cols[idx('instrument_token')] ?? '0'),
        exchange_token:   parseInt(cols[idx('exchange_token')]   ?? '0'),
        tradingsymbol:    cols[idx('tradingsymbol')]  ?? '',
        name:             cols[idx('name')]            ?? '',
        last_price:       parseFloat(cols[idx('last_price')] ?? '0'),
        expiry:           cols[idx('expiry')]          ?? '',
        tick_size:        parseFloat(cols[idx('tick_size')] ?? '0'),
        lot_size:         parseInt(cols[idx('lot_size')]    ?? '0'),
        instrument_type:  cols[idx('instrument_type')] ?? '',
        segment:          cols[idx('segment')]         ?? '',
        exchange:         cols[idx('exchange')]        ?? '',
      }
    }).filter(i => i.instrument_token > 0 && i.instrument_type === 'FUT')
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
      gold:     gold.instrument_token,
      goldMini: goldM?.instrument_token ?? gold.instrument_token,
      silver:   silver.instrument_token,
      crude:    crude.instrument_token,
      copper:   copper.instrument_token,
      natgas:   natgas.instrument_token,
      updatedAt: new Date().toISOString(),
    }

    return tokenMap
  }
}

// ── Load cached instrument tokens ─────────────────────────────────────────────
export function loadCachedTokens() { return null }

// ── Kite login URL helper ─────────────────────────────────────────────────────
export function getLoginUrl(apiKey: string): string {
  return `https://kite.trade/connect/login?api_key=${apiKey}&v=3`
}

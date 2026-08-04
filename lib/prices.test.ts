import { describe, test, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import type { KiteQuote, InstrumentInfo } from './kite'
import { deriveFromYahoo, buildMCXData, buildForexData, loadFromSnapshot } from './prices'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeQuote(overrides: Partial<KiteQuote> = {}): KiteQuote {
  return {
    instrument_token: 1,
    timestamp:         '2026-07-17T09:30:00',
    last_price:        88200,
    last_quantity:     0,
    average_price:     88100,
    net_change:        500,
    volume:            1200,
    buy_quantity:      0,
    sell_quantity:     0,
    oi:                4500,
    oi_day_high:       0,
    oi_day_low:        0,
    ohlc:              { open: 87800, high: 88300, low: 87700, close: 87700 },
    change:            0.57,
    ...overrides,
  }
}

const goldInfo: InstrumentInfo = { token: 1, symbol: 'GOLD', expiry: '2026-08-05' }

describe('buildMCXData', () => {
  test('maps a live quote directly — mcx is the Kite LTP, not a derived value', () => {
    const q = makeQuote()
    const d = buildMCXData(q, 0, 0, goldInfo)
    expect(d.mcx).toBe(88200)
    expect(d.mcxPrevClose).toBe(87700)
    expect(d.mcxChangePct).toBeCloseTo(((88200 - 87700) / 87700) * 100, 5)
    expect(d.mcxChange).toBe(500)
    expect(d.mcxVolume).toBe(1200)
    expect(d.mcxOI).toBe(4500)
    expect(d.mcxSymbol).toBe('GOLD')
    expect(d.mcxExpiry).toBe('2026-08-05')
  })

  test('falls back to the cached price when Kite has no quote (null)', () => {
    const d = buildMCXData(null, 87500, 0.32, goldInfo)
    expect(d.mcx).toBe(87500)
    expect(d.mcxChangePct).toBe(0.32)
    expect(d.mcxChange).toBe(0)
    expect(d.mcxVolume).toBe(0)
    expect(d.mcxOI).toBe(0)
  })

  test('falls back to 0 when Kite is down and no cache exists — never fabricates a price', () => {
    const d = buildMCXData(null, 0, 0, goldInfo)
    expect(d.mcx).toBe(0)
    expect(d.mcxChangePct).toBe(0)
  })

  test('a quote with a non-positive last_price is treated as not live, using its own prev close over the fallback', () => {
    const q = makeQuote({ last_price: 0, ohlc: { open: 0, high: 0, low: 0, close: 87700 } })
    const d = buildMCXData(q, 12345, 0, goldInfo)
    expect(d.mcx).toBe(87700) // own ohlc.close wins over the unrelated fallback price
    expect(d.mcxVolume).toBe(0) // still not "live" — OHLC/volume/OI stay zeroed
  })
})

describe('buildForexData', () => {
  const usdinrInfo: InstrumentInfo = { token: 2, symbol: 'USDINR', expiry: '' }

  test('maps a live quote directly', () => {
    const q = makeQuote({ last_price: 87.42, ohlc: { open: 87.1, high: 87.5, low: 87.0, close: 87.1 }, volume: 0 })
    const d = buildForexData(q, usdinrInfo)
    expect(d.ltp).toBe(87.42)
    expect(d.prevClose).toBe(87.1)
    expect(d.symbol).toBe('USDINR')
  })

  test('zeroes everything except symbol/expiry when there is no live quote', () => {
    const d = buildForexData(null, usdinrInfo)
    expect(d.ltp).toBe(0)
    expect(d.changePct).toBe(0)
    expect(d.prevClose).toBe(0)
    expect(d.symbol).toBe('USDINR')
  })
})

describe('deriveFromYahoo', () => {
  const yahoo = {
    'USDINR=X': { regularMarketPrice: 87.5, regularMarketChangePercent: 0.12 },
    'GC=F':     { regularMarketPrice: 2450, regularMarketChangePercent: 0.41 },
    'SI=F':     { regularMarketPrice: 29,   regularMarketChangePercent: 0.69 },
    'CL=F':     { regularMarketPrice: 78,   regularMarketChangePercent: 0.65 },
    'BZ=F':     { regularMarketPrice: 82,   regularMarketChangePercent: 0.61 },
    'HG=F':     { regularMarketPrice: 4.1,  regularMarketChangePercent: 0.2  },
    'NG=F':     { regularMarketPrice: 2.8,  regularMarketChangePercent: 1.82 },
  }

  test('prefers the Frankfurter fallback rate over Yahoo FX when both are in the plausible range', () => {
    const d = deriveFromYahoo(yahoo, 87.9)
    expect(d.usdinr).toBe(87.9)
  })

  test('falls back to Yahoo FX when the Frankfurter rate is out of the plausible ₹82–₹110 range', () => {
    const d = deriveFromYahoo(yahoo, 0) // 0 is out of range
    expect(d.usdinr).toBe(87.5)
  })

  test('resolves to 0 when both sources are implausible', () => {
    const badYahoo = { ...yahoo, 'USDINR=X': { regularMarketPrice: 5, regularMarketChangePercent: 0 } }
    const d = deriveFromYahoo(badYahoo, 200)
    expect(d.usdinr).toBe(0)
  })

  test('derives comex/wti/brent/copper/henryHub straight from the Yahoo map', () => {
    const d = deriveFromYahoo(yahoo, 87.5)
    expect(d.comexGold).toBe(2450)
    expect(d.comexSilver).toBe(29)
    expect(d.wti).toBe(78)
    expect(d.brent).toBe(82)
    expect(d.comexCopper).toBe(4.1)
    expect(d.henryHub).toBe(2.8)
    expect(d.goldPct).toBe(0.41)
    expect(d.crudePct).toBe(0.65)
  })

  test('missing Yahoo keys default to 0 instead of throwing', () => {
    const d = deriveFromYahoo({})
    expect(d.comexGold).toBe(0)
    expect(d.wti).toBe(0)
    expect(d.usdinr).toBe(0)
  })
})

describe('loadFromSnapshot', () => {
  const freshSnapshot = {
    generatedAt: new Date().toISOString(),
    source: 'kite',
    instruments: {
      MCX_GOLD:   { price: 88200, prevClose: 87700, changePct: 0.57 },
      MCX_SILVER: { price: 102000, prevClose: 101000, changePct: 0.99 },
      MCX_CRUDE:  { price: 6200, prevClose: 6150, changePct: 0.81 },
      MCX_COPPER: { price: 850, prevClose: 845, changePct: 0.59 },
      MCX_NATGAS: { price: 280, prevClose: 275, changePct: 1.82 },
      USDINR:     { price: 87.5, prevClose: 87.3, changePct: 0.23 },
      COMEX_GOLD: { price: 2450, prevClose: 2440, changePct: 0.41 },
    },
  }

  test('returns a PriceData object built from a fresh (≤90min) snapshot', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(freshSnapshot))
    const d = loadFromSnapshot()
    expect(d).not.toBeNull()
    expect(d!.gold.mcx).toBe(88200)
    expect(d!.gold.mcxChangePct).toBe(0.57)
    expect(d!.crude.mcx).toBe(6200)
  })

  test('returns null when the snapshot is older than 90 minutes — caller should fall back to a live fetch', () => {
    const stale = { ...freshSnapshot, generatedAt: new Date(Date.now() - 91 * 60 * 1000).toISOString() }
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(stale))
    expect(loadFromSnapshot()).toBeNull()
  })

  test('returns null when the snapshot file does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    expect(loadFromSnapshot()).toBeNull()
  })

  test('returns null instead of throwing on malformed JSON', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readFileSync').mockReturnValue('{not valid json')
    expect(loadFromSnapshot()).toBeNull()
  })
})

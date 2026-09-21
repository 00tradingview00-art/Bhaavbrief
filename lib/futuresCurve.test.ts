import { describe, test, expect, vi, beforeEach } from 'vitest'

// Wiring test for getFuturesCurve with Kite mocked: which instruments it picks
// up, how quote depth maps onto the live-price check, and that a dead month
// comes back as null rather than a number. The live-price rules themselves are
// pinned in lib/spreads.test.ts.

const getQuotes = vi.fn()
const instruments = vi.fn()

vi.mock('@/lib/kite', () => ({
  KiteClient: class { getQuotes = getQuotes },
  getFullMCXInstrumentsCached: () => instruments(),
}))

import { getFuturesCurve } from './options'

const fut = (name: string, tradingsymbol: string, token: number, expiry: string) => ({
  instrument_token: token, exchange_token: token, tradingsymbol, name, last_price: 0,
  expiry, strike: 0, tick_size: 1, lot_size: 1, instrument_type: 'FUT', segment: 'MCX-FUT', exchange: 'MCX',
})

const quote = (last_price: number, volume: number, depth?: { bid: number; ask: number }) => ({
  last_price, volume,
  ...(depth ? { depth: { buy: [{ price: depth.bid, quantity: 1, orders: 1 }], sell: [{ price: depth.ask, quantity: 1, orders: 1 }] } } : {}),
})

// Far enough ahead that "expiry >= today" holds whenever this runs.
const M1 = '2099-01-05', M2 = '2099-02-05', M3 = '2099-03-05'

beforeEach(() => {
  vi.stubEnv('KITE_API_KEY', 'k')
  vi.stubEnv('KITE_ACCESS_TOKEN', 't')
  getQuotes.mockReset()
  instruments.mockReset()
})

describe('getFuturesCurve', () => {
  test('returns every listed month with spreads far - near, sorted by expiry', async () => {
    instruments.mockResolvedValue([
      fut('GOLD', 'GOLD99FEBFUT', 2, M2),
      fut('GOLD', 'GOLD99JANFUT', 1, M1),
      fut('GOLDM', 'GOLDM99JANFUT', 9, M1), // a different commodity — must not leak in
    ])
    getQuotes.mockResolvedValue({
      '1': quote(1000, 50, { bid: 999, ask: 1001 }),
      '2': quote(1012, 20, { bid: 1011, ask: 1013 }),
    })

    const r = await getFuturesCurve('GOLD')
    expect(r.curve.map(c => c.expiry)).toEqual([M1, M2])
    expect(r.spreads).toHaveLength(1)
    expect(r.spreads[0].spread).toBe(12)
    expect(r.lotSize).toBe(100)
    expect(getQuotes).toHaveBeenCalledWith([1, 2])
  })

  test('a month that never traded this session is unavailable, and so is its spread', async () => {
    instruments.mockResolvedValue([
      fut('SILVER', 'S1', 1, M1), fut('SILVER', 'S2', 2, M2), fut('SILVER', 'S3', 3, M3),
    ])
    getQuotes.mockResolvedValue({
      '1': quote(240000, 500, { bid: 239990, ask: 240010 }),
      '2': quote(241000, 0,   { bid: 0, ask: 0 }),          // stale leftover print
      '3': quote(242000, 10,  { bid: 241990, ask: 242010 }),
    })

    const r = await getFuturesCurve('SILVER')
    expect(r.curve.map(c => c.price)).toEqual([240000, null, 242000])
    expect(r.spreads.map(s => s.spread)).toEqual([null, null])
  })

  test('a token missing from the quote response is unavailable, not zero', async () => {
    instruments.mockResolvedValue([fut('COPPER', 'C1', 1, M1), fut('COPPER', 'C2', 2, M2)])
    getQuotes.mockResolvedValue({ '1': quote(900, 5) })

    const r = await getFuturesCurve('COPPER')
    expect(r.curve.map(c => c.price)).toEqual([900, null])
  })

  test('futures-only Electricity resolves through its exchange-side name', async () => {
    instruments.mockResolvedValue([
      fut('ELECDMBL', 'ELECDMBL99JANFUT', 1, M1),
      fut('ELECDMBL', 'ELECDMBL99FEBFUT', 2, M2),
    ])
    getQuotes.mockResolvedValue({ '1': quote(7553, 3), '2': quote(7600, 2) })

    const r = await getFuturesCurve('ELECTRICITY')
    expect(r.label).toBe('Electricity')
    expect(r.lotSize).toBe(50)
    expect(r.spreads[0].spread).toBe(47)
  })

  test('unknown instrument and missing contracts throw', async () => {
    await expect(getFuturesCurve('PLATINUM')).rejects.toThrow(/Invalid instrument/)
    instruments.mockResolvedValue([])
    await expect(getFuturesCurve('GOLD')).rejects.toThrow(/No futures contracts found/)
  })
})

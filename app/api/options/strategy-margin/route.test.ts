import { describe, test, expect, vi, beforeEach } from 'vitest'

// Pins the leg -> contract resolution in the margin route with Kite, Clerk and
// the Pro check mocked: futures legs may now name their own expiry (calendar
// spreads), and a leg with no expiry must still resolve to the nearest month.

const basketMargin = vi.fn()
const instruments = vi.fn()
const isPro = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({ auth: async () => ({ userId: 'user_1' }) }))
vi.mock('@/lib/subscription', () => ({
  isProUser: (...a: unknown[]) => isPro(...a),
  hasInternalAccess: () => false,
}))
vi.mock('@/lib/kite', () => ({
  KiteClient: class { basketMargin = basketMargin },
  getFullMCXInstrumentsCached: () => instruments(),
}))

import { POST } from './route'

const fut = (name: string, tradingsymbol: string, expiry: string) => ({
  instrument_token: 1, exchange_token: 1, tradingsymbol, name, last_price: 0,
  expiry, strike: 0, tick_size: 1, lot_size: 1, instrument_type: 'FUT', segment: 'MCX-FUT', exchange: 'MCX',
})

const M1 = '2099-01-05', M2 = '2099-02-05', M3 = '2099-03-05'

const call = (body: unknown) =>
  POST(new Request('http://x/api/options/strategy-margin', { method: 'POST', body: JSON.stringify(body) }))

const symbolsSent = () => (basketMargin.mock.calls[0][0] as { tradingsymbol: string; transaction_type: string }[])
  .map(o => `${o.transaction_type}:${o.tradingsymbol}`)

beforeEach(() => {
  vi.stubEnv('KITE_API_KEY', 'k')
  vi.stubEnv('KITE_ACCESS_TOKEN', 't')
  basketMargin.mockReset().mockResolvedValue({ total: 1234, span: 1000, exposure: 234 })
  instruments.mockReset().mockResolvedValue([
    fut('GOLD', 'GOLD_M3', M3), fut('GOLD', 'GOLD_M1', M1), fut('GOLD', 'GOLD_M2', M2),
    fut('ELECDMBL', 'ELEC_M1', M1), fut('ELECDMBL', 'ELEC_M2', M2),
  ])
  isPro.mockReset().mockResolvedValue(true)
})

describe('strategy-margin — futures legs with their own expiry', () => {
  test('a calendar spread resolves each leg to the contract for its expiry', async () => {
    const res = await call({
      instrument: 'GOLD', expiry: M1,
      legs: [
        { strike: 0, type: 'FUT', action: 'BUY',  qty: 1, expiry: M3 },
        { strike: 0, type: 'FUT', action: 'SELL', qty: 1, expiry: M1 },
      ],
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ total: 1234, span: 1000, exposure: 234 })
    expect(symbolsSent()).toEqual(['BUY:GOLD_M3', 'SELL:GOLD_M1'])
  })

  test('a futures leg with no expiry still resolves to the nearest month (unchanged behaviour)', async () => {
    const res = await call({ instrument: 'GOLD', expiry: M2, legs: [{ strike: 0, type: 'FUT', action: 'BUY', qty: 2 }] })
    expect(res.status).toBe(200)
    expect(symbolsSent()).toEqual(['BUY:GOLD_M1'])
  })

  test('a futures expiry that is not listed is rejected rather than falling back', async () => {
    const res = await call({
      instrument: 'GOLD', expiry: M1,
      legs: [{ strike: 0, type: 'FUT', action: 'BUY', qty: 1, expiry: '2099-09-09' }],
    })
    expect(res.status).toBe(400)
    expect(basketMargin).not.toHaveBeenCalled()
  })

  test('Electricity (futures only) can be margined through its exchange-side name', async () => {
    const res = await call({
      instrument: 'ELECTRICITY', expiry: M1,
      legs: [
        { strike: 0, type: 'FUT', action: 'BUY',  qty: 1, expiry: M2 },
        { strike: 0, type: 'FUT', action: 'SELL', qty: 1, expiry: M1 },
      ],
    })
    expect(res.status).toBe(200)
    expect(symbolsSent()).toEqual(['BUY:ELEC_M2', 'SELL:ELEC_M1'])
  })

  test('a non-string expiry on a leg is an invalid leg', async () => {
    const res = await call({
      instrument: 'GOLD', expiry: M1,
      legs: [{ strike: 0, type: 'FUT', action: 'BUY', qty: 1, expiry: 5 }],
    })
    expect(res.status).toBe(400)
  })

  test('still Pro-only', async () => {
    isPro.mockResolvedValue(false)
    const res = await call({ instrument: 'GOLD', expiry: M1, legs: [{ strike: 0, type: 'FUT', action: 'BUY', qty: 1 }] })
    expect(res.status).toBe(403)
    expect(basketMargin).not.toHaveBeenCalled()
  })

  test('an unknown instrument is still rejected', async () => {
    const res = await call({ instrument: 'PLATINUM', expiry: M1, legs: [{ strike: 0, type: 'FUT', action: 'BUY', qty: 1 }] })
    expect(res.status).toBe(400)
  })
})

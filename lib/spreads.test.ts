import { describe, test, expect } from 'vitest'
import { buildCurve, adjacentSpreads, spreadBetween, spreadPnl, hasLiveFuturesPrice, type CurveQuote } from './spreads'

const q = (expiry: string, price: number | null): CurveQuote => ({ expiry, tradingsymbol: `X${expiry}`, price })

describe('hasLiveFuturesPrice', () => {
  const live = { price: 153500, volume: 120, bid: 153490, ask: 153510 }

  test('traded today with a two-sided book is live', () => {
    expect(hasLiveFuturesPrice(live)).toBe(true)
  })

  test('no depth from the feed at all does not disqualify a traded contract', () => {
    expect(hasLiveFuturesPrice({ ...live, bid: null, ask: null })).toBe(true)
  })

  test('a one-sided book is still live (thin far months often are)', () => {
    expect(hasLiveFuturesPrice({ ...live, ask: 0 })).toBe(true)
    expect(hasLiveFuturesPrice({ ...live, bid: 0 })).toBe(true)
  })

  test('no volume this session means the price may be a leftover print', () => {
    expect(hasLiveFuturesPrice({ ...live, volume: 0 })).toBe(false)
  })

  test('depth present but empty on both sides is not live', () => {
    expect(hasLiveFuturesPrice({ ...live, bid: 0, ask: 0 })).toBe(false)
  })

  test('crossed book is rejected', () => {
    expect(hasLiveFuturesPrice({ ...live, bid: 153600, ask: 153500 })).toBe(false)
  })

  test('zero, negative and non-finite values are rejected', () => {
    expect(hasLiveFuturesPrice({ ...live, price: 0 })).toBe(false)
    expect(hasLiveFuturesPrice({ ...live, price: -1 })).toBe(false)
    expect(hasLiveFuturesPrice({ ...live, price: NaN })).toBe(false)
    expect(hasLiveFuturesPrice({ ...live, volume: NaN })).toBe(false)
    expect(hasLiveFuturesPrice({ ...live, bid: NaN })).toBe(false)
  })
})

describe('buildCurve', () => {
  test('sorts by expiry regardless of input order', () => {
    const curve = buildCurve([q('2026-12-04', 3), q('2026-10-05', 1), q('2026-11-05', 2)])
    expect(curve.map(c => c.expiry)).toEqual(['2026-10-05', '2026-11-05', '2026-12-04'])
  })

  test('zero, negative, NaN and null prices become null, never a number', () => {
    const curve = buildCurve([q('2026-10-05', 0), q('2026-11-05', -5), q('2026-12-04', NaN), q('2027-01-05', null)])
    expect(curve.every(c => c.price === null)).toBe(true)
  })

  test('keeps a valid price untouched and does not mutate the input', () => {
    const input = [q('2026-10-05', 153500)]
    const curve = buildCurve(input)
    expect(curve[0].price).toBe(153500)
    expect(curve[0]).not.toBe(input[0])
  })
})

describe('spreadBetween / adjacentSpreads', () => {
  test('spread is far minus near, with percentage of the near price', () => {
    const [row] = adjacentSpreads(buildCurve([q('2026-10-05', 1000), q('2026-11-05', 1010)]))
    expect(row.spread).toBe(10)
    expect(row.spreadPct).toBeCloseTo(1, 10)
    expect(row.structure).toBe('far-higher')
  })

  test('near month above far month is labelled near-higher with a negative spread', () => {
    const [row] = adjacentSpreads(buildCurve([q('2026-10-05', 1010), q('2026-11-05', 1000)]))
    expect(row.spread).toBe(-10)
    expect(row.structure).toBe('near-higher')
  })

  test('equal prices are flat', () => {
    const [row] = adjacentSpreads(buildCurve([q('2026-10-05', 1000), q('2026-11-05', 1000)]))
    expect(row.spread).toBe(0)
    expect(row.structure).toBe('flat')
  })

  test('a leg with no live quote gives an unavailable spread, not a guess', () => {
    const rows = adjacentSpreads(buildCurve([q('2026-10-05', 1000), q('2026-11-05', null), q('2026-12-04', 1020)]))
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(r.spread).toBeNull()
      expect(r.spreadPct).toBeNull()
      expect(r.structure).toBeNull()
    }
    // the priced leg is still reported so the UI can show it
    expect(rows[0].near).toBe(1000)
    expect(rows[0].far).toBeNull()
  })

  test('one listed month has no adjacent pair', () => {
    expect(adjacentSpreads(buildCurve([q('2026-10-05', 1000)]))).toEqual([])
  })

  test('spreadBetween works for non-adjacent months (user-chosen pair)', () => {
    const curve = buildCurve([q('2026-10-05', 1000), q('2026-11-05', 1010), q('2026-12-04', 1025)])
    const row = spreadBetween(curve[0], curve[2])
    expect(row.spread).toBe(25)
    expect(row.nearExpiry).toBe('2026-10-05')
    expect(row.farExpiry).toBe('2026-12-04')
  })
})

describe('spreadPnl', () => {
  const base = { lots: 1, lotSize: 100, entrySpread: 10 }

  test('BUY spread gains when the spread widens', () => {
    expect(spreadPnl({ ...base, side: 'BUY', exitSpread: 15 })).toBe(500)
  })

  test('BUY spread loses when the spread narrows', () => {
    expect(spreadPnl({ ...base, side: 'BUY', exitSpread: 4 })).toBe(-600)
  })

  test('SELL spread is the mirror image of BUY', () => {
    expect(spreadPnl({ ...base, side: 'SELL', exitSpread: 15 })).toBe(-500)
    expect(spreadPnl({ ...base, side: 'SELL', exitSpread: 4 })).toBe(600)
  })

  test('no change in spread is zero P&L for either side', () => {
    expect(spreadPnl({ ...base, side: 'BUY', exitSpread: 10 })).toBe(0)
    expect(Math.abs(spreadPnl({ ...base, side: 'SELL', exitSpread: 10 })!)).toBe(0)
  })

  test('scales with lots and lot size (Electricity lot is 50)', () => {
    expect(spreadPnl({ side: 'BUY', lots: 3, lotSize: 50, entrySpread: 10, exitSpread: 12 })).toBe(300)
  })

  test('works across a negative-to-positive spread move', () => {
    expect(spreadPnl({ side: 'BUY', lots: 1, lotSize: 1250, entrySpread: -2, exitSpread: 1 })).toBe(3750)
  })

  test('non-finite input returns null instead of NaN', () => {
    expect(spreadPnl({ ...base, side: 'BUY', exitSpread: NaN })).toBeNull()
    expect(spreadPnl({ ...base, side: 'BUY', exitSpread: Infinity })).toBeNull()
    expect(spreadPnl({ side: 'BUY', lots: NaN, lotSize: 100, entrySpread: 1, exitSpread: 2 })).toBeNull()
  })
})

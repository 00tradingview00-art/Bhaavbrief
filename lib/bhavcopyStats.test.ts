import { describe, it, expect } from 'vitest'
import type { BhavRow, ParsedBhavcopy } from './bhavcopyParse'
import { summariseBhavcopy, filterContracts } from './bhavcopyStats'

// Synthetic data only — this repo is public and the exchange's data must not be committed.

const base: BhavRow = {
  instrument: 'FUTCOM', symbol: 'AAA', expiry: '30SEP2026', expiryISO: '2026-09-30',
  optionType: null, strike: null, open: null, high: null, low: null,
  close: 100, prevClose: 100, volumeLots: 0, volumeQty: 0, unit: 'KGS', valueLacs: 0, oiLots: 0,
}
const row = (over: Partial<BhavRow>): BhavRow => ({ ...base, ...over })
const parsed = (rows: BhavRow[]): ParsedBhavcopy => ({ date: '2026-09-18', rows })

describe('summariseBhavcopy — futures', () => {
  const rows = [
    row({ expiry: '30OCT2026', expiryISO: '2026-10-30', close: 105, prevClose: 105, oiLots: 40, valueLacs: 2 }),
    row({ expiry: '30SEP2026', expiryISO: '2026-09-30', close: 102, prevClose: 100, volumeLots: 8, oiLots: 60, valueLacs: 3.5 }),
    row({ symbol: 'BBB', unit: 'BBL', close: 50, prevClose: 0, oiLots: 5, valueLacs: 1 }),
  ]
  const s = summariseBhavcopy(parsed(rows))

  it('takes the earliest listed expiry as the near contract, whatever the row order', () => {
    const a = s.futures.find(f => f.symbol === 'AAA')!
    expect(a.nearExpiry).toBe('30SEP2026')
    expect(a.close).toBe(102)
    expect(a.prevClose).toBe(100)
    expect(a.changePct).toBe(2)
    expect(a.volumeLots).toBe(8)
  })

  it('sums open interest and value across every listed expiry of one symbol', () => {
    const a = s.futures.find(f => f.symbol === 'AAA')!
    expect(a.totalOiLots).toBe(100)
    expect(a.valueLacs).toBe(5.5)
  })

  it('leaves the change null when the previous close is not positive, instead of dividing by zero', () => {
    expect(s.futures.find(f => f.symbol === 'BBB')!.changePct).toBeNull()
  })

  it('orders by value, and reports contract counts', () => {
    expect(s.futures.map(f => f.symbol)).toEqual(['AAA', 'BBB'])
    expect(s.totalContracts).toBe(3)
    expect(s.activeContracts).toBe(3)
  })

  it('does not report a cross-contract value total (option and futures values are not the same kind of figure)', () => {
    expect(s).not.toHaveProperty('totalValueLacs')
  })
})

describe('summariseBhavcopy — options', () => {
  const opt = (optionType: 'CE' | 'PE', strike: number, oiLots: number, over: Partial<BhavRow> = {}) =>
    row({ instrument: 'OPTFUT', expiry: '25SEP2026', expiryISO: '2026-09-25', optionType, strike, oiLots, ...over })

  it('computes PCR (put OI / call OI) and max pain by hand-checked values', () => {
    // Call OI 10 at 100, put OI 5 at 120. Writers' total loss if settled at:
    //   100 -> 5 * (120-100) = 100;  110 -> 10*10 + 5*10 = 150;  120 -> 10 * 20 = 200. Minimum at 100.
    const s = summariseBhavcopy(parsed([opt('CE', 100, 10), opt('PE', 120, 5), opt('CE', 110, 0), opt('PE', 110, 0)]))
    expect(s.options).toHaveLength(1)
    expect(s.options[0]).toMatchObject({ symbol: 'AAA', expiry: '25SEP2026', ceOi: 10, peOi: 5, pcr: 0.5, maxPain: 100 })
  })

  it('has no PCR when there is no call open interest', () => {
    const s = summariseBhavcopy(parsed([opt('PE', 120, 5)]))
    expect(s.options[0].pcr).toBeNull()
  })

  it('skips an expiry with no open interest and no traded value', () => {
    const s = summariseBhavcopy(parsed([opt('CE', 100, 0), opt('PE', 100, 0)]))
    expect(s.options).toHaveLength(0)
  })

  it('keeps an expiry that traded but has no open interest, with no max pain', () => {
    const s = summariseBhavcopy(parsed([opt('CE', 100, 0, { valueLacs: 1.5, volumeLots: 3 })]))
    expect(s.options).toHaveLength(1)
    expect(s.options[0].maxPain).toBeNull()
    expect(s.options[0].ceOi).toBe(0)
  })

  it('separates expiries and orders by symbol then expiry', () => {
    const later = opt('CE', 100, 4, { expiry: '23OCT2026', expiryISO: '2026-10-23' })
    const s = summariseBhavcopy(parsed([later, opt('CE', 100, 6), opt('CE', 100, 1, { symbol: 'ZZZ' })]))
    expect(s.options.map(o => `${o.symbol}:${o.expiry}`)).toEqual(['AAA:25SEP2026', 'AAA:23OCT2026', 'ZZZ:25SEP2026'])
  })
})

describe('filterContracts', () => {
  const rows = [
    row({ symbol: 'AAA', valueLacs: 5, oiLots: 1 }),
    row({ symbol: 'AAA', expiry: '30OCT2026', expiryISO: '2026-10-30' }), // no volume, no OI
    row({ symbol: 'BBB', instrument: 'OPTFUT', optionType: 'CE', strike: 250, valueLacs: 9, oiLots: 3 }),
    row({ symbol: 'BBB', instrument: 'OPTFUT', optionType: 'PE', strike: 240, valueLacs: 2, oiLots: 3 }),
  ]

  it('hides contracts with no volume and no open interest by default, and shows them on request', () => {
    expect(filterContracts(rows, {})).toHaveLength(3)
    expect(filterContracts(rows, { includeInactive: true })).toHaveLength(4)
  })

  it('sorts by volume in lots by default, highest first, and by any other key on request', () => {
    const r = [
      row({ symbol: 'A', volumeLots: 5, oiLots: 1, valueLacs: 900 }),
      row({ symbol: 'B', volumeLots: 50, oiLots: 1, valueLacs: 1 }),
      row({ symbol: 'C', volumeLots: 20, oiLots: 99, valueLacs: 5 }),
    ]
    expect(filterContracts(r, {}).map(x => x.symbol)).toEqual(['B', 'C', 'A'])
    expect(filterContracts(r, { sortBy: 'valueLacs' }).map(x => x.symbol)).toEqual(['A', 'C', 'B'])
    // A and B tie on open interest; the tiebreak is then volume, where B (50) beats A (5).
    expect(filterContracts(r, { sortBy: 'oiLots' }).map(x => x.symbol)).toEqual(['C', 'B', 'A'])
  })

  it('filters by symbol, kind and expiry', () => {
    expect(filterContracts(rows, { symbol: 'BBB' })).toHaveLength(2)
    expect(filterContracts(rows, { kind: 'FUT' })).toHaveLength(1)
    expect(filterContracts(rows, { kind: 'OPT' })).toHaveLength(2)
    expect(filterContracts(rows, { includeInactive: true, expiry: '30OCT2026' })).toHaveLength(1)
  })

  it('searches symbol, expiry and strike case-insensitively', () => {
    expect(filterContracts(rows, { query: 'bbb' })).toHaveLength(2)
    expect(filterContracts(rows, { query: '250' })).toHaveLength(1)
    expect(filterContracts(rows, { query: 'nothing' })).toHaveLength(0)
  })
})

import { describe, it, expect } from 'vitest'
import { validateSnapshot } from './snapshotSchema.mjs'

function goodInstrument(price, overrides = {}) {
  return { price, prevClose: price * 0.99, changePct: 1, unit: 'INR/10g', ...overrides }
}

function baseSnapshot(overrides = {}) {
  return {
    generatedAt: '2026-07-18T00:00:00.000Z',
    generatedAtIST: '2026-07-18 05:30 IST',
    source: 'kite+yahoo',
    instruments: {
      MCX_GOLD: goodInstrument(141006),
      USDINR: goodInstrument(88, { unit: 'INR' }),
    },
    ...overrides,
  }
}

describe('validateSnapshot', () => {
  it('passes a well-formed, in-range snapshot', () => {
    const { valid, errors } = validateSnapshot(baseSnapshot())
    expect(valid).toBe(true)
    expect(errors).toEqual([])
  })

  it('fails when a required field is missing', () => {
    const bad = baseSnapshot()
    delete bad.generatedAt
    const { valid, errors } = validateSnapshot(bad)
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('generatedAt'))).toBe(true)
  })

  it('fails when an instrument price is a string instead of a number', () => {
    const bad = baseSnapshot()
    bad.instruments.MCX_GOLD.price = '141006'
    const { valid } = validateSnapshot(bad)
    expect(valid).toBe(false)
  })

  it('flags a price far outside the plausible range (decimal-shift / unit-confusion signature)', () => {
    const bad = baseSnapshot()
    bad.instruments.MCX_GOLD = goodInstrument(1410060) // 10x real value
    const { valid, errors } = validateSnapshot(bad)
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('MCX_GOLD') && e.includes('range'))).toBe(true)
  })

  it('does not flag an out-of-range price when the instrument is marked stale (carried-forward value)', () => {
    const snap = baseSnapshot()
    snap.instruments.MCX_GOLD = goodInstrument(1410060, { stale: true })
    const { valid } = validateSnapshot(snap)
    expect(valid).toBe(true)
  })

  it('flags an implausible single-run % change', () => {
    const bad = baseSnapshot()
    bad.instruments.MCX_GOLD = goodInstrument(141006, { changePct: 45 })
    const { valid, errors } = validateSnapshot(bad)
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('changePct'))).toBe(true)
  })

  it('flags a negative price', () => {
    const bad = baseSnapshot()
    bad.instruments.MCX_GOLD = goodInstrument(-141006)
    const { valid } = validateSnapshot(bad)
    expect(valid).toBe(false)
  })
})

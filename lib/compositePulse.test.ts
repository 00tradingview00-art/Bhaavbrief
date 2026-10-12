import { describe, expect, test } from 'vitest'
import { compositePulse, pricingLine, PRICING_EPSILON } from './compositePulse'
import { CORE_INSTRUMENTS, type CoreInstrument, type TerminalInstrumentData } from './terminalData'

type Partials = Partial<Record<CoreInstrument, { ivix: number | null; aav20d: number | null } | null>>

// Builds the shape getTerminalData() returns; only ivix and aav['20d'] matter here.
function data(overrides: Partials): Record<CoreInstrument, TerminalInstrumentData | null> {
  const out = {} as Record<CoreInstrument, TerminalInstrumentData | null>
  for (const i of CORE_INSTRUMENTS) {
    const o = i in overrides ? overrides[i] : { ivix: 40, aav20d: 30 }
    out[i] = o === null || o === undefined ? null : {
      instrument: i, label: i, unit: '', futurePrice: 1,
      maxPain: null, pcr: null, ivix: o.ivix,
      aav: { '5d': null, '10d': null, '20d': o.aav20d, '40d': null, '60d': null },
      volPremium: null, oiVsDayLow: null, marketOpen: true, expiries: [],
    }
  }
  return out
}

describe('compositePulse', () => {
  test('averages both sides when every instrument is paired', () => {
    expect(compositePulse(data({}))).toEqual({ ivix: 40, delivered: 30, premium: 10 })
  })

  // The sign-flip case this pairing exists to prevent: with independent
  // baskets, dropping GOLD from the delivered average only would read
  // 35.2 vs 35.5 and imply a NEGATIVE premium when the true one is +3.8.
  test('an instrument missing its 20-day figure leaves BOTH averages', () => {
    const r = compositePulse(data({
      GOLD:       { ivix: 18, aav20d: null },
      SILVER:     { ivix: 30, aav20d: 27 },
      CRUDEOIL:   { ivix: 45, aav20d: 40 },
      NATURALGAS: { ivix: 55, aav20d: 50 },
      COPPER:     { ivix: 28, aav20d: 25 },
    }))
    expect(r.ivix).toBeCloseTo(39.5, 10)       // (30+45+55+28)/4 — GOLD excluded here too
    expect(r.delivered).toBeCloseTo(35.5, 10)  // (27+40+50+25)/4
    expect(r.premium).toBeCloseTo(4, 10)       // positive, as it should be
  })

  test('an instrument missing its iVIX also leaves both averages', () => {
    const r = compositePulse(data({ GOLD: { ivix: null, aav20d: 10 } }))
    expect(r.ivix).toBe(40)       // the 4 paired instruments, all 40
    expect(r.delivered).toBe(30)  // GOLD's 10 excluded, not dragging it to 26
    expect(r.premium).toBe(10)
  })

  test('a null instrument is skipped entirely', () => {
    const r = compositePulse(data({ GOLD: null }))
    expect(r).toEqual({ ivix: 40, delivered: 30, premium: 10 })
  })

  test('with nothing paired, delivered is null and iVIX falls back to every reading', () => {
    const r = compositePulse(data({
      GOLD:       { ivix: 20, aav20d: null },
      SILVER:     { ivix: 40, aav20d: null },
      CRUDEOIL:   { ivix: 60, aav20d: null },
      NATURALGAS: { ivix: null, aav20d: null },
      COPPER:     { ivix: null, aav20d: null },
    }))
    expect(r.delivered).toBeNull()
    expect(r.premium).toBeNull()
    expect(r.ivix).toBe(40)  // (20+40+60)/3 — the tile must not go dark
  })

  test('everything unavailable yields nulls, never zeros', () => {
    const r = compositePulse(data({
      GOLD: null, SILVER: null, CRUDEOIL: null, NATURALGAS: null, COPPER: null,
    }))
    expect(r).toEqual({ ivix: null, delivered: null, premium: null })
  })
})

describe('pricingLine', () => {
  test('names the direction', () => {
    expect(pricingLine(9.3)).toBe('Options are pricing in more movement than this.')
    expect(pricingLine(-2.1)).toBe('Options are pricing in less movement than this.')
  })

  test('claims no difference the displayed 1dp figures would not show', () => {
    const about = 'Options are pricing in about this much movement.'
    expect(pricingLine(0)).toBe(about)
    expect(pricingLine(PRICING_EPSILON / 2)).toBe(about)
    expect(pricingLine(-PRICING_EPSILON / 2)).toBe(about)
    // At and beyond the threshold it commits to a direction.
    expect(pricingLine(PRICING_EPSILON)).toBe('Options are pricing in more movement than this.')
  })

  test('is absent when there is nothing to compare', () => {
    expect(pricingLine(null)).toBeNull()
  })
})

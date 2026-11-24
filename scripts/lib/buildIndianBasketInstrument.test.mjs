import { describe, it, expect } from 'vitest'
import { buildIndianBasketInstrument } from './buildIndianBasketInstrument.mjs'

describe('buildIndianBasketInstrument', () => {
  it('builds a fresh instrument on the first-ever successful fetch (no prior value to diff against)', () => {
    const result = buildIndianBasketInstrument({ date: '2026-11-19', usdPerBbl: 90.89 }, undefined)
    expect(result).toEqual({
      price: 90.89,
      prevClose: 90.89,
      changePct: 0,
      unit: 'USD/bbl',
      asOfDate: '2026-11-19',
    })
  })

  it('computes changePct against the previous report when a new report lands', () => {
    const existing = { price: 88.5, prevClose: 88.5, changePct: 0, unit: 'USD/bbl', asOfDate: '2026-11-17' }
    const result = buildIndianBasketInstrument({ date: '2026-11-19', usdPerBbl: 90.89 }, existing)
    expect(result.price).toBe(90.89)
    expect(result.prevClose).toBe(88.5)
    expect(result.changePct).toBeCloseTo(((90.89 - 88.5) / 88.5) * 100, 6)
    expect(result.asOfDate).toBe('2026-11-19')
  })

  it('keeps the existing value unchanged (no 0% self-diff) when PPAC has not published a newer report', () => {
    const existing = { price: 90.89, prevClose: 88.5, changePct: 2.7, unit: 'USD/bbl', asOfDate: '2026-11-19' }
    const result = buildIndianBasketInstrument({ date: '2026-11-19', usdPerBbl: 90.89 }, existing)
    expect(result).toEqual({ ...existing, unit: 'USD/bbl' })
  })

  it('carries the last known report forward, marked stale, when the fetch fails', () => {
    const existing = { price: 90.89, prevClose: 88.5, changePct: 2.7, unit: 'USD/bbl', asOfDate: '2026-11-19' }
    const result = buildIndianBasketInstrument(null, existing)
    expect(result).toEqual({ ...existing, unit: 'USD/bbl', stale: true })
  })

  it('returns null — never a fabricated 0 — when the fetch fails and nothing was ever recorded', () => {
    expect(buildIndianBasketInstrument(null, undefined)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { black76, calculateIV } from './black76'

describe('calculateIV', () => {
  it('recovers the seed IV used to generate a price (round-trip)', () => {
    const F = 141000, K = 141000, T = 30 / 365, r = 0.065, trueIV = 0.18
    const { price } = black76(F, K, T, r, trueIV, 'CE')
    const solved = calculateIV(price, F, K, T, r, 'CE')
    expect(solved).not.toBeNull()
    expect(solved!).toBeCloseTo(trueIV, 2)
  })

  it('returns null for a non-positive market price', () => {
    expect(calculateIV(0, 141000, 141000, 30 / 365, 0.065, 'CE')).toBeNull()
    expect(calculateIV(-5, 141000, 141000, 30 / 365, 0.065, 'CE')).toBeNull()
  })

  it('returns null for zero or negative time to expiry', () => {
    expect(calculateIV(100, 141000, 141000, 0, 0.065, 'CE')).toBeNull()
  })

  it('returns null instead of a clamped 0.1% for a market price the solver cannot converge to (Part 7: never a clamped extreme)', () => {
    // A CE market price far below intrinsic value is unreachable by any
    // positive IV — Newton-Raphson hits the sigma floor without converging.
    // Before the Part 7 fix this silently returned 0.001 (renders as "0.10%").
    const F = 141000, K = 100000, T = 30 / 365, r = 0.065
    const intrinsic = F - K // ~41000, deep ITM
    const impossiblePrice = intrinsic * 0.5 // below intrinsic — no valid IV solves to this
    const solved = calculateIV(impossiblePrice, F, K, T, r, 'CE')
    expect(solved).toBeNull()
  })

  it('returns a solved value for a realistic ATM quote, not null', () => {
    const F = 141000, K = 141000, T = 15 / 365, r = 0.065
    // A plausible ATM CE price at ~18% IV
    const { price } = black76(F, K, T, r, 0.18, 'CE')
    const solved = calculateIV(price, F, K, T, r, 'CE')
    expect(solved).not.toBeNull()
    expect(solved!).toBeGreaterThan(0)
    expect(solved!).toBeLessThan(1)
  })
})

describe('black76', () => {
  it('returns all-zero Greeks for invalid inputs rather than throwing', () => {
    expect(black76(0, 100, 1, 0.065, 0.2, 'CE')).toEqual({ price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 })
    expect(black76(100, 100, 0, 0.065, 0.2, 'CE')).toEqual({ price: 0, delta: 0, gamma: 0, theta: 0, vega: 0 })
  })

  it('CE price increases with futures price (positive delta direction)', () => {
    const low = black76(140000, 141000, 30 / 365, 0.065, 0.2, 'CE')
    const high = black76(145000, 141000, 30 / 365, 0.065, 0.2, 'CE')
    expect(high.price).toBeGreaterThan(low.price)
  })
})

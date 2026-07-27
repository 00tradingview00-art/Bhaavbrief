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

  it('theta correct carry: r·C - vol_term per day', () => {
    // Black-76 theta = r·C - df·F·N'(d1)·σ/(2√T), per calendar day.
    // Pre-fix the code was missing the +r·df·F·N(d1) term; for Gold ATM at σ=25%
    // this inflated |theta| from ~41/day (correct) to ~49/day (~20% error).
    // Use σ=25% which is realistic for current MCX Gold IV.
    const F = 88000, K = 88000, T = 30 / 365, r = 0.065, sigma = 0.25
    const { theta, price } = black76(F, K, T, r, sigma, 'CE')
    expect(theta).toBeLessThan(0)              // time decay is always negative for long
    expect(Math.abs(theta)).toBeLessThan(47)   // not inflated to pre-fix ~49 level
    expect(Math.abs(theta)).toBeGreaterThan(30) // substantial vol decay
    // Sanity: theta ≈ r·price/365 - vol_term. r·price/365 is small positive so
    // |theta| must be less than the vol_term alone (≈ 41.7/day here).
    expect(Math.abs(theta)).toBeLessThan(r * price / 365 + 42)
  })

  it('put-call parity: CE price − PE price ≈ df·(F − K)', () => {
    const F = 88000, K = 88000, T = 30 / 365, r = 0.065, sigma = 0.25
    const ce = black76(F, K, T, r, sigma, 'CE')
    const pe = black76(F, K, T, r, sigma, 'PE')
    const df = Math.exp(-r * T)
    expect(ce.price - pe.price).toBeCloseTo(df * (F - K), 0)
  })

  it('ATM theta_CE ≈ theta_PE (put-call symmetry at F=K)', () => {
    // From put-call parity differentiated w.r.t. T: ∂C/∂T - ∂P/∂T = -r·df·(F-K).
    // At F=K this difference is 0, so CE and PE thetas must be equal.
    const { theta: thetaCE } = black76(88000, 88000, 30 / 365, 0.065, 0.25, 'CE')
    const { theta: thetaPE } = black76(88000, 88000, 30 / 365, 0.065, 0.25, 'PE')
    expect(thetaCE).toBeCloseTo(thetaPE, 1)
  })
})

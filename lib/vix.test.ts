import { describe, it, expect } from 'vitest'
import { computeAAV, computeIVIX, type ChainRowForVIX } from './vix'

// Synthetic price series only — never real exchange data (this repo is public).
const round2 = (x: number) => Math.round(x * 100) / 100

// Synthetic 3-strike chain — not real exchange data.
const baseChain: ChainRowForVIX[] = [
  { strike: 100, CE: { ltp: 10, oi: 50 }, PE: { ltp: 4, oi: 50 } },
  { strike: 110, CE: { ltp: 5,  oi: 50 }, PE: { ltp: 0, oi: 0  } },
  { strike: 120, CE: { ltp: 2,  oi: 50 }, PE: { ltp: 0, oi: 0  } },
]

describe('computeIVIX', () => {
  it('matches a hand-computed value for a small synthetic chain', () => {
    // K0 = 100 (largest strike <= futurePrice 105), selected = {100: 7, 110: 5, 120: 2},
    // df = e^(0.05*0.1); sigma2 = (2/T)*sum - (1/T)*(F/K0-1)^2 — verified independently in JS.
    expect(computeIVIX(baseChain, 105, 0.1, 0.05)).toBeCloseTo(47.61, 2)
  })

  it('returns null for an empty chain, non-positive futures price, or non-positive T', () => {
    expect(computeIVIX([], 105, 0.1, 0.05)).toBeNull()
    expect(computeIVIX(baseChain, 0, 0.1, 0.05)).toBeNull()
    expect(computeIVIX(baseChain, -5, 0.1, 0.05)).toBeNull()
    expect(computeIVIX(baseChain, 105, 0, 0.05)).toBeNull()
  })

  it('falls back to the lowest strike as K0 when the futures price sits below every strike, and still produces a finite value', () => {
    // Same selected-strike set as the baseline case (K0=100 either way), different F
    // changes the subtracted variance term — confirms the ?? sorted[0] fallback runs
    // rather than crashing or silently reusing the wrong K0.
    expect(computeIVIX(baseChain, 99, 0.1, 0.05)).toBeCloseTo(50.07, 2)
  })

  it('returns null when fewer than 3 strikes survive the two-consecutive-zero-bid cutoff', () => {
    const thin: ChainRowForVIX[] = [
      { strike: 100, CE: { ltp: 10, oi: 50 }, PE: { ltp: 4, oi: 50 } },
      { strike: 110, CE: { ltp: 0,  oi: 0  }, PE: { ltp: 0, oi: 0  } },
      { strike: 120, CE: { ltp: 0,  oi: 0  }, PE: { ltp: 0, oi: 0  } },
      { strike: 130, CE: { ltp: 3,  oi: 50 }, PE: { ltp: 0, oi: 0  } }, // beyond the cutoff, never reached
    ]
    expect(computeIVIX(thin, 105, 0.1, 0.05)).toBeNull()
  })

  it('returns null when the futures price is far enough from K0 that the variance term goes negative', () => {
    // Same chain as the baseline, but F=50 vs K0=100 makes (F/K0-1)^2 dominate the
    // formula — a real failure mode the sigma2<=0 guard exists to catch.
    expect(computeIVIX(baseChain, 50, 0.1, 0.05)).toBeNull()
  })
})

describe('computeAAV', () => {
  it('returns null for every window when there are too few closes', () => {
    const r = computeAAV([100, 101, 102, 103, 104]) // 5 closes -> 4 returns, 5d needs 6 closes
    expect(r).toEqual({ '5d': null, '10d': null, '20d': null, '40d': null, '60d': null })
  })

  it('fills only the windows the history can support', () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 + (i % 2)) // 21 closes -> 5d, 10d, 20d only
    const r = computeAAV(closes)
    expect(r['5d']).not.toBeNull()
    expect(r['10d']).not.toBeNull()
    expect(r['20d']).not.toBeNull()
    expect(r['40d']).toBeNull()
    expect(r['60d']).toBeNull()
  })

  it('fills the 60d window at exactly 61 closes and not at 60', () => {
    const series = (n: number) => Array.from({ length: n }, (_, i) => 100 + (i % 3))
    expect(computeAAV(series(61))['60d']).not.toBeNull()
    expect(computeAAV(series(60))['60d']).toBeNull()
  })

  it('is zero for a flat series', () => {
    expect(computeAAV([100, 100, 100, 100, 100, 100])['5d']).toBe(0)
  })

  it('matches a hand-computed value (annualised sample stdev of log returns, sqrt(252))', () => {
    // Alternating 100/101 closes -> five returns: +a, -a, +a, -a, +a with a = ln(1.01).
    // mean = a/5, sample variance = [3(0.8a)^2 + 2(1.2a)^2] / 4 = 1.2 a^2.
    const a = Math.log(1.01)
    const expected = round2(Math.sqrt(1.2) * a * Math.sqrt(252) * 100)
    expect(computeAAV([100, 101, 100, 101, 100, 101])['5d']).toBe(expected)
  })

  it('winsorises a single-day return beyond ±12% (continuous-futures splice guard)', () => {
    // Four flat days then a +50% jump. The jump is clamped to ln(1.12) = c.
    // Returns: 0,0,0,0,c -> mean c/5, sample variance = [4(c/5)^2 + (4c/5)^2] / 4 = 0.2 c^2.
    const c = Math.log(1.12)
    const expected = round2(Math.sqrt(0.2) * c * Math.sqrt(252) * 100)
    expect(computeAAV([100, 100, 100, 100, 100, 150])['5d']).toBe(expected)
    // ...and a -50% day is clamped symmetrically.
    expect(computeAAV([100, 100, 100, 100, 100, 50])['5d']).toBe(expected)
  })

  it('returns null for a window containing a non-positive earlier close', () => {
    expect(computeAAV([100, 100, 0, 100, 100, 100])['5d']).toBeNull()
  })
})

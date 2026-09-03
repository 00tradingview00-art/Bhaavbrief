import { describe, test, expect } from 'vitest'
import { computeIVRegime, recommendStrategies, ivRankSeries } from './ivAnalysis'

const makeHistory = (ivs: number[]) =>
  ivs.map((iv, i) => ({ date: `2026-0${Math.floor(i / 28) + 1}-${String((i % 28) + 1).padStart(2, '0')}`, iv }))

describe('computeIVRegime', () => {
  test('empty history returns NORMAL with 50th percentile', () => {
    const result = computeIVRegime([], 25)
    expect(result.regime).toBe('NORMAL')
    expect(result.percentile).toBe(50)
    expect(result.ivRank).toBe(50)
  })

  test('currentIV at historical minimum → 0th percentile → CHEAP', () => {
    const history = makeHistory([20, 25, 30, 35, 40])
    const result = computeIVRegime(history, 20)
    expect(result.percentile).toBe(0)
    expect(result.regime).toBe('CHEAP')
  })

  test('currentIV at historical maximum → 100th percentile → RICH', () => {
    const history = makeHistory([20, 25, 30, 35, 40])
    const result = computeIVRegime(history, 40)
    expect(result.percentile).toBe(80) // 4 of 5 values < 40
    expect(result.regime).toBe('RICH')
  })

  test('currentIV above all history → 100th percentile → RICH', () => {
    const history = makeHistory([20, 25, 30, 35, 40])
    const result = computeIVRegime(history, 99)
    expect(result.percentile).toBe(100)
    expect(result.regime).toBe('RICH')
  })

  test('CHEAP threshold: exactly 24th percentile is CHEAP', () => {
    // 24 values below current out of 100
    const history = makeHistory(Array.from({ length: 100 }, (_, i) => i + 1))
    const result = computeIVRegime(history, 25) // 24 values < 25
    expect(result.percentile).toBe(24)
    expect(result.regime).toBe('CHEAP')
  })

  test('NORMAL: 25th–75th percentile', () => {
    const history = makeHistory(Array.from({ length: 100 }, (_, i) => i + 1))
    const result = computeIVRegime(history, 50) // 49 values < 50
    expect(result.percentile).toBe(49)
    expect(result.regime).toBe('NORMAL')
  })

  test('ivRank is 0 when currentIV equals historical min', () => {
    const history = makeHistory([10, 20, 30])
    const result = computeIVRegime(history, 10)
    expect(result.ivRank).toBe(0)
  })

  test('ivRank is 100 when currentIV equals historical max', () => {
    const history = makeHistory([10, 20, 30])
    const result = computeIVRegime(history, 30)
    expect(result.ivRank).toBe(100)
  })

  test('all-same history: ivRank falls back to 50 (no range)', () => {
    const history = makeHistory([25, 25, 25, 25])
    const result = computeIVRegime(history, 25)
    expect(result.ivRank).toBe(50)
  })

  test('label contains percentile and regime description', () => {
    const history = makeHistory([10, 20, 30, 40, 50])
    const result = computeIVRegime(history, 5) // below all → CHEAP
    expect(result.label).toContain('Cheap')
    expect(result.label).toContain('0th percentile')
  })

  test('label uses correct ordinal suffixes, not a hardcoded "th"', () => {
    // 100-point history so percentile == count of values below currentIV
    const history = makeHistory(Array.from({ length: 100 }, (_, i) => i + 1))
    expect(computeIVRegime(history, 22).label).toContain('21st percentile')  // percentile 21
    expect(computeIVRegime(history, 33).label).toContain('32nd percentile')  // percentile 32
    expect(computeIVRegime(history, 4).label).toContain('3rd percentile')    // percentile 3
    expect(computeIVRegime(history, 5).label).toContain('4th percentile')    // percentile 4
    expect(computeIVRegime(history, 12).label).toContain('11th percentile')  // percentile 11 (exception)
    expect(computeIVRegime(history, 13).label).toContain('12th percentile')  // percentile 12 (exception)
    expect(computeIVRegime(history, 14).label).toContain('13th percentile')  // percentile 13 (exception)
  })
})

describe('ivRankSeries', () => {
  test('day 0 (no prior history) falls back to the neutral 50, not a forced pin', () => {
    const history = makeHistory([20, 30, 25])
    const series = ivRankSeries(history)
    expect(series[0].ivRank).toBe(50)
  })

  test('day 1 (exactly one prior day) also falls back to 50 — regression test: a single prior', () => {
    // A single prior point can't establish a range, so day 1 shouldn't be
    // rankable at all. The old `history.slice(0, i + 1)` window included day
    // 1's own value alongside that one prior point, so day 1 was *always*
    // either the min or the max of that 2-element set — forcing ivRank to 0
    // or 100 regardless of the actual value. This fails against that old
    // logic (which would return 100 here, since 30 > 20) and passes against
    // the fixed `history.slice(0, i)` window (1 prior point → max === min →
    // fallback 50).
    const history = makeHistory([20, 30])
    const series = ivRankSeries(history)
    expect(series[1].ivRank).toBe(50)
  })

  test('a value that genuinely extends the prior range still reads as a real extreme', () => {
    const history = makeHistory([20, 25, 30, 22, 35])
    const series = ivRankSeries(history)
    expect(series[4].ivRank).toBe(100) // 35 is a real new high vs. days 0–3
  })

  test('a value within the already-established prior range ranks proportionally, unaffected by the fix', () => {
    const history = makeHistory([20, 30, 25])
    const series = ivRankSeries(history)
    expect(series[2].ivRank).toBe(50) // 25 is exactly midway between the prior 20–30 range
  })
})

describe('recommendStrategies', () => {
  test('CHEAP + NEUTRAL → includes Long Straddle', () => {
    const recs = recommendStrategies('CHEAP', 'NEUTRAL')
    expect(recs.some(r => r.templateId === 'ATM_STRADDLE')).toBe(true)
  })

  test('RICH + NEUTRAL → Iron Condor', () => {
    const recs = recommendStrategies('RICH', 'NEUTRAL')
    expect(recs.some(r => r.templateId === 'IRON_CONDOR')).toBe(true)
  })

  test('CHEAP + BULLISH → Bull Call Spread or Long Call', () => {
    const recs = recommendStrategies('CHEAP', 'BULLISH')
    expect(recs.some(r => r.templateId === 'BULL_CALL_SPREAD' || r.templateId === 'LONG_CALL')).toBe(true)
  })

  test('RICH + BEARISH → Bear Call Spread', () => {
    const recs = recommendStrategies('RICH', 'BEARISH')
    expect(recs.some(r => r.templateId === 'BEAR_CALL_SPREAD')).toBe(true)
  })

  test('all combinations return at least one recommendation', () => {
    const regimes = ['CHEAP', 'NORMAL', 'RICH'] as const
    const views = ['BULLISH', 'NEUTRAL', 'BEARISH'] as const
    for (const regime of regimes) {
      for (const view of views) {
        expect(recommendStrategies(regime, view).length).toBeGreaterThan(0)
      }
    }
  })
})

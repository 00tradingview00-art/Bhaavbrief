import { describe, expect, test } from 'vitest'
import { computeIVRegime } from './ivAnalysis'
import { IV_RANK_EXPLAINER, ivPositionView } from './ivPosition'
import { visualCopyViolations } from './visualCopyCompliance'

const day = (i: number, iv: number) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, iv })

describe('ivPositionView', () => {
  test('dot and sentence agree even when IV Rank and percentile diverge', () => {
    // One old spike stretches the range: IV Rank is low, but current IV is
    // above most past days, so the percentile (and the card label) say RICH.
    const history = [day(0, 90), ...Array.from({ length: 19 }, (_, i) => day(i + 1, 20))]
    const regime = computeIVRegime(history, 25)
    expect(regime.ivRank).toBeLessThan(25)
    expect(regime.regime).toBe('RICH')

    const view = ivPositionView(regime)!
    expect(view.position).toBe(regime.percentile)
    expect(view.position).toBeGreaterThan(75)
    expect(view.description).toMatch(/higher than usual/)
  })

  test('hides the visual when history has no range', () => {
    const flat = computeIVRegime(Array.from({ length: 10 }, (_, i) => day(i, 20)), 20)
    expect(flat.hasRange).toBe(false)
    expect(ivPositionView(flat)).toBeNull()
    expect(ivPositionView(computeIVRegime([], 20))).toBeNull()
    expect(ivPositionView(null)).toBeNull()
  })

  test('labels each state for screen readers', () => {
    const history = Array.from({ length: 20 }, (_, i) => day(i, 10 + i))
    expect(ivPositionView(computeIVRegime(history, 12))!.ariaLabel).toBe('Options pricing is lower than usual for this market')
    expect(ivPositionView(computeIVRegime(history, 20))!.ariaLabel).toBe('Options pricing is in its usual range for this market')
  })

  test('all IV visual copy stays within the allowed language', () => {
    const history = Array.from({ length: 20 }, (_, i) => day(i, 10 + i))
    const copy = [12, 20, 29].flatMap(iv => {
      const view = ivPositionView(computeIVRegime(history, iv))!
      return [view.description, view.ariaLabel]
    })
    for (const text of [...copy, ...Object.values(IV_RANK_EXPLAINER)]) expect(visualCopyViolations(text)).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { notionalExposure, adverseMoveImpacts } from './plRisk'

describe('notionalExposure', () => {
  it('multiplies entry price × lot size × lots', () => {
    expect(notionalExposure(141000, 100, 2)).toBe(28_200_000)
  })

  it('returns null for a non-positive input', () => {
    expect(notionalExposure(0, 100, 2)).toBeNull()
    expect(notionalExposure(141000, 0, 2)).toBeNull()
    expect(notionalExposure(141000, 100, 0)).toBeNull()
  })
})

describe('adverseMoveImpacts', () => {
  it('computes the default 1/3/5% impacts on a notional', () => {
    const impacts = adverseMoveImpacts(1_000_000)
    expect(impacts).toEqual([
      { pct: 1, amount: 10_000 },
      { pct: 3, amount: 30_000 },
      { pct: 5, amount: 50_000 },
    ])
  })

  it('accepts a custom list of percentages', () => {
    expect(adverseMoveImpacts(1_000_000, [2])).toEqual([{ pct: 2, amount: 20_000 }])
  })
})

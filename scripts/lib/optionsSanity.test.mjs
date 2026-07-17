import { describe, it, expect } from 'vitest'
import { computeTierDistribution, countParityViolations, classifyIVTrend, formatOptionsSanitySection } from './optionsSanity.mjs'

describe('computeTierDistribution', () => {
  it('computes % per tier across CE and PE legs', () => {
    const chain = [
      { CE: { tier: 'LIVE' }, PE: { tier: 'LIVE' } },
      { CE: { tier: 'STALE' }, PE: { tier: 'JUNK' } },
    ]
    const result = computeTierDistribution(chain)
    expect(result.total).toBe(4)
    expect(result.livePct).toBe(50)
    expect(result.stalePct).toBe(25)
    expect(result.junkPct).toBe(25)
  })

  it('returns nulls for an empty chain', () => {
    expect(computeTierDistribution([])).toEqual({ total: 0, livePct: null, stalePct: null, junkPct: null })
  })

  it('handles a missing/undefined chain gracefully', () => {
    expect(computeTierDistribution(undefined).total).toBe(0)
  })
})

describe('countParityViolations', () => {
  it('counts strikes where both legs are STALE with a solved IV', () => {
    const chain = [
      { CE: { tier: 'STALE', iv: 18.2 }, PE: { tier: 'STALE', iv: 25.1 } }, // parity violation
      { CE: { tier: 'STALE', iv: null }, PE: { tier: 'STALE', iv: null } }, // liquidity-only, not parity
      { CE: { tier: 'LIVE', iv: 17.0 }, PE: { tier: 'LIVE', iv: 17.4 } },   // healthy
    ]
    expect(countParityViolations(chain)).toBe(1)
  })
})

describe('classifyIVTrend', () => {
  it('classifies widening/narrowing/flat/unknown correctly', () => {
    expect(classifyIVTrend(20, 15)).toBe('widening')
    expect(classifyIVTrend(15, 20)).toBe('narrowing')
    expect(classifyIVTrend(20, 20.5)).toBe('flat')
    expect(classifyIVTrend(null, 20)).toBe('unknown')
    expect(classifyIVTrend(20, null)).toBe('unknown')
  })
})

describe('formatOptionsSanitySection', () => {
  it('flags elevated JUNK% across any instrument', () => {
    const summaries = [
      { instrument: 'GOLD', tiers: { total: 10, livePct: 50, stalePct: 20, junkPct: 30 }, parityViolations: 0, currentIV: 18, currentAAV: 16, spread: 2, trend: 'flat' },
    ]
    const section = formatOptionsSanitySection(summaries)
    expect(section).toContain('JUNK% elevated')
  })

  it('does not flag when JUNK% is low across all instruments', () => {
    const summaries = [
      { instrument: 'GOLD', tiers: { total: 10, livePct: 80, stalePct: 15, junkPct: 5 }, parityViolations: 0, currentIV: 18, currentAAV: 16, spread: 2, trend: 'flat' },
    ]
    const section = formatOptionsSanitySection(summaries)
    expect(section).not.toContain('JUNK% elevated')
  })
})

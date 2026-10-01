import { describe, expect, test } from 'vitest'
import { isVisualCopySafe, visualCopyViolations } from './visualCopyCompliance'
import { MARKET_PULSE_COPY, marketPulseSummary } from './marketPulse'

describe('visual copy compliance', () => {
  test('allows an observational market-pulse statement', () => {
    expect(isVisualCopySafe("Crude Oil is among today's largest moves.")).toBe(true)
  })

  test('rejects advice and prediction language', () => {
    expect(visualCopyViolations('Buy now because Crude Oil will rise.')).toHaveLength(2)
  })

  test('rejects methodology leakage', () => {
    expect(isVisualCopySafe('The value is calculated as a conversion factor multiplied by price.')).toBe(false)
    expect(isVisualCopySafe('This uses a 20-day window and a sample size of 20.')).toBe(false)
  })

  test('keeps generated Market Pulse copy within the allowed language', () => {
    const copy = marketPulseSummary({ key: 'crude', label: 'Crude Oil', href: '/commodities/crude-oil', changePct: -2, tone: 'down', stale: false })
    expect(copy).not.toBeNull()
    expect(isVisualCopySafe(copy!)).toBe(true)
    expect(isVisualCopySafe(marketPulseSummary({ key: 'crude', label: 'Crude Oil', href: '/commodities/crude-oil', changePct: -2, tone: 'down', stale: false }, false)!)).toBe(true)
  })

  test('keeps fixed Market Pulse component copy within the allowed language', () => {
    for (const copy of Object.values(MARKET_PULSE_COPY)) expect(visualCopyViolations(copy)).toEqual([])
  })
})

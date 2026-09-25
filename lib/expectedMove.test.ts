import { describe, it, expect } from 'vitest'
import { daysToExpiry, expectedMoveToExpiry } from './expectedMove'

describe('daysToExpiry', () => {
  it('computes whole calendar days between now and an expiry date', () => {
    const now = new Date('2026-09-25T10:00:00.000Z').getTime()
    expect(daysToExpiry('2026-10-15T00:00:00.000Z', now)).toBe(20)
  })

  it('never returns negative days for an expiry already in the past', () => {
    const now = new Date('2026-09-25T10:00:00.000Z').getTime()
    expect(daysToExpiry('2026-09-01T00:00:00.000Z', now)).toBe(0)
  })
})

describe('expectedMoveToExpiry', () => {
  it('translates iVIX % into an absolute ₹ move using the sqrt(T) rule', () => {
    // price=100000, iv=36.5% (annualized), 36.5 days to expiry ->
    // sqrt(36.5/365) = sqrt(0.1) ≈ 0.31623 -> move ≈ 100000*0.365*0.31623 ≈ 11542.31
    const move = expectedMoveToExpiry(100000, 36.5, 36.5)
    expect(move).not.toBeNull()
    expect(move as number).toBeCloseTo(11542.31, 1)
  })

  it('returns null when any required input is missing or non-positive', () => {
    expect(expectedMoveToExpiry(0, 30, 10)).toBeNull()
    expect(expectedMoveToExpiry(100000, 0, 10)).toBeNull()
    expect(expectedMoveToExpiry(100000, 30, 0)).toBeNull()
    expect(expectedMoveToExpiry(100000, 30, -5)).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { normalizeFeedback } from './feedback'

describe('normalizeFeedback', () => {
  it('drops ratings outside 1–5 instead of crashing the star rendering', () => {
    const f = normalizeFeedback({ r1: 9, r2: -1, r3: 2.5, r4: '4' })
    expect([f.r1, f.r2, f.r3, f.r4]).toEqual([undefined, undefined, undefined, 4])
  })

  it('accepts only an array of strings for sections', () => {
    expect(normalizeFeedback({ sections: 'Options' }).sections).toBeUndefined()
    expect(normalizeFeedback({ sections: ['Options', 5, { x: 1 }] }).sections).toEqual(['Options'])
  })

  it('coerces and caps text fields, and ignores non-text values', () => {
    const f = normalizeFeedback({ userType: 42, suggestion: 'x'.repeat(5000), displayName: { a: 1 } })
    expect(f.userType).toBe('42')
    expect(f.suggestion).toHaveLength(2000)
    expect(f.displayName).toBeUndefined()
  })

  it('keeps a valid reply-to email and drops anything else', () => {
    expect(normalizeFeedback({ email: 'trader@example.com' }).email).toBe('trader@example.com')
    expect(normalizeFeedback({ email: 'not an email' }).email).toBeUndefined()
  })

  it('handles a non-object body', () => {
    expect(normalizeFeedback(null)).toMatchObject({ userType: undefined })
  })
})

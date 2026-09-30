import { describe, it, expect } from 'vitest'
import { closeBriefSlug, sessionDisplayDate, sessionAnchorISO, isInEveningWindow, slugDateToken } from './closeBriefDates.mjs'

describe('closeBriefSlug', () => {
  it('forces the slug date token to the session (the live "…-29-mcx-close-30sep2026" bug)', () => {
    expect(closeBriefSlug('mcx-close-30sep2026-crude-selloff', '2026-09-29'))
      .toBe('2026-09-29-mcx-close-29sep2026-crude-selloff')
  })

  it('falls back to a dated slug when Claude gives none', () => {
    expect(closeBriefSlug('', '2026-09-29')).toBe('2026-09-29-mcx-close-29sep2026')
  })

  it('keeps slugs URL-safe and bounded', () => {
    const slug = closeBriefSlug('MCX Close 29SEP2026: Gold & Silver!! ' + 'x'.repeat(100), '2026-09-29')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug.length).toBeLessThanOrEqual(80)
  })
})

describe('session display and anchor', () => {
  it('names the session day, not the wall-clock day', () => {
    expect(sessionDisplayDate('2026-09-25')).toMatch(/Friday/)
    expect(slugDateToken('2026-09-05')).toBe('05sep2026')
  })

  it('anchors the article at midnight IST on the session date', () => {
    expect(sessionAnchorISO('2026-09-29')).toBe('2026-09-28T18:30:00.000Z')
  })
})

describe('isInEveningWindow', () => {
  const at = iso => new Date(iso)
  it('accepts 21:00 IST through 05:59 IST', () => {
    expect(isInEveningWindow(at('2026-09-29T15:30:00Z'))).toBe(true)  // 21:00
    expect(isInEveningWindow(at('2026-09-29T20:12:00Z'))).toBe(true)  // 01:42 — the 29 Sep run
    expect(isInEveningWindow(at('2026-09-30T00:29:00Z'))).toBe(true)  // 05:59
  })

  it('rejects daytime runs', () => {
    expect(isInEveningWindow(at('2026-09-30T00:30:00Z'))).toBe(false) // 06:00
    expect(isInEveningWindow(at('2026-09-30T09:00:00Z'))).toBe(false) // 14:30
  })
})

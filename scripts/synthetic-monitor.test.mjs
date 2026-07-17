import { describe, it, expect } from 'vitest'
import {
  isMCXOpenIST,
  istMinutesNow,
  extractBuildId,
  extractGoldPrice,
  extractGeneratedAt,
  priceToNumber,
} from './synthetic-monitor.mjs'

describe('isMCXOpenIST', () => {
  it('is closed on Saturday/Sunday regardless of time', () => {
    expect(isMCXOpenIST(new Date('2026-07-18T10:00:00Z'))).toBe(false) // Saturday
    expect(isMCXOpenIST(new Date('2026-07-19T10:00:00Z'))).toBe(false) // Sunday
  })

  it('is open at 9:00 AM IST (03:30 UTC) and 11:30 PM IST (18:00 UTC) on a weekday', () => {
    expect(isMCXOpenIST(new Date('2026-07-17T03:30:00Z'))).toBe(true)
    expect(isMCXOpenIST(new Date('2026-07-17T18:00:00Z'))).toBe(true)
  })

  it('is closed just before/after the trading window on a weekday', () => {
    expect(isMCXOpenIST(new Date('2026-07-17T03:29:00Z'))).toBe(false)
    expect(isMCXOpenIST(new Date('2026-07-17T18:01:00Z'))).toBe(false)
  })
})

describe('istMinutesNow', () => {
  it('converts 9:45 AM IST correctly (04:15 UTC)', () => {
    expect(istMinutesNow(new Date('2026-07-17T04:15:00Z'))).toBe(9 * 60 + 45)
  })
})

describe('extractBuildId', () => {
  it('parses the bb-build meta tag', () => {
    expect(extractBuildId('<meta name="bb-build" content="abc123">')).toBe('abc123')
  })

  it('returns null when the tag is absent', () => {
    expect(extractBuildId('<html></html>')).toBeNull()
  })
})

describe('extractGoldPrice', () => {
  it('parses the price adjacent to the MCX GOLD label', () => {
    const html = '<span>MCX GOLD</span><span>₹1,41,006</span>'
    expect(extractGoldPrice(html)).toBe('₹1,41,006')
  })
})

describe('extractGeneratedAt', () => {
  it('parses the "as of" timestamp text', () => {
    expect(extractGeneratedAt('<div>as of 2026-07-18 00:10 IST</div>')).toBe('2026-07-18 00:10 IST')
  })
})

describe('priceToNumber', () => {
  it('strips currency symbol and thousands separators', () => {
    expect(priceToNumber('₹1,41,006')).toBe(141006)
  })

  it('returns null for unparseable input', () => {
    expect(priceToNumber(null)).toBeNull()
    expect(priceToNumber('—')).toBeNull()
  })
})

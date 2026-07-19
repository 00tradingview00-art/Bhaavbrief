import { describe, it, expect } from 'vitest'
import {
  computeT1,
  detectT2Cross,
  nearestRoundLevel,
  isCooledDown,
  buildSlug,
  parseFlashOutput,
  validateBodyNumbers,
  containsBannedPhrases,
  THRESHOLDS,
  ROUND_STEPS,
} from './flash-monitor.mjs'

// ── computeT1 ─────────────────────────────────────────────────────────────────

describe('computeT1', () => {
  it('fires at exactly the threshold', () => {
    // 1% threshold, price moved exactly 1% up from baseline
    expect(computeT1(151500, 150000, 1.0)).toBe(true)
  })

  it('fires on a downward move at exactly the threshold', () => {
    expect(computeT1(148500, 150000, 1.0)).toBe(true)
  })

  it('does NOT fire below the threshold', () => {
    expect(computeT1(150900, 150000, 1.0)).toBe(false)   // +0.6%
  })

  it('does NOT fire on zero baseline', () => {
    expect(computeT1(150000, 0, 1.0)).toBe(false)
  })

  it('fires when lastFlashPrice is the baseline, not prevClose', () => {
    // After a prior flash at 151500, the ratchet baseline is 151500.
    // A move to 153015 = +1.0% from 151500 → fires
    expect(computeT1(153015, 151500, 1.0)).toBe(true)
    // A move to 152200 = +0.46% from 151500 → does NOT fire
    expect(computeT1(152200, 151500, 1.0)).toBe(false)
  })

  it('uses per-instrument thresholds from exported THRESHOLDS', () => {
    // Silver threshold is 2%
    expect(computeT1(214000, 210000, THRESHOLDS.MCX_SILVER)).toBe(false)  // +1.9% — no
    expect(computeT1(214200, 210000, THRESHOLDS.MCX_SILVER)).toBe(true)   // +2.0% — yes
    expect(computeT1(213000, 210000, THRESHOLDS.MCX_SILVER)).toBe(false)  // +1.43% — no
  })
})

// ── detectT2Cross ─────────────────────────────────────────────────────────────

describe('detectT2Cross', () => {
  it('detects an upward cross of a round level', () => {
    // Gold: prevClose 149800, price 150200, step 5000
    // prevClose bucket = floor(149800/5000) = 29; price bucket = floor(150200/5000) = 30
    // crossed level = max(29,30)*5000 = 150000
    expect(detectT2Cross(150200, 149800, 5000)).toBe(150000)
  })

  it('detects a downward cross of a round level', () => {
    // prevClose 150200, price 149800
    expect(detectT2Cross(149800, 150200, 5000)).toBe(150000)
  })

  it('returns null when price stays in same bucket', () => {
    expect(detectT2Cross(150300, 150100, 5000)).toBeNull()
  })

  it('handles Crude ₹500 steps', () => {
    // Crude prevClose 8480, price 8520 → crosses 8500
    expect(detectT2Cross(8520, 8480, 500)).toBe(8500)
    expect(detectT2Cross(8490, 8450, 500)).toBeNull()  // both in bucket 16 (floor(8490/500)=16, floor(8450/500)=16)
  })

  it('handles USDINR ₹0.50 steps', () => {
    // USDINR prevClose 84.73, price 85.02
    // floor(84.73/0.5)=169, floor(85.02/0.5)=170
    expect(detectT2Cross(85.02, 84.73, 0.50)).toBeCloseTo(85.0, 1)
  })

  it('ROUND_STEPS config covers expected instruments', () => {
    expect(ROUND_STEPS.MCX_GOLD).toBe(5000)
    expect(ROUND_STEPS.MCX_SILVER).toBe(10000)
    expect(ROUND_STEPS.MCX_CRUDE).toBe(500)
    expect(ROUND_STEPS.USDINR).toBe(0.50)
    // MCX_COPPER and MCX_NATGAS intentionally have no T2 step
    expect(ROUND_STEPS.MCX_COPPER).toBeUndefined()
    expect(ROUND_STEPS.MCX_NATGAS).toBeUndefined()
  })
})

// ── nearestRoundLevel ─────────────────────────────────────────────────────────

describe('nearestRoundLevel', () => {
  it('returns the floor bucket level', () => {
    expect(nearestRoundLevel(150200, 5000)).toBe(150000)
    expect(nearestRoundLevel(149800, 5000)).toBe(145000)
    expect(nearestRoundLevel(150000, 5000)).toBe(150000)   // exactly on a level
  })
})

// ── isCooledDown ──────────────────────────────────────────────────────────────

describe('isCooledDown', () => {
  const cooldown = 75 * 60 * 1000   // 75 min in ms

  it('returns false when lastFlashAt is null (never fired)', () => {
    expect(isCooledDown(null, cooldown)).toBe(false)
  })

  it('returns true when last flash was 30 min ago (within cooldown)', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    expect(isCooledDown(thirtyMinAgo, cooldown)).toBe(true)
  })

  it('returns false when last flash was 80 min ago (cooldown elapsed)', () => {
    const eightyMinAgo = new Date(Date.now() - 80 * 60 * 1000).toISOString()
    expect(isCooledDown(eightyMinAgo, cooldown)).toBe(false)
  })

  it('is exactly false at the cooldown boundary', () => {
    const now = Date.now()
    const exactly75MinAgo = new Date(now - cooldown).toISOString()
    expect(isCooledDown(exactly75MinAgo, cooldown, now)).toBe(false)
  })
})

// ── buildSlug ─────────────────────────────────────────────────────────────────

describe('buildSlug', () => {
  it('produces YYYY-MM-DD-HH-MM-<kebab> format in IST', () => {
    // UTC 04:00 = IST 09:30
    const utc = new Date('2026-07-19T04:00:00Z')
    const slug = buildSlug('MCX Crude breaks ₹8,500', utc)
    expect(slug).toMatch(/^2026-07-19-09-30-/)
    expect(slug).toContain('mcx-crude-breaks')
  })

  it('truncates title part to ≤55 chars', () => {
    const utc = new Date('2026-07-19T04:00:00Z')
    const longTitle = 'MCX Gold ' + 'x'.repeat(100)
    const slug = buildSlug(longTitle, utc)
    const titlePart = slug.split('-').slice(5).join('-')
    expect(titlePart.length).toBeLessThanOrEqual(55)
  })

  it('strips special characters', () => {
    const utc = new Date('2026-07-19T04:00:00Z')
    const slug = buildSlug('MCX Gold: +1.5% — WTI rallies', utc)
    expect(slug).not.toMatch(/[₹:.%—]/)
  })
})

// ── parseFlashOutput ──────────────────────────────────────────────────────────

describe('parseFlashOutput', () => {
  it('extracts title and body from clean output', () => {
    const raw = `TITLE: MCX Crude breaks ₹8,500 as WTI rallies 1.8%

**WHAT HAPPENED**
MCX Crude surged to ₹8,521/bbl at 11:15 AM IST...

**WHAT IT MEANS**
Bullish sentiment has returned...

**WHAT TO WATCH**
Watch ₹8,600 as next resistance.`

    const { title, body } = parseFlashOutput(raw)
    expect(title).toBe('MCX Crude breaks ₹8,500 as WTI rallies 1.8%')
    expect(body).toContain('**WHAT HAPPENED**')
    expect(body).not.toContain('TITLE:')
  })

  it('strips code fences from model output', () => {
    const raw = '```\nTITLE: MCX Gold dips 1.2% on dollar strength\n\n**WHAT HAPPENED**\nGold fell.\n```'
    const { title } = parseFlashOutput(raw)
    expect(title).toBe('MCX Gold dips 1.2% on dollar strength')
  })

  it('throws when TITLE: line is missing', () => {
    expect(() => parseFlashOutput('**WHAT HAPPENED**\nNo title here.')).toThrow()
  })
})

// ── validateBodyNumbers ───────────────────────────────────────────────────────

describe('validateBodyNumbers', () => {
  it('returns empty array when all ₹ figures are within 15% of instrument price', () => {
    const body = 'MCX Crude at ₹8,521/bbl rose from ₹8,400 prev close.'
    // instrument price = 8521; both 8521 and 8400 are within 15%
    expect(validateBodyNumbers(body, 8521)).toEqual([])
  })

  it('flags a hallucinated price far outside 15%', () => {
    const body = 'MCX Crude at ₹12,000/bbl'
    // 12000 vs 8521: diff = 40.8% → fail
    expect(validateBodyNumbers(body, 8521)).toContain(12000)
  })

  it('ignores small numbers < ₹500', () => {
    const body = 'MCX Crude moved ₹84/bbl.'
    expect(validateBodyNumbers(body, 8521)).toEqual([])
  })

  it('handles gold prices (₹1,50,000 range)', () => {
    // 150000 vs 150500: diff = 0.33% → pass
    const body = 'MCX Gold at ₹1,50,000 per 10g.'
    expect(validateBodyNumbers(body, 150500)).toEqual([])
  })
})

// ── containsBannedPhrases ────────────────────────────────────────────────────

describe('containsBannedPhrases', () => {
  it('flags advice phrasing', () => {
    expect(containsBannedPhrases('Traders should buy on dips.')).toBe(true)
    expect(containsBannedPhrases('Consider selling at ₹8,500.')).toBe(true)
    expect(containsBannedPhrases('We recommend accumulating below ₹1,50,000.')).toBe(true)
    expect(containsBannedPhrases('Target price is ₹9,000.')).toBe(true)
  })

  it('passes clean informational content', () => {
    expect(containsBannedPhrases('MCX Crude rose 1.5% to ₹8,521 as WTI gained.')).toBe(false)
    expect(containsBannedPhrases('Watch ₹8,600 as next resistance.')).toBe(false)
  })
})

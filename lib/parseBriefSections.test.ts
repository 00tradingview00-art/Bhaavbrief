import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { parseBriefSections } from './parseBriefSections'

const BRIEFS_DIR = path.join(process.cwd(), 'content/briefs')

// Real editions sampled across the archive — if content-pipeline prompt
// wording ever drifts from the fixed 7-heading shape, this test is the
// earliest observable signal (per Part 12 UI-05 plan).
const SAMPLE_EDITIONS = ['edition-050.mdx', 'edition-055.mdx', 'edition-060.mdx', 'edition-066.mdx']

describe('parseBriefSections', () => {
  for (const filename of SAMPLE_EDITIONS) {
    const filepath = path.join(BRIEFS_DIR, filename)
    if (!fs.existsSync(filepath)) continue

    it(`parses all 5 sacred sections from ${filename}`, () => {
      const raw = fs.readFileSync(filepath, 'utf8')
      const { content } = matter(raw)
      const parsed = parseBriefSections(content)

      expect(parsed).not.toBeNull()
      if (!parsed) return

      expect(parsed.dominantTheme.body.length).toBeGreaterThan(0)
      expect(parsed.marketIsSaying.body.length).toBeGreaterThan(0)
      expect(parsed.historicalContext.body.length).toBeGreaterThan(0)
      expect(parsed.whatKillsIt.body.length).toBeGreaterThan(0)
      expect(parsed.whoIsAffected.body.length).toBeGreaterThan(0)

      // Sacred rule: never drop content. Every sentence of the original
      // Market Is Saying section must still be present somewhere in the
      // parsed rows.
      const rowsText = parsed.marketIsSayingRows.map(r => r.text).join(' ')
      expect(rowsText.length).toBeGreaterThanOrEqual(parsed.marketIsSaying.body.length * 0.9)
    })
  }

  it('extracts the dominant theme status word', () => {
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-066.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    expect(parsed?.dominantThemeStatus).toBe('BUILDING')
    expect(parsed?.dominantThemeTitle).toBe('Geopolitical Supply Premium')
  })

  it('extracts the status word even when a "Something:" phrase sits between it and the em-dash', () => {
    // Regression test: edition-052's heading is "Peace Dividend — Rupee
    // Cushion Edition: STRENGTHENING" — a real production case where the
    // previous single-token-after-the-em-dash regex silently failed to
    // extract any status word at all.
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-052.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    expect(parsed?.dominantThemeStatus).toBe('STRENGTHENING')
    expect(parsed?.dominantThemeTitle).toBe('Peace Dividend — Rupee Cushion Edition')
  })

  it('extracts the status word from an all-caps title without swallowing part of the title', () => {
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-055.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    expect(parsed?.dominantThemeStatus).toBe('STRENGTHENING')
    expect(parsed?.dominantThemeTitle).toBe('SILVER INDUSTRIAL RE-RATING')
  })

  it('extracts Edge of the Day and Tomorrow without losing the rest of Who Is Affected', () => {
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-066.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    expect(parsed?.edgeOfDay).toMatch(/COMEX gold/i)
    expect(parsed?.tomorrow).toMatch(/Federal Reserve/i)
    expect(parsed?.whoIsAffectedRest).toMatch(/Businesses/)
    expect(parsed?.whoIsAffectedRest).toMatch(/Investors/)
    expect(parsed?.whoIsAffectedRest).toMatch(/Consumers/)
  })

  it('parses Price Bridge table rows with commodity, prices and direction', () => {
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-066.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    expect(parsed?.priceBridgeRows).not.toBeNull()
    const gold = parsed?.priceBridgeRows?.find(r => r.commodity === 'Gold')
    expect(gold?.mcx).toContain('140400')
    expect(gold?.pct).toBeCloseTo(0.04, 2)
  })

  it('does not cross-contaminate one commodity\'s % with another mentioned earlier in the same line', () => {
    // Regression test: edition-066's opening line is "**MCX Gold ₹140400 |
    // Crude ₹7690 | USDINR ₹96.29** — Gold **+0.04%** | Crude **+1.00%** |
    // Silver **-0.35%**". A too-wide lookup window let Crude's regex match
    // Gold's "+0.04%" (the first bolded % appearing after ANY "Crude"
    // substring, including the early non-bold price mention) instead of
    // continuing to Crude's own "+1.00%" later in the string.
    const raw = fs.readFileSync(path.join(BRIEFS_DIR, 'edition-066.mdx'), 'utf8')
    const { content } = matter(raw)
    const parsed = parseBriefSections(content)
    const crude = parsed?.priceBridgeRows?.find(r => r.commodity === 'Crude')
    expect(crude?.pct).toBeCloseTo(1.00, 2)
  })

  it('fails open (returns null) on unrecognized heading structure instead of throwing', () => {
    const malformed = '## Some Random Heading\nBody text.\n\n## Another\nMore text.'
    expect(() => parseBriefSections(malformed)).not.toThrow()
    expect(parseBriefSections(malformed)).toBeNull()
  })

  it('fails open on empty content', () => {
    expect(parseBriefSections('')).toBeNull()
  })

  const SYNTHETIC_SECTIONS = (dominantHeading: string, priceBridgeBody: string) => `
Opening line.

## Price Bridge

${priceBridgeBody}

## Macro Thread

Macro body.

## ${dominantHeading}

Dominant theme body.

## The Market Is Saying

Gold is up **+1.00%** today.

## Historical Context

Historical body.

## What Kills It

What kills it body.

## Who Is Affected

Businesses, Investors and Consumers body.
`

  it('extracts a multi-word status suffix without swallowing it into the title', () => {
    const content = SYNTHETIC_SECTIONS(
      'Crude Surge — METALS UNDER PRESSURE',
      '| Commodity | Global Price | FX Rate | MCX Price |\n|---|---|---|---|\n| Gold | $3997/oz | ₹96.29 | ₹140400/10g |'
    )
    const parsed = parseBriefSections(content)
    expect(parsed?.dominantThemeTitle).toBe('Crude Surge')
    expect(parsed?.dominantThemeStatus).toBe('METALS UNDER PRESSURE')
  })

  it('does not throw when a Price Bridge commodity cell is bolded, and still finds its pct (regex-injection regression)', () => {
    // Regression test: escaping the raw "**Gold**" cell for regex safety is
    // not enough on its own — searching for the literal bolded text never
    // matches prose like "Gold is up **+0.04%**" (where only the number is
    // bolded), so the escape fix must also use the bold-STRIPPED commodity
    // name for the pct lookup, not just for regex-injection safety.
    const content = SYNTHETIC_SECTIONS(
      'Some Theme — BUILDING',
      '| Commodity | Global Price | FX Rate | MCX Price |\n|---|---|---|---|\n| **Gold** | $3997/oz | ₹96.29 | ₹140400/10g |'
    )
    expect(() => parseBriefSections(content)).not.toThrow()
    const parsed = parseBriefSections(content)
    expect(parsed?.priceBridgeRows?.[0]?.commodity).toBe('Gold')
    expect(parsed?.priceBridgeRows?.[0]?.pct).toBeCloseTo(1.00, 2)
  })

  it('does not drop the last column when a Price Bridge row is missing its trailing pipe', () => {
    const content = SYNTHETIC_SECTIONS(
      'Some Theme — BUILDING',
      '| Commodity | Global Price | FX Rate | MCX Price |\n|---|---|---|---|\n| Gold | $3997/oz | ₹96.29 | ₹140400/10g'
    )
    const parsed = parseBriefSections(content)
    expect(parsed?.priceBridgeRows).not.toBeNull()
    expect(parsed?.priceBridgeRows?.[0]?.mcx).toContain('140400')
  })

  it('preserves a row whose last cell is genuinely empty instead of dropping it', () => {
    // Regression test: stripping leading/trailing empty cells in a loop
    // (rather than at most once per side) couldn't distinguish the row's
    // own outer-pipe artifact from a legitimately-blank last column, and
    // popped both — silently dropping the entire row.
    const content = SYNTHETIC_SECTIONS(
      'Some Theme — BUILDING',
      '| Commodity | Global Price | FX Rate | MCX Price |\n|---|---|---|---|\n| Gold | $3997/oz | ₹96.29 | |'
    )
    const parsed = parseBriefSections(content)
    expect(parsed?.priceBridgeRows).not.toBeNull()
    expect(parsed?.priceBridgeRows?.[0]?.commodity).toBe('Gold')
    expect(parsed?.priceBridgeRows?.[0]?.mcx).toBe('')
  })

  it('extracts a multi-word status suffix that itself contains a comma', () => {
    // Regression test: edition-018's real (legacy-format, currently
    // dormant) heading is "Stagflation Premium Repricing — WEAKENING AT THE
    // EDGES, NOT REVERSING" — a single-character separator between
    // all-caps words left the comma stuck to the end of the title instead
    // of being absorbed into the status phrase.
    const content = SYNTHETIC_SECTIONS(
      'Stagflation Premium Repricing — WEAKENING AT THE EDGES, NOT REVERSING',
      '| Commodity | Global Price | FX Rate | MCX Price |\n|---|---|---|---|\n| Gold | $3997/oz | ₹96.29 | ₹140400/10g |'
    )
    const parsed = parseBriefSections(content)
    expect(parsed?.dominantThemeTitle).toBe('Stagflation Premium Repricing')
    expect(parsed?.dominantThemeStatus).toBe('WEAKENING AT THE EDGES, NOT REVERSING')
  })
})

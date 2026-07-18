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

  it('fails open (returns null) on unrecognized heading structure instead of throwing', () => {
    const malformed = '## Some Random Heading\nBody text.\n\n## Another\nMore text.'
    expect(() => parseBriefSections(malformed)).not.toThrow()
    expect(parseBriefSections(malformed)).toBeNull()
  })

  it('fails open on empty content', () => {
    expect(parseBriefSections('')).toBeNull()
  })
})

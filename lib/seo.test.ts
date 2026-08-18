import { describe, it, expect } from 'vitest'
import { safeJsonLd, buildBriefTitle } from './seo'

describe('safeJsonLd', () => {
  it('escapes "<" so a stray </script> in content cannot break out of the JSON-LD block', () => {
    const schema = { '@type': 'Article', headline: 'Gold falls </script><script>alert(1)</script>' }
    const out = safeJsonLd(schema)
    expect(out).not.toContain('<')
    expect(out).toContain('\\u003c')
  })

  it('still produces valid JSON that parses back to the original value', () => {
    const schema = { '@type': 'FAQPage', mainEntity: [{ name: 'What is <1 lot>?' }] }
    const out = safeJsonLd(schema)
    expect(JSON.parse(out)).toEqual(schema)
  })

  it('matches plain JSON.stringify when there is no "<" to escape', () => {
    const schema = { '@type': 'BreadcrumbList', itemListElement: [] }
    expect(safeJsonLd(schema)).toBe(JSON.stringify(schema))
  })
})

describe('buildBriefTitle', () => {
  it('leaves short titles unchanged', () => {
    expect(buildBriefTitle('Gold Falls 2%')).toBe('Gold Falls 2%')
  })

  it('truncates long titles to at most 61 chars (60 + ellipsis) at a word boundary', () => {
    const long = 'Silver Slides 2.5% as Gold-Silver Ratio Widens — Crude Steadies on Supply Caution'
    const out = buildBriefTitle(long)
    expect(out.length).toBeLessThanOrEqual(61)
    expect(out.endsWith('…')).toBe(true)
    expect(out.endsWith(' …')).toBe(false)
  })

  it('falls back to a hard cut when there is no space to break on', () => {
    const long = 'a'.repeat(80)
    const out = buildBriefTitle(long)
    expect(out).toBe('a'.repeat(60) + '…')
  })
})

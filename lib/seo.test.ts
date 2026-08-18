import { describe, it, expect } from 'vitest'
import { safeJsonLd } from './seo'

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

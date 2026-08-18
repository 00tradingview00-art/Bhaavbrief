import { describe, it, expect } from 'vitest'
import { truncateSeoTitle, SEO_TITLE_MAX } from './seo-title.js'

describe('truncateSeoTitle', () => {
  it('leaves short titles unchanged', () => {
    expect(truncateSeoTitle('Gold Falls 2%')).toBe('Gold Falls 2%')
  })

  it('truncates long titles to at most SEO_TITLE_MAX + 1 chars at a word boundary', () => {
    const long = 'Silver Slides 2.5% as Gold-Silver Ratio Widens — Crude Steadies on Supply Caution'
    const out = truncateSeoTitle(long)
    expect(out.length).toBeLessThanOrEqual(SEO_TITLE_MAX + 1)
    expect(out.endsWith('…')).toBe(true)
  })
})

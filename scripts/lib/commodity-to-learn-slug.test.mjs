import { describe, it, expect } from 'vitest'
import { getRelatedLink } from './commodity-to-learn-slug.js'
import { ROUTES } from '../../config/routes.mjs'

describe('getRelatedLink', () => {
  it('returns null when no commodities are given', () => {
    expect(getRelatedLink([], 1)).toBeNull()
    expect(getRelatedLink(undefined, 1)).toBeNull()
  })

  it('rotates through Gold-specific links by edition', () => {
    const a = getRelatedLink(['MCX Gold'], 0)
    const b = getRelatedLink(['MCX Gold'], 1)
    expect(a.href).not.toBe(b.href)
  })

  it('rotates Silver/Crude/Natural Gas editions across the widened fallback pool', () => {
    const hrefs = new Set()
    for (let edition = 0; edition < 5; edition++) {
      hrefs.add(getRelatedLink(['MCX Silver'], edition).href)
    }
    expect(hrefs.size).toBe(5)
  })

  it('every returned /learn/* link is a real registered route', () => {
    const commodityLists = [['MCX Gold'], ['MCX Copper'], ['MCX Silver'], ['MCX Crude'], ['MCX Natural Gas']]
    for (const commodities of commodityLists) {
      for (let edition = 0; edition < 5; edition++) {
        const link = getRelatedLink(commodities, edition)
        if (link.href.startsWith('/learn/')) {
          expect(ROUTES, `${link.href} for ${commodities[0]} edition ${edition}`).toContain(link.href)
        }
      }
    }
  })
})

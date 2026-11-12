import { describe, test, expect } from 'vitest'
import { getRecentBriefsByCommodity, type BriefMeta } from './briefs'

function makeBrief(overrides: Partial<BriefMeta>): BriefMeta {
  return {
    slug: 'edition-001',
    urlSlug: '2026-01-01-edition-001',
    title: 'Untitled',
    date: '2026-01-01',
    displayDate: '1 January 2026',
    description: '',
    summary: '',
    edition: 1,
    tags: [],
    commodities: [],
    published: true,
    corrected: false,
    correctedAt: null,
    correctionNote: null,
    edgeMetric: null,
    edgeLevel: null,
    edgeCondition: null,
    ...overrides,
  }
}

describe('getRecentBriefsByCommodity', () => {
  test('returns only briefs whose commodities include the label, preserving input order', () => {
    const gold1 = makeBrief({ slug: 'gold-1', commodities: ['MCX Gold'] })
    const silver1 = makeBrief({ slug: 'silver-1', commodities: ['MCX Silver'] })
    const gold2 = makeBrief({ slug: 'gold-2', commodities: ['MCX Gold', 'MCX Crude'] })
    const all = [gold1, silver1, gold2]

    expect(getRecentBriefsByCommodity(all, 'MCX Gold')).toEqual([gold1, gold2])
  })

  test('respects the limit parameter', () => {
    const all = [
      makeBrief({ slug: 'a', commodities: ['MCX Gold'] }),
      makeBrief({ slug: 'b', commodities: ['MCX Gold'] }),
      makeBrief({ slug: 'c', commodities: ['MCX Gold'] }),
    ]

    expect(getRecentBriefsByCommodity(all, 'MCX Gold', 2)).toHaveLength(2)
  })

  test('defaults to a limit of 5', () => {
    const all = Array.from({ length: 8 }, (_, i) => makeBrief({ slug: `edition-${i}`, commodities: ['MCX Gold'] }))

    expect(getRecentBriefsByCommodity(all, 'MCX Gold')).toHaveLength(5)
  })

  test('returns an empty array when nothing matches', () => {
    const all = [makeBrief({ slug: 'silver-1', commodities: ['MCX Silver'] })]

    expect(getRecentBriefsByCommodity(all, 'MCX Gold')).toEqual([])
  })

  test('returns an empty array when allBriefs is empty', () => {
    expect(getRecentBriefsByCommodity([], 'MCX Gold')).toEqual([])
  })
})

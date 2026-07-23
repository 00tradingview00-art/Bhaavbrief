import { describe, it, expect } from 'vitest'
import { selectReelsForInsights, parseInsightsResponse } from './fetch-reel-insights.mjs'

const NOW = new Date('2026-07-23T09:00:00Z').getTime()
const DAYS = (n) => new Date(NOW - n * 24 * 3600 * 1000).toISOString()

describe('selectReelsForInsights', () => {
  it('returns empty for empty or malformed history', () => {
    expect(selectReelsForInsights([], NOW)).toEqual([])
    expect(selectReelsForInsights(null, NOW)).toEqual([])
    expect(selectReelsForInsights([null, {}], NOW)).toEqual([])
  })

  it('skips reels that were never posted (no instagram_id)', () => {
    const history = [{ file: 'brief-edition-070', instagram_id: null, posted_at: null }]
    expect(selectReelsForInsights(history, NOW)).toEqual([])
  })

  it('skips reels posted less than 24h ago', () => {
    const history = [{ file: 'a', instagram_id: '123', posted_at: new Date(NOW - 3600 * 1000).toISOString() }]
    expect(selectReelsForInsights(history, NOW)).toEqual([])
  })

  it('skips reels that already have insights', () => {
    const history = [{ file: 'a', instagram_id: '123', posted_at: DAYS(2), insights: { views: 10 } }]
    expect(selectReelsForInsights(history, NOW)).toEqual([])
  })

  it('selects posted reels ≥24h old without insights', () => {
    const history = [
      { file: 'old-done', instagram_id: '1', posted_at: DAYS(3), insights: { views: 5 } },
      { file: 'eligible', instagram_id: '2', posted_at: DAYS(1) },
      { file: 'too-new', instagram_id: '3', posted_at: new Date(NOW - 1000).toISOString() },
      { file: 'never-posted', instagram_id: null },
    ]
    expect(selectReelsForInsights(history, NOW).map((e) => e.file)).toEqual(['eligible'])
  })
})

describe('parseInsightsResponse', () => {
  it('reads total_value-shaped metrics', () => {
    const body = { data: [{ name: 'views', total_value: { value: 1200 } }] }
    expect(parseInsightsResponse(body)).toEqual({ views: 1200 })
  })

  it('reads values-array-shaped metrics', () => {
    const body = { data: [{ name: 'reach', values: [{ value: 900 }] }] }
    expect(parseInsightsResponse(body)).toEqual({ reach: 900 })
  })

  it('ignores entries without a usable value and handles empty bodies', () => {
    expect(parseInsightsResponse({ data: [{ name: 'x' }] })).toEqual({})
    expect(parseInsightsResponse({})).toEqual({})
    expect(parseInsightsResponse(undefined)).toEqual({})
  })
})

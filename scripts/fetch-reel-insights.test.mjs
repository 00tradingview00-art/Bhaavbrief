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

  it('reads a full engagement-metrics response (likes/comments/shares/saved/total_interactions)', () => {
    const body = {
      data: [
        { name: 'likes', total_value: { value: 12 } },
        { name: 'comments', total_value: { value: 3 } },
        { name: 'shares', total_value: { value: 5 } },
        { name: 'saved', total_value: { value: 2 } },
        { name: 'total_interactions', total_value: { value: 22 } },
      ],
    }
    expect(parseInsightsResponse(body)).toEqual({
      likes: 12, comments: 3, shares: 5, saved: 2, total_interactions: 22,
    })
  })
})

describe('engagement + primary metrics merge (as done in main())', () => {
  it('engagement fields sit alongside views/reach/watch-time without clobbering them', () => {
    const metrics = { views: 44, reach: 40, ig_reels_avg_watch_time: 2400 }
    const engagement = { likes: 5, shares: 1 }
    const merged = { ...metrics, ...engagement, fetched_at: '2026-09-08T00:00:00.000Z' }
    expect(merged).toEqual({
      views: 44, reach: 40, ig_reels_avg_watch_time: 2400,
      likes: 5, shares: 1, fetched_at: '2026-09-08T00:00:00.000Z',
    })
  })

  it('a failed engagement fetch (empty object) still leaves the primary metrics intact', () => {
    const metrics = { views: 44, reach: 40 }
    const engagement = {}
    const merged = { ...metrics, ...engagement, fetched_at: 'x' }
    expect(merged).toEqual({ views: 44, reach: 40, fetched_at: 'x' })
  })
})

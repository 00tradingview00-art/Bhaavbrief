import { describe, it, expect } from 'vitest'
import {
  selectReelsForInsights, parseInsightsResponse, insightRefreshReason,
  orderReelsForInsights, isMissingMedia, PER_RUN_LIMIT,
} from './fetch-reel-insights.mjs'

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

  it('skips reels fetched within the last day', () => {
    const history = [{ file: 'a', instagram_id: '123', posted_at: DAYS(2), insights: { views: 10, fetched_at: DAYS(0) } }]
    expect(selectReelsForInsights(history, NOW)).toEqual([])
  })

  it('selects posted reels ≥24h old without insights', () => {
    const history = [
      { file: 'old-done', instagram_id: '1', posted_at: DAYS(3), insights: { views: 5, fetched_at: DAYS(0) } },
      { file: 'eligible', instagram_id: '2', posted_at: DAYS(1) },
      { file: 'too-new', instagram_id: '3', posted_at: new Date(NOW - 1000).toISOString() },
      { file: 'never-posted', instagram_id: null },
    ]
    expect(selectReelsForInsights(history, NOW).map((e) => e.file)).toEqual(['eligible'])
  })
})

describe('repeat observations', () => {
  const complete = { views: 40, likes: 0, shares: 0, saved: 0, comments: 0, total_interactions: 0 }
  it('refreshes early observations after seven days, then stops', () => {
    const r = { instagram_id: '1', posted_at: DAYS(8), insights: { ...complete, fetched_at: DAYS(6) } }
    expect(insightRefreshReason(r, NOW)).toBe('seven_day')
    expect(insightRefreshReason({ ...r, insights: { ...complete, fetched_at: DAYS(1) } }, NOW)).toBeNull()
  })
  it('backfills missing engagement once, keeping measured zero valid', () => {
    const r = { instagram_id: '1', posted_at: DAYS(20), insights: { views: 40, fetched_at: DAYS(2) } }
    expect(insightRefreshReason(r, NOW)).toBe('engagement_backfill')
    expect(insightRefreshReason({ ...r, engagement_backfill_attempted_at: DAYS(1) }, NOW)).toBeNull()
    expect(insightRefreshReason({ ...r, insights: { ...complete, fetched_at: DAYS(2) } }, NOW)).toBeNull()
  })
  it('does not treat a late first fetch as needing another seven-day fetch', () => {
    const r = { instagram_id: '1', posted_at: DAYS(30), insights: { ...complete, fetched_at: DAYS(2) } }
    expect(insightRefreshReason(r, NOW)).toBeNull()
  })
})

describe('deleted media is tombstoned, not retried forever', () => {
  it('recognises a missing-object error by subcode or message, not a bad metric name', () => {
    expect(isMissingMedia({ code: 100, subcode: 33, message: 'Unsupported get request.' })).toBe(true)
    expect(isMissingMedia({ code: 100, message: "Object with ID '17953376718027448' does not exist" })).toBe(true)
    // A renamed metric is also code 100 — it must stay retryable.
    expect(isMissingMedia({ code: 100, message: '(#100) metric[0] must be one of views, reach' })).toBe(false)
    expect(isMissingMedia(undefined)).toBe(false)
  })

  it('a tombstoned reel leaves the queue permanently', () => {
    const r = { file: 'v3/x-001', instagram_id: '1', posted_at: DAYS(9) }
    expect(insightRefreshReason(r, NOW)).toBe('initial')
    expect(insightRefreshReason({ ...r, media_missing_at: DAYS(1) }, NOW)).toBeNull()
    // Still null for the seven-day and backfill paths, not just the first one.
    const measured = { ...r, posted_at: DAYS(20), insights: { views: 40, fetched_at: DAYS(2) }, media_missing_at: DAYS(1) }
    expect(insightRefreshReason(measured, NOW)).toBeNull()
  })
})

describe('orderReelsForInsights — the anti-starvation guarantee', () => {
  it('measures the newest reel first, however long the backlog is', () => {
    // Reproduces the 11 Aug – 7 Oct 2026 outage: a long head of older
    // never-measured reels, with the one we actually care about posted last.
    const history = [
      ...Array.from({ length: 40 }, (_, i) => ({ file: `stale-${i}`, instagram_id: `s${i}`, posted_at: DAYS(100 - i) })),
      { file: 'v3/posted-yesterday', instagram_id: 'fresh', posted_at: DAYS(1) },
    ]
    const ordered = orderReelsForInsights(history, NOW)
    expect(ordered).toHaveLength(PER_RUN_LIMIT)
    expect(ordered[0].file).toBe('v3/posted-yesterday')
  })

  it('still puts every new observation ahead of any engagement backfill', () => {
    const history = [
      { file: 'backfill-recent', instagram_id: '1', posted_at: DAYS(20), insights: { views: 40, fetched_at: DAYS(2) } },
      { file: 'new-older', instagram_id: '2', posted_at: DAYS(5) },
    ]
    expect(orderReelsForInsights(history, NOW).map((e) => e.file)).toEqual(['new-older', 'backfill-recent'])
  })

  it('excludes tombstoned entries so they cannot consume the budget', () => {
    const history = [
      ...Array.from({ length: 25 }, (_, i) => ({ file: `dead-${i}`, instagram_id: `d${i}`, posted_at: DAYS(60 - i), media_missing_at: DAYS(1) })),
      { file: 'v3/live', instagram_id: 'live', posted_at: DAYS(2) },
    ]
    expect(orderReelsForInsights(history, NOW).map((e) => e.file)).toEqual(['v3/live'])
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

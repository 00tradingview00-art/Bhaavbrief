import { it, expect } from 'vitest'
import { analyzeReels } from './analyze-reel-history.mjs'
it('separates measured zero engagement from missing data', () => {
  const r = analyzeReels([{ insights: { views: 10 } }, { insights: { views: 20, saved: 0 } }])
  expect(r.coverage.saved).toEqual({ measured: 1, missing: 1, total: 0 })
  expect(r.coverage.shares).toEqual({ measured: 0, missing: 2, total: null })
  expect(r.median_views).toBe(15)
  expect(r.mean_watch_seconds).toBeNull()
})

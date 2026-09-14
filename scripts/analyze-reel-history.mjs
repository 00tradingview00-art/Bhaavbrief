#!/usr/bin/env node
// Read-only local baseline; never sends email or calls an API.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
export function analyzeReels(history) {
  const rows = history.filter(r => r?.insights)
  const values = key => rows.map(r => r.insights[key]).filter(Number.isFinite)
  const mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null
  const views = values('views').sort((a, b) => a - b), n = views.length
  return {
    entries: history.length, measured: rows.length, mean_views: mean(views),
    median_views: n ? (views[Math.floor((n - 1) / 2)] + views[Math.floor(n / 2)]) / 2 : null,
    mean_watch_seconds: values('ig_reels_avg_watch_time').length ? mean(values('ig_reels_avg_watch_time')) / 1000 : null,
    coverage: Object.fromEntries(['views', 'reach', 'saved', 'shares', 'likes', 'comments'].map(k => {
      const a = values(k)
      return [k, { measured: a.length, missing: rows.length - a.length, total: a.length ? a.reduce((s, v) => s + v, 0) : null }]
    })),
    top_views: [...rows].sort((a, b) => (b.insights.views ?? -1) - (a.insights.views ?? -1)).slice(0, 10).map(r => ({
      file: r.file, hook: r.hook_caption || r.topic, views: r.insights.views,
      watch_seconds: r.insights.ig_reels_avg_watch_time / 1000,
      saved: r.insights.saved ?? null, shares: r.insights.shares ?? null,
      fetched_at: r.insights.fetched_at,
    })),
    caveats: ['Missing is not zero.', 'Fetch ages differ.', 'Watch mean is unweighted by viewers.', 'No measured 3-second retention or completion.'],
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(analyzeReels(JSON.parse(readFileSync(new URL('../data/reel-history.json', import.meta.url), 'utf8'))), null, 2))
}

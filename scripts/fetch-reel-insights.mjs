#!/usr/bin/env node
/**
 * scripts/fetch-reel-insights.mjs
 *
 * Pulls Instagram Reels watch-time/reach insights for posted reels and writes
 * them back onto the matching data/reel-history.json entries, so hook/timing
 * changes can be judged against real retention numbers instead of manual
 * app-checking.
 *
 * Selection: entries with an instagram_id, posted_at ≥ 24h ago (Meta's
 * insights aren't stable immediately after publish), and no insights field yet.
 *
 * Observability only — never the publish gate. Any single reel's API failure
 * is logged and skipped; the script always exits 0 (the workflow step is also
 * continue-on-error). Dormant (logs and exits 0) unless INSTAGRAM_USER_ID and
 * INSTAGRAM_ACCESS_TOKEN are set, same pattern as apply-human-gate.mjs.
 *
 * Usage: node scripts/fetch-reel-insights.mjs
 * Env:   INSTAGRAM_ACCESS_TOKEN (required to fetch), INSTAGRAM_USER_ID
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Load .env.local (same loader as post-reel-instagram.mjs) ─────────────────
const envFile = join(ROOT, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const HISTORY_FILE = join(ROOT, 'data/reel-history.json')
const MIN_AGE_MS = 24 * 3600 * 1000

// Metric names as of Graph API v22.0. Meta has renamed reels metrics across
// versions before, so an "invalid metric" error falls back to the basics
// below rather than failing the whole run.
const METRICS = ['views', 'reach', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time']
const FALLBACK_METRICS = ['views', 'reach']

/** Pure selection logic — exported for tests. */
export function selectReelsForInsights(history, now = Date.now()) {
  if (!Array.isArray(history)) return []
  return history.filter((entry) =>
    entry &&
    entry.instagram_id &&
    entry.posted_at &&
    !entry.insights &&
    now - new Date(entry.posted_at).getTime() >= MIN_AGE_MS
  )
}

/** Flatten a Graph API insights response into { metricName: value }. */
export function parseInsightsResponse(body) {
  const out = {}
  for (const item of body?.data ?? []) {
    // Reels media insights return { name, total_value: { value } } or
    // { name, values: [{ value }] } depending on metric — handle both.
    const value = item?.total_value?.value ?? item?.values?.[0]?.value
    if (item?.name != null && value != null) out[item.name] = value
  }
  return out
}

async function fetchInsights(mediaId, token, metrics) {
  const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${metrics.join(',')}&access_token=${token}`
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  const body = await res.json()
  if (body.error) {
    // Code 100 = invalid parameter (unknown metric name) → caller may retry
    // with the fallback list. Anything else is a real per-reel failure.
    const err = new Error(body.error.message ?? 'Graph API error')
    err.code = body.error.code
    throw err
  }
  return parseInsightsResponse(body)
}

async function main() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    console.log('INSTAGRAM_ACCESS_TOKEN not set — skipping reel insights (dormant)')
    return
  }
  if (!existsSync(HISTORY_FILE)) {
    console.log('data/reel-history.json not found — nothing to measure yet')
    return
  }

  let history
  try { history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) }
  catch (e) {
    console.warn(`⚠️  Could not parse ${HISTORY_FILE}: ${e.message} — skipping`)
    return
  }

  const pending = selectReelsForInsights(history)
  console.log(`📊  ${pending.length} posted reel(s) awaiting insights`)
  if (!pending.length) return

  let updated = 0
  for (const entry of pending) {
    try {
      let metrics
      try {
        metrics = await fetchInsights(entry.instagram_id, token, METRICS)
      } catch (e) {
        if (e.code !== 100) throw e
        console.warn(`  ⚠️  ${entry.file}: metric list rejected (${e.message}) — retrying with ${FALLBACK_METRICS.join(',')}`)
        metrics = await fetchInsights(entry.instagram_id, token, FALLBACK_METRICS)
      }
      entry.insights = { ...metrics, fetched_at: new Date().toISOString() }
      updated++
      const watch = metrics.ig_reels_avg_watch_time
      console.log(`  ✅  ${entry.file}: views=${metrics.views ?? '?'} reach=${metrics.reach ?? '?'}${watch != null ? ` avg_watch=${watch}ms` : ''}`)
    } catch (e) {
      console.warn(`  ⚠️  ${entry.file}: ${e.message} — skipping`)
    }
  }

  if (updated > 0) {
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
    console.log(`💾  Wrote insights for ${updated} reel(s) to data/reel-history.json`)
  }
}

// Never fail the pipeline — observability only.
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  main().catch((e) => { console.warn(`⚠️  fetch-reel-insights failed: ${e.message}`) })
}

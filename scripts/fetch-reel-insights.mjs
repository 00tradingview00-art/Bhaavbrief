#!/usr/bin/env node
/**
 * scripts/fetch-reel-insights.mjs
 *
 * Pulls Instagram Reels watch-time/reach/engagement insights for posted
 * reels and writes them back onto the matching data/reel-history.json
 * entries, so hook/timing/chart changes can be judged against real
 * retention and engagement numbers instead of manual app-checking. Also
 * takes one daily follower-count snapshot (data/follower-history.json) —
 * the account-level counterpart to per-reel insights.
 *
 * Selection: first eligible observation after 24h, a later observation after
 * seven days, and one engagement backfill for older incomplete observations.
 * Actual ages/timestamps are retained; late fetches are never called 24h data.
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
import { todayIST } from './lib/holidays.js'
import { appendFollowerSnapshot } from './lib/followerHistory.mjs'

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
const FOLLOWER_HISTORY_FILE = join(ROOT, 'data/follower-history.json')
const MIN_AGE_MS = 24 * 3600 * 1000

// Metric names as of Graph API v22.0. Meta has renamed reels metrics across
// versions before, so an "invalid metric" error falls back to the basics
// below rather than failing the whole run.
const METRICS = ['views', 'reach', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time']
const FALLBACK_METRICS = ['views', 'reach']

// Engagement metrics — fetched as a second, independent call (own
// try/catch, no fallback list) so a name rejected here can never take down
// the METRICS call above, or vice versa. "Attracting an audience" mostly
// hinges on these, not on views/reach alone — sends/shares in particular
// are what actually reaches non-followers, per the account's own growth
// notes, but the Graph API has no "shares to non-followers" metric, so
// shares/saves/total_interactions are the closest proxy available.
const ENGAGEMENT_METRICS = ['likes', 'comments', 'shares', 'saved', 'total_interactions']

/** Pure selection logic. Bounded refresh avoids freezing the first observation. */
export function insightRefreshReason(entry, now = Date.now()) {
  if (!entry?.instagram_id || !entry.posted_at) return null
  const posted = Date.parse(entry.posted_at)
  if (!Number.isFinite(posted) || now - posted < MIN_AGE_MS) return null
  if (!entry.insights) return 'initial'
  const fetched = Date.parse(entry.insights.fetched_at)
  if (Number.isFinite(fetched) && now - fetched < MIN_AGE_MS) return null
  if (now - posted >= 7 * MIN_AGE_MS && (!Number.isFinite(fetched) || fetched - posted < 7 * MIN_AGE_MS)) return 'seven_day'
  if (ENGAGEMENT_METRICS.some(k => !Number.isFinite(entry.insights[k])) && !entry.engagement_backfill_attempted_at) return 'engagement_backfill'
  return null
}

export function selectReelsForInsights(history, now = Date.now()) {
  if (!Array.isArray(history)) return []
  return history.filter(entry => insightRefreshReason(entry, now))
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

/** `followers_count` is a field on the IG user node, not a per-media insight. */
async function fetchFollowerCount(userId, token) {
  const url = `https://graph.facebook.com/v22.0/${userId}?fields=followers_count&access_token=${token}`
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
  const body = await res.json()
  if (body.error) throw new Error(body.error.message ?? 'Graph API error')
  if (!Number.isFinite(body.followers_count)) throw new Error('followers_count missing from response')
  return body.followers_count
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

  // New observations take priority over migration backfills. Bound API work per run.
  const pending = selectReelsForInsights(history)
    .sort((a, b) => Number(insightRefreshReason(a) === 'engagement_backfill') - Number(insightRefreshReason(b) === 'engagement_backfill'))
    .slice(0, 20)
  console.log(`📊  ${pending.length} posted reel(s) awaiting insights`)

  let updated = 0
  for (const entry of pending) {
    const reason = insightRefreshReason(entry)
    let metrics
    try {
      try {
        metrics = await fetchInsights(entry.instagram_id, token, METRICS)
      } catch (e) {
        if (e.code !== 100) throw e
        console.warn(`  ⚠️  ${entry.file}: metric list rejected (${e.message}) — retrying with ${FALLBACK_METRICS.join(',')}`)
        metrics = await fetchInsights(entry.instagram_id, token, FALLBACK_METRICS)
      }
    } catch (e) {
      console.warn(`  ⚠️  ${entry.file}: ${e.message} — skipping`)
      continue
    }

    // Engagement is fetched separately — if this call fails (e.g. a metric
    // name Meta has renamed), the reel still gets its views/reach/watch-time
    // above rather than nothing at all.
    let engagement = {}
    try {
      engagement = await fetchInsights(entry.instagram_id, token, ENGAGEMENT_METRICS)
    } catch (e) {
      console.warn(`  ⚠️  ${entry.file}: engagement metrics unavailable (${e.message})`)
    }

    const fetchedAt = new Date().toISOString()
    const ageHours = (Date.parse(fetchedAt) - Date.parse(entry.posted_at)) / 3600000
    entry.insight_snapshots ??= []
    if (entry.insights && entry.insight_snapshots.length === 0) {
      entry.insight_snapshots.push({ ...entry.insights, observation: 'historical' })
    }
    entry.insights = { ...metrics, ...engagement, fetched_at: fetchedAt }
    entry.insight_snapshots.push({
      ...entry.insights, age_hours: ageHours,
      observation: reason === 'initial' ? (ageHours < 48 ? 'first_after_24h' : 'late_initial')
        : reason === 'seven_day' ? (ageHours < 8 * 24 ? 'first_after_7d' : 'late_seven_day') : reason,
    })
    if (reason === 'engagement_backfill') entry.engagement_backfill_attempted_at = fetchedAt
    updated++
    const watch = metrics.ig_reels_avg_watch_time
    console.log(`  ✅  ${entry.file}: views=${metrics.views ?? '?'} reach=${metrics.reach ?? '?'}${watch != null ? ` avg_watch=${watch}ms` : ''}${engagement.shares != null ? ` shares=${engagement.shares}` : ''}`)
  }

  if (updated > 0) {
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8')
    console.log(`💾  Wrote insights for ${updated} reel(s) to data/reel-history.json`)
  }

  // One follower-count snapshot per run (dedupe-by-date happens on write —
  // see appendFollowerSnapshot), independent of whether any reel insights
  // were pending above.
  const userId = process.env.INSTAGRAM_USER_ID
  if (userId) {
    try {
      const followers = await fetchFollowerCount(userId, token)
      let followerHistory = []
      if (existsSync(FOLLOWER_HISTORY_FILE)) {
        try { followerHistory = JSON.parse(readFileSync(FOLLOWER_HISTORY_FILE, 'utf8')) } catch { followerHistory = [] }
      }
      const next = appendFollowerSnapshot(followerHistory, {
        date: todayIST(), followers_count: followers, fetched_at: new Date().toISOString(),
      })
      writeFileSync(FOLLOWER_HISTORY_FILE, JSON.stringify(next, null, 2), 'utf8')
      console.log(`👥  Followers: ${followers} (data/follower-history.json)`)
    } catch (e) {
      console.warn(`  ⚠️  Follower count fetch failed: ${e.message}`)
    }
  }
}

// Never fail the pipeline — observability only.
const isDirectRun = process.argv[1] && import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  main().catch((e) => { console.warn(`⚠️  fetch-reel-insights failed: ${e.message}`) })
}

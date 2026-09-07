/**
 * scripts/lib/followerHistory.mjs — pure merge logic for
 * data/follower-history.json, a once-a-day snapshot of the Instagram
 * account's follower count. Kept as its own file (not appended onto
 * data/reel-history.json) since follower count is a per-day, account-level
 * fact, not tied to any single reel.
 */

/**
 * Adds today's follower snapshot to history, newest-first, deduped by date
 * — fetch-reel-insights.mjs runs at most once/day in production, but a
 * manual re-run or workflow_dispatch retry on the same day should overwrite
 * today's snapshot rather than append a duplicate.
 * @param {Array<{date:string, followers_count:number, fetched_at:string}>} history
 * @param {{date:string, followers_count:number, fetched_at:string}} snapshot
 * @returns {Array<{date:string, followers_count:number, fetched_at:string}>}
 */
export function appendFollowerSnapshot(history, snapshot) {
  const withoutToday = (Array.isArray(history) ? history : []).filter((h) => h?.date !== snapshot.date)
  return [snapshot, ...withoutToday]
}

/**
 * Follower delta between the latest snapshot and the closest one at least
 * `days` ago (not necessarily exactly `days` — a missed day is fine, we
 * just want the nearest older snapshot). Returns null if there isn't a
 * pair to compare (fewer than 2 snapshots, or no snapshot old enough).
 * @param {Array<{date:string, followers_count:number}>} history newest-first
 * @param {number} days
 */
export function followerDelta(history, days = 7) {
  if (!Array.isArray(history) || history.length < 2) return null
  const latest = history[0]
  const cutoff = new Date(latest.date).getTime() - days * 24 * 3600 * 1000
  const prior = history.find((h) => new Date(h.date).getTime() <= cutoff)
  if (!prior) return null
  return {
    latest: latest.followers_count,
    prior: prior.followers_count,
    delta: latest.followers_count - prior.followers_count,
    priorDate: prior.date,
    latestDate: latest.date,
  }
}

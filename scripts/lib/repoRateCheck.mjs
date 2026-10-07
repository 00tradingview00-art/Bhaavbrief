/**
 * scripts/lib/repoRateCheck.mjs — compares the hand-maintained repo rate in
 * lib/rbiRepoRate.js against the "Current Rates" box on rbi.org.in.
 *
 * lib/rbiRepoRate.js is updated by hand after each MPC decision, so the only
 * way it goes stale is someone forgetting. This catches that. RBI's own
 * homepage box lags the announcement (7 Oct 2026: still 5.25% hours after the
 * hike to 5.50%), so a mismatch right after we update is RBI catching up, not
 * us being wrong — hence the grace window.
 */

export const GRACE_DAYS = 3

/** Pulls the "Policy Repo Rate : 5.50%" figure out of RBI's homepage HTML. */
export function parseRbiRepoRate(html) {
  if (typeof html !== 'string') return null
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
  const m = text.match(/Policy Repo Rate\s*:\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/i)
  if (!m) return null
  const rate = Number(m[1])
  return rate > 0 && rate < 20 ? rate : null
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000)
}

/**
 * status:
 *   ok          — same figure on both
 *   rbi-lagging — differ, but we updated within GRACE_DAYS; RBI's box hasn't caught up
 *   mismatch    — differ and our figure is older than GRACE_DAYS → needs a manual update
 *   unreadable  — couldn't find the figure on RBI's page
 */
export function compareRepoRate({ rbiRate, siteRate, siteAsOf, today }) {
  if (rbiRate == null) return { status: 'unreadable' }
  if (Math.abs(rbiRate - siteRate) < 0.001) return { status: 'ok' }
  if (daysBetween(siteAsOf, today) <= GRACE_DAYS) return { status: 'rbi-lagging' }
  return { status: 'mismatch' }
}

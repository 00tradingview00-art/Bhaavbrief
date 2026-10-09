/**
 * scripts/lib/reelReleaseWindow.mjs
 *
 * Decides whether a V3 Reel may publish *right now*.
 *
 * Why this exists: `docs/reels-v3-production-standard.md` specifies three
 * releases a week at 7:30 PM IST, and the workflow's cron said exactly that —
 * but GitHub fired it 4h18m to 7h23m late on every single run between
 * 21 Sep and 5 Oct 2026, so the reels actually landed between 23:49 and 03:06
 * IST. Shifting the cron earlier would only trade one guess about GitHub's lag
 * for another, and would post at 1:30 PM on any day the lag disappeared.
 *
 * So the cron is deliberately *over-scheduled* (several candidate firings per
 * release day, free on a public repo) and this module is the single authority
 * on which firing is allowed to publish: the first one that lands inside the
 * evening window, at most one per IST day. A day whose firings all land
 * outside the window publishes nothing — a missed release is strictly better
 * than a 3 AM release, and it keeps publish time from becoming an uncontrolled
 * variable underneath the standard's "change one creative variable at a time".
 */

import { todayIST, hourIST } from './holidays.js'

/** Evening window in IST, straddling the standard's 7:30 PM target. */
export const WINDOW_START_IST = 18
export const WINDOW_END_IST = 21.5

/**
 * @param {object}   opts
 * @param {number}   opts.now      epoch ms
 * @param {object[]} opts.history  data/reel-history.json
 * @returns {{ release: boolean, reason: string }}
 */
export function shouldReleaseNow({ now = Date.now(), history = [] } = {}) {
  const hour = hourIST(now)
  const today = todayIST(now)
  const clock = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.round((hour % 1) * 60)).padStart(2, '0')} IST`

  if (hour < WINDOW_START_IST || hour >= WINDOW_END_IST) {
    return { release: false, reason: `${clock} is outside the ${WINDOW_START_IST}:00–21:30 IST release window — holding, the topic stays next in line` }
  }

  const already = (Array.isArray(history) ? history : []).find(
    e => e?.posted_at && e.instagram_id && todayIST(Date.parse(e.posted_at)) === today,
  )
  if (already) {
    return { release: false, reason: `already published ${already.file} today (${today}) — one release per day` }
  }

  return { release: true, reason: `${clock} is inside the release window and nothing has published today` }
}

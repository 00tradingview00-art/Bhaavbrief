/**
 * MCX session dating — which trading session a moment belongs to.
 *
 * Plain .js so both plain-Node scripts and app/ TypeScript can import it
 * (CLAUDE.md cross-boundary convention). Builds on holidays.js, the single
 * source of truth for weekends/holidays.
 *
 * The evening session runs to 23:30/23:55 IST, and end-of-day jobs routinely
 * finish after midnight (Vercel Hobby crons fire anywhere inside their hour;
 * GitHub Actions schedules run hours late). Dating those runs by the IST
 * calendar date filed Friday's data under Saturday (seen live: iv-hist:GOLD
 * had a 2026-09-26 Saturday entry). A moment before the 09:00 IST open
 * belongs to the previous calendar day's session.
 */

import {
  isTradingHoliday,
  getHolidayReopenMinutes,
  getHolidayEarlyCloseMinutes,
  getSpecialOpenWindowMinutes,
  hasSessionOverride,
} from './holidays.js'
import { isWithinMcxHours, istParts } from './mcxHours.js'

const IST_OFFSET_MS = 5.5 * 3600 * 1000
const SESSION_OPEN_IST_MINUTES = 9 * 60

/** IST calendar date (YYYY-MM-DD) of a moment. */
export function istDate(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * The trading session (YYYY-MM-DD) that `now` belongs to, or null when that
 * day was not a trading day at all (weekend/holiday) — callers must write
 * nothing rather than invent a value for a day the market was shut. A date
 * with a partial-holiday override (see holidays.js) still traded some part
 * of the day, so it counts as a session even though isTradingHoliday(date)
 * is true (e.g. the evening brief run for Guru Nanak Jayanti's evening
 * session must not be filed under "no session").
 */
export function tradingSessionDate(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  if (minutes < SESSION_OPEN_IST_MINUTES) ist.setUTCDate(ist.getUTCDate() - 1)
  const date = ist.toISOString().slice(0, 10)
  if (!isTradingHoliday(date)) return date
  return hasSessionOverride(date) ? date : null
}

/**
 * Whether MCX is open right now: trading hours (DST-aware close, see
 * mcxHours.js) on a day that is not an exchange holiday. The single server-
 * side answer to "is the market open" — replaces four copies that each
 * hard-coded a 23:30 close and mostly ignored holidays.
 *
 * Three partial-holiday shapes, all from holidays.js, override the plain
 * weekday/holiday check: a special one-off window (e.g. the Diwali Muhurat
 * session on a Sunday) checked first since it can open an otherwise fully
 * closed day; an early close (e.g. New Year's Day: morning open, evening
 * closed); and a late reopen (e.g. Guru Nanak Jayanti: morning closed,
 * evening trades normally).
 */
export function isMcxOpen(now = new Date()) {
  const date    = istDate(now)
  const minutes = istParts(now).minutes

  if (!isWithinMcxHours(now)) {
    // Outside the plain weekday 9 AM–close window (including every weekend
    // day) — only a one-off special window can still open it, so this is the
    // only place a weekend touches holidays.js at all.
    const special = getSpecialOpenWindowMinutes(date)
    return !!special && minutes >= special.start && minutes < special.end
  }

  const earlyCloseMinutes = getHolidayEarlyCloseMinutes(date)
  if (earlyCloseMinutes != null) return minutes < earlyCloseMinutes

  if (!isTradingHoliday(date)) return true

  const reopenMinutes = getHolidayReopenMinutes(date)
  return reopenMinutes != null && minutes >= reopenMinutes
}

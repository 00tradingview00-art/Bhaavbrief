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

import { isTradingHoliday } from './holidays.js'
import { isWithinMcxHours } from './mcxHours.js'

const IST_OFFSET_MS = 5.5 * 3600 * 1000
const SESSION_OPEN_IST_MINUTES = 9 * 60

/** IST calendar date (YYYY-MM-DD) of a moment. */
export function istDate(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * The trading session (YYYY-MM-DD) that `now` belongs to, or null when that
 * day was not a trading day (weekend/holiday) — callers must write nothing
 * rather than invent a value for a day the market was shut.
 */
export function tradingSessionDate(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  if (minutes < SESSION_OPEN_IST_MINUTES) ist.setUTCDate(ist.getUTCDate() - 1)
  const date = ist.toISOString().slice(0, 10)
  return isTradingHoliday(date) ? null : date
}

/**
 * Whether MCX is open right now: trading hours (DST-aware close, see
 * mcxHours.js) on a day that is not an exchange holiday. The single server-
 * side answer to "is the market open" — replaces four copies that each
 * hard-coded a 23:30 close and mostly ignored holidays.
 */
export function isMcxOpen(now = new Date()) {
  return isWithinMcxHours(now) && !isTradingHoliday(istDate(now))
}

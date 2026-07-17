// Code-review follow-up: this used to be a third, independent reimplementation
// of "is this a trading day" (the other two: scripts/lib/holidays.js for the
// Node CLI scripts, and an inline copy that lived in app/api/health/route.ts).
// Reusing scripts/lib/holidays.js as the single source of truth here — and
// having app/api/health/route.ts import from this file — collapses that back
// to one implementation. It also fixes a real bug found while doing this: the
// health-route and old tradingCalendar copies anchored their weekday check on
// `dateStr + 'T00:00:00+05:30'`, which is midnight IST — a moment that falls
// on the PREVIOUS calendar day in UTC. Under a UTC-default runtime (GitHub
// Actions and Vercel serverless both default to UTC), `.getDay()` on that
// Date object returns the previous day's weekday. Verified concretely: a real
// Monday (2026-07-20) evaluated as Sunday under TZ=UTC, so
// app/api/health/route.ts's isWeekend() returned true on every Monday,
// meaning the health check has been silently unable to detect a missing
// Monday brief. scripts/lib/holidays.js anchors on `T05:30:00Z` instead (a
// moment safely inside the same calendar day in both UTC and IST), which does
// not have this bug — that's why it's the one being kept as the source of
// truth rather than the other way around.
import { isTradingHoliday, todayIST } from '../scripts/lib/holidays.js'

export { todayIST }

export function isTradingDay(dateStr: string): boolean {
  return !isTradingHoliday(dateStr)
}

// Converts an arbitrary ISO timestamp to its IST calendar date. Previously
// isTodaysBriefDelayed compared todayIST() (IST-shifted) against a raw UTC
// slice of the brief's date field — two different date bases. It happened to
// be silently correct only because both publishing workflows run at hours far
// from the UTC/IST midnight-crossing window (9:00 AM and 11:45 PM IST); a
// schedule change or an odd-hour manual trigger would have broken the
// comparison without anyone noticing. Returns null on an unparseable
// timestamp rather than throwing — callers treat null as "not today," which
// correctly surfaces the delayed banner instead of crashing the page render
// on bad pipeline data.
export function toISTDate(isoTimestamp: string): string | null {
  const d = new Date(isoTimestamp)
  if (isNaN(d.getTime())) return null
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Deadline after which a trading day without a fresh brief counts as
// "delayed" — gives generate-brief.yml plus its watchdog time to run/recover.
// Overridable via env since it's a tuning knob, not a fact about the world.
// Exported so app/api/health/route.ts uses the identical deadline instead of
// maintaining its own copy of the same number that could drift out of sync.
export const BRIEF_DEADLINE_IST_MINUTES = Number(process.env.BRIEF_DEADLINE_IST_MINUTES ?? 10 * 60)

export function istMinutesSinceMidnight(): number {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return ist.getHours() * 60 + ist.getMinutes()
}

export function isTodaysBriefDelayed(latestBriefDateISO: string | undefined): boolean {
  const today = todayIST()
  if (!isTradingDay(today)) return false
  if (istMinutesSinceMidnight() < BRIEF_DEADLINE_IST_MINUTES) return false
  const latestDate = latestBriefDateISO ? toISTDate(latestBriefDateISO) : null
  return latestDate !== today
}

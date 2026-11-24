/**
 * MCX trading holiday check.
 * MCX follows NSE's commodity/bond market (CBM) holiday schedule.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Where the calendar can live. In the Next.js server bundle, import.meta.url
// is baked in at build time as the BUILD machine's absolute path (e.g.
// /vercel/path0/scripts/lib/holidays.js), which doesn't exist where the
// function runs (/var/task) — so the script-relative path alone silently
// found nothing in production and every holiday read as a trading day.
// process.cwd() is the app root in production and the repo root for the
// GitHub Actions scripts; the script-relative path covers running a script
// from another directory.
const CANDIDATE_FILES = [
  path.join(process.cwd(), 'data/market-holidays.json'),
  path.join(__dirname, '../../data/market-holidays.json'),
]

// Most MCX holidays close the exchange all day, but several only affect one
// session — e.g. Guru Nanak Jayanti closes 9 AM–5 PM and reopens for a normal
// evening session; New Year's Day is the reverse (morning open, evening
// closed); the Diwali Laxmi Pujan Muhurat session briefly opens an otherwise-
// closed Sunday. NSE's holiday-master API (scripts/fetch-holidays.js) only
// reports date + description, not session splits, and that script overwrites
// market-holidays.json wholesale every week — so these session overrides live
// in their own file, which the weekly fetch never touches, and which must be
// re-checked against MCX's annual trading-holiday circular every year.
const PARTIAL_HOLIDAY_CANDIDATE_FILES = [
  path.join(process.cwd(), 'data/mcx-partial-holidays.json'),
  path.join(__dirname, '../../data/mcx-partial-holidays.json'),
]

let reportedMissing = false

function loadHolidays() {
  for (const file of CANDIDATE_FILES) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
      console.error(`[holidays] could not read ${file}:`, err.message)
    }
  }
  if (!reportedMissing) {
    reportedMissing = true
    console.error('[holidays] market-holidays.json not found — every weekday will be treated as a trading day. Looked in:', CANDIDATE_FILES.join(', '))
  }
  return []
}

function loadPartialHolidays() {
  for (const file of PARTIAL_HOLIDAY_CANDIDATE_FILES) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (err) {
      console.error(`[holidays] could not read ${file}:`, err.message)
    }
  }
  return []
}

function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

function partialHolidayEntry(dateStr) {
  const date = dateStr ?? todayIST()
  return loadPartialHolidays().find(h => h.date === date) ?? null
}

/**
 * Minutes after IST midnight at which trading resumes on a morning-closed
 * partial holiday (e.g. Guru Nanak Jayanti), or null if this date has no
 * such override.
 */
export function getHolidayReopenMinutes(dateStr) {
  const entry = partialHolidayEntry(dateStr)
  return entry?.reopensAtIST ? minutesOf(entry.reopensAtIST) : null
}

/**
 * Minutes after IST midnight at which trading stops early on an
 * evening-closed partial holiday (e.g. New Year's Day), or null if this
 * date has no such override.
 */
export function getHolidayEarlyCloseMinutes(dateStr) {
  const entry = partialHolidayEntry(dateStr)
  return entry?.closesAtIST ? minutesOf(entry.closesAtIST) : null
}

/**
 * A one-off open window on a date that is otherwise fully closed (e.g. the
 * Diwali Laxmi Pujan Muhurat session on a Sunday) — { start, end } in
 * minutes after IST midnight, or null if this date has no such override.
 * Independent of isTradingHoliday/weekend status: callers should check this
 * before, not after, the normal weekday/holiday gate.
 */
export function getSpecialOpenWindowMinutes(dateStr) {
  const entry = partialHolidayEntry(dateStr)
  if (!entry?.specialOpenIST) return null
  const start = minutesOf(entry.specialOpenIST.start)
  const end   = minutesOf(entry.specialOpenIST.end)
  return start != null && end != null ? { start, end } : null
}

/**
 * Human-readable reason for today's session status — the partial-holiday
 * override's own description if one applies, else the plain holiday name
 * from the main calendar, else null on an ordinary trading day.
 */
export function getSessionNote(dateStr) {
  const date = dateStr ?? todayIST()
  return partialHolidayEntry(date)?.description ?? getHolidayName(date)
}

/**
 * Whether a date — holiday-listed or not — has a partial-holiday override
 * (a real session still trades some part of it). Used to tell "closed all
 * day" apart from "closed/open for only part of the day" without caring
 * which of the three override shapes applies.
 */
export function hasSessionOverride(dateStr) {
  const entry = partialHolidayEntry(dateStr)
  return !!(entry?.reopensAtIST || entry?.closesAtIST || entry?.specialOpenIST)
}

/**
 * Whether the holiday calendar loaded, and the latest year it covers — so
 * the health check can alert instead of the calendar silently going empty
 * (or running out at year end).
 * @returns {{ loaded: boolean, latestYear: number | null }}
 */
export function holidayCalendarStatus() {
  const holidays = loadHolidays()
  const years = holidays.map(h => Number(String(h.date).slice(0, 4))).filter(Number.isFinite)
  return { loaded: holidays.length > 0, latestYear: years.length ? Math.max(...years) : null }
}

/**
 * Returns the current date in IST as YYYY-MM-DD. `now` is injectable so
 * callers that need a deterministic IST date in tests don't reimplement the
 * offset — this module owns that fact (C-01).
 */
export function todayIST(now = Date.now()) {
  return new Date(now + 5.5 * 3600000).toISOString().slice(0, 10)
}

/** Hour of day in IST (0–23) as a float, so 19:30 IST reads 19.5. */
export function hourIST(now = Date.now()) {
  const ist = new Date(now + 5.5 * 3600000)
  return ist.getUTCHours() + ist.getUTCMinutes() / 60
}

/**
 * Returns true if the given date (YYYY-MM-DD, defaults to today IST) is
 * a weekend or a declared MCX/NSE market holiday.
 */
export function isTradingHoliday(dateStr) {
  const date = dateStr ?? todayIST()
  const dow = new Date(date + 'T05:30:00Z').getDay() // 0=Sun,6=Sat
  if (dow === 0 || dow === 6) return true
  const holidays = loadHolidays()
  return holidays.some(h => h.date === date)
}

/**
 * Returns the holiday description for a given date, or null if not a holiday.
 */
export function getHolidayName(dateStr) {
  const date = dateStr ?? todayIST()
  const holidays = loadHolidays()
  return holidays.find(h => h.date === date)?.description ?? null
}

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

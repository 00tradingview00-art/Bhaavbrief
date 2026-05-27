/**
 * MCX trading holiday check.
 * MCX follows NSE's commodity/bond market (CBM) holiday schedule.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HOLIDAYS_FILE = path.join(__dirname, '../../data/market-holidays.json')

function loadHolidays() {
  try {
    return JSON.parse(fs.readFileSync(HOLIDAYS_FILE, 'utf8'))
  } catch {
    return []
  }
}

/**
 * Returns the current date in IST as YYYY-MM-DD.
 */
export function todayIST() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
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

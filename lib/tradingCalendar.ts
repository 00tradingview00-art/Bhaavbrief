import fs from 'fs'
import path from 'path'

function loadHolidays(): Array<{ date: string }> {
  try {
    const file = path.join(process.cwd(), 'data/market-holidays.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return []
  }
}

export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// Code-review finding: isTodaysBriefDelayed previously compared todayIST()
// (IST-shifted) against a raw UTC slice of the brief's date field — two
// different date bases. It happened to be silently correct only because both
// publishing workflows run at hours far from the UTC/IST midnight-crossing
// window (9:00 AM and 11:45 PM IST); a schedule change or an odd-hour manual
// trigger would have broken the comparison without anyone noticing. Returns
// null on an unparseable timestamp rather than throwing — callers treat null
// as "not today," which correctly surfaces the delayed banner instead of
// crashing the page render on bad pipeline data.
function toISTDate(isoTimestamp: string): string | null {
  const d = new Date(isoTimestamp)
  if (isNaN(d.getTime())) return null
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function isTradingDay(dateStr: string): boolean {
  const day = new Date(dateStr + 'T00:00:00+05:30').getDay()
  if (day === 0 || day === 6) return false
  return !loadHolidays().some(h => h.date === dateStr)
}

// Mirrors app/api/health/route.ts's checkBrief() deadline (10:00 AM IST gives
// generate-brief.yml plus its watchdog time to run/recover) but exposed for
// UI banners rather than just the internal health endpoint — added after the
// 2026-07-16 missed brief went unnoticed on-site until an external audit.
const BRIEF_DEADLINE_IST_MINUTES = 10 * 60

function istMinutesSinceMidnight(): number {
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

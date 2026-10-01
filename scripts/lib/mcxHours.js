/**
 * MCX trading hours — pure clock logic, no file access, so it is safe in the
 * browser bundle (lib/options.ts, TickerStrip) as well as on the server and
 * in plain-Node scripts. Holiday awareness lives one layer up in
 * mcxSession.js (it reads data/market-holidays.json, server-only).
 *
 * MCX's session closes at 23:30 IST while US daylight saving is in effect and
 * at 23:55 IST otherwise (roughly November to March) — every copy of this
 * logic before hard-coded 23:30, which would have closed the market 25
 * minutes early all winter.
 */

const IST_OFFSET_MS = 5.5 * 3600 * 1000

export const MCX_OPEN_MINUTES_IST = 9 * 60
export const MCX_CLOSE_MINUTES_IST_US_DST = 23 * 60 + 30
export const MCX_CLOSE_MINUTES_IST_WINTER = 23 * 60 + 55

/** Day of month of the nth Sunday of a month (month 0-based). */
function nthSunday(year, month, n) {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay()
  return 1 + ((7 - firstDow) % 7) + (n - 1) * 7
}

/**
 * Whether US daylight saving is in effect for an IST trading date
 * (YYYY-MM-DD): from the second Sunday of March up to the first Sunday of
 * November. Both switches happen on a Sunday, when MCX is shut, so the new
 * close applies from the Monday session onward.
 */
export function isUsDst(dateStr) {
  const year = Number(dateStr.slice(0, 4))
  const pad = n => String(n).padStart(2, '0')
  const start = `${year}-03-${pad(nthSunday(year, 2, 2))}`
  const end = `${year}-11-${pad(nthSunday(year, 10, 1))}`
  return dateStr >= start && dateStr < end
}

/** Session close for an IST trading date, in minutes after IST midnight. */
export function mcxCloseMinutesIST(dateStr) {
  return isUsDst(dateStr) ? MCX_CLOSE_MINUTES_IST_US_DST : MCX_CLOSE_MINUTES_IST_WINTER
}

/** IST calendar date, minutes after IST midnight and weekday (0 = Sunday) of a moment. */
export function istParts(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  return {
    date: ist.toISOString().slice(0, 10),
    minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes(),
    dow: ist.getUTCDay(),
  }
}

/**
 * Inside MCX trading hours on a weekday (09:00 to the DST-dependent close,
 * IST). Does NOT know exchange holidays — server code should use
 * mcxSession.js isMcxOpen(), which adds them.
 */
export function isWithinMcxHours(now = new Date()) {
  const { date, minutes, dow } = istParts(now)
  if (dow === 0 || dow === 6) return false
  return minutes >= MCX_OPEN_MINUTES_IST && minutes < mcxCloseMinutesIST(date)
}

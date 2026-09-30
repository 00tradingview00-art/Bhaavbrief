// Rules for what the nightly IV snapshot (app/api/cron/iv-snapshot) may
// store as a day's ATM IV. Every corrupt point found in iv-hist:* on
// 2026-09-30 (e.g. GOLD 1.17, CRUDEOIL 0.86, SILVERM 0.21 against normal
// 20–60) was written via the 'stale-traded' fallback on or right after that
// commodity's option expiry — thin/dead quotes priced with almost no time
// left produce near-zero implied volatilities.

const DAY_MS = 24 * 3600 * 1000

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

/**
 * The expiry to snapshot for a session: the nearest one with at least
 * `minDays` calendar days left. An expiring series' options stop trading
 * during its last session, so its end-of-day quotes aren't a real IV reading.
 * Returns null when no expiry qualifies (caller skips the day).
 */
export function snapshotExpiry(expiries: string[], sessionDate: string, minDays = 2): string | null {
  return [...expiries].sort().find(e => daysBetween(sessionDate, e) >= minDays) ?? null
}

export const MIN_PLAUSIBLE_ATM_IV = 5
export const MAX_IV_VS_MEDIAN = 3

/**
 * Whether an ATM IV reading is plausible enough to store. MCX commodity ATM
 * IVs sit roughly between 10 and 100 — a reading under 5 is a pricing
 * artefact, not a market. Against its own trailing median (when there is
 * enough history), a reading beyond 3× or below ⅓ of it is likewise treated
 * as bad data (live example: NATURALGAS 8.65 against a ~47 median).
 * Returns a rejection reason, or null when the value is acceptable.
 */
export function implausibleIVReason(iv: number, trailing: number[]): string | null {
  if (!Number.isFinite(iv) || iv < MIN_PLAUSIBLE_ATM_IV) {
    return `below ${MIN_PLAUSIBLE_ATM_IV}% floor`
  }
  if (trailing.length >= 5) {
    const sorted = [...trailing].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    if (median > 0 && iv > median * MAX_IV_VS_MEDIAN) {
      return `more than ${MAX_IV_VS_MEDIAN}× the trailing median (${median})`
    }
    if (median > 0 && iv < median / MAX_IV_VS_MEDIAN) {
      return `less than 1/${MAX_IV_VS_MEDIAN} of the trailing median (${median})`
    }
  }
  return null
}

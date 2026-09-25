// Translates iVIX (annualized implied volatility, in %) into an absolute ₹
// move a trader can actually picture — the number itself ("iVIX 59.7%")
// means nothing without this. Uses the same calendar-day/365 time-to-expiry
// convention as lib/options.ts's own Black-76 T calculation, so this stays
// consistent with the Greeks computed from the same iVIX reading rather than
// silently mixing in a 252-trading-day convention.
export function daysToExpiry(expiryISO: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(expiryISO).getTime() - now) / 86_400_000))
}

/** 1-standard-deviation ₹ move the option market is pricing in by expiry. */
export function expectedMoveToExpiry(futurePrice: number, ivixPct: number, daysToExpiryCount: number): number | null {
  if (!(futurePrice > 0) || !(ivixPct > 0) || daysToExpiryCount <= 0) return null
  return futurePrice * (ivixPct / 100) * Math.sqrt(daysToExpiryCount / 365)
}

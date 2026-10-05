/**
 * scripts/lib/mcxPreOpen.mjs — has MCX traded since its last close?
 *
 * Before the 9:00 AM IST open, Kite reports every MCX contract's last price
 * as its previous close, so the snapshot's MCX changePct is exactly 0
 * across the board. That is "not traded yet", not "flat" — but the 05 Oct
 * 2026 brief (written at 08:37 IST) read it as a signal ("Copper ... has not
 * moved, and that flatness ... means manufacturing expectations are neither
 * strengthening nor deteriorating").
 *
 * Every MCX contract closing exactly unchanged after a real session doesn't
 * happen, so "all of them at their previous close" is a reliable pre-open
 * test without depending on the clock or the holiday calendar.
 */

const MIN_INSTRUMENTS = 3

/** @param {{instruments?: Record<string, {price?: number, prevClose?: number}>}} snapshot */
export function mcxNotYetTraded(snapshot) {
  const mcx = Object.entries(snapshot?.instruments ?? {})
    .filter(([key, d]) => key.startsWith('MCX_') && d?.price > 0 && d?.prevClose > 0)
  if (mcx.length < MIN_INSTRUMENTS) return false
  return mcx.every(([, d]) => d.price === d.prevClose)
}

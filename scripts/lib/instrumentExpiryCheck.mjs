/**
 * scripts/lib/instrumentExpiryCheck.mjs — fail-fast check for an expired
 * MCX contract token in data/kite-instruments.json.
 *
 * An expired contract is a deterministic condition — no live Kite response
 * can make it not-stale. Checking the expiry date directly, before any
 * fetch is attempted, catches it for free instead of paying for a full
 * Sonnet brief-generation call that validate-brief.mjs's STALE-INSTRUMENT
 * check (scripts/lib/staleInstrumentCheck.mjs) is certain to reject
 * afterward. See 2026-08-05/06: an expired GOLD26AUGFUT token went unnoticed
 * until the gate rejected several already-generated briefs.
 */

// The 5 core instruments every brief discusses — matches
// staleInstrumentCheck.mjs's own scope. Zinc/lead/aluminium/nickel are
// secondary and not consistently cited, so an expiry there doesn't
// guarantee a gate rejection the way these five do.
export const CORE_INSTRUMENTS = ["gold", "silver", "crude", "copper", "natgas"];

/**
 * @param {Record<string, {symbol?: string, expiry?: string}>} instruments - parsed kite-instruments.json
 * @param {string} today - YYYY-MM-DD (IST), e.g. from scripts/lib/holidays.js's todayIST()
 * @returns {Array<{key: string, symbol?: string, expiry: string}>} expired core instruments, empty if none
 */
export function getExpiredCoreInstruments(instruments, today) {
  return CORE_INSTRUMENTS
    .map((key) => ({ key, ...instruments?.[key] }))
    .filter(({ expiry }) => expiry && expiry <= today);
}

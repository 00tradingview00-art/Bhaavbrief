/**
 * lib/parity.mjs — C-04 unit discipline: the one tested module that does
 * gold/silver import-parity conversion. Previously this math lived inline
 * in scripts/fetch-snapshot.mjs only — correct, but untested and
 * unextractable, so nothing else could safely reuse it.
 *
 * Named .mjs, not .ts (the master doc's own naming), because the primary
 * caller — scripts/fetch-snapshot.mjs — is a plain Node ESM script run
 * outside Next's bundler/TypeScript loader and cannot import a .ts file
 * directly. This repo's existing convention (scripts/lib/holidays.js,
 * imported by lib/tradingCalendar.ts) already relies on the same
 * direction: plain JS/MJS modules are importable from both plain Node
 * scripts AND TypeScript app code (tsconfig has allowJs: true), so this
 * file can still become "the module the Price Bridge, the gate, and the
 * brief generator all call" without adding a TS-execution runtime to the
 * scripts/ pipeline.
 */

export const TROY_OZ_TO_GRAMS = 31.1035

function roundTo(n, decimals) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals
}

/** USD/troy-oz COMEX gold + USD/INR -> INR per 10g import parity. */
export function computeImportParityGoldINR(goldUSD, usdinr) {
  if (!(goldUSD > 0) || !(usdinr > 0)) return 0
  return Math.round((goldUSD / TROY_OZ_TO_GRAMS) * 10 * usdinr)
}

/**
 * USD/troy-oz COMEX silver + USD/INR -> INR per kg import parity.
 * MCX silver is quoted per kg (vs COMEX per troy oz), hence x1000 not x10 —
 * the gold/silver conversion factors are NOT interchangeable; this is
 * exactly the kind of unit mistake C-04 exists to prevent by centralizing.
 */
export function computeImportParitySilverINR(silverUSD, usdinr) {
  if (!(silverUSD > 0) || !(usdinr > 0)) return 0
  return Math.round((silverUSD / TROY_OZ_TO_GRAMS) * 1000 * usdinr)
}

/** % spread of the live MCX price above/below its import-parity price. */
export function computeSpreadPct(mcxPrice, parityPrice) {
  if (!(parityPrice > 0) || !(mcxPrice > 0)) return 0
  return roundTo(((mcxPrice - parityPrice) / parityPrice) * 100, 2)
}

export function computeGoldSilverRatio(goldUSD, silverUSD) {
  if (!(silverUSD > 0) || !(goldUSD > 0)) return 0
  return roundTo(goldUSD / silverUSD, 1)
}

/**
 * G-01/D-02 parity cross-check: gold and silver carry a similar import
 * duty/GST structure, so their MCX-vs-import-parity spreads should track
 * each other within a few points. Returns a warning object if the gap
 * exceeds tolerance (both spreads present and nonzero), else null.
 */
export function checkParityWedge(goldSpreadPct, silverSpreadPct, tolerancePts) {
  if (goldSpreadPct === 0 || silverSpreadPct === 0) return null
  const deltaPts = roundTo(Math.abs(goldSpreadPct - silverSpreadPct), 2)
  if (deltaPts <= tolerancePts) return null
  return {
    type: 'PARITY_WEDGE_DIVERGENCE',
    detail: `Gold import-parity spread ${goldSpreadPct}% vs silver ${silverSpreadPct}% — ${deltaPts}pt gap exceeds ${tolerancePts}pt tolerance. One metal's price feed (MCX or COMEX side) is likely stale or wrong.`,
    goldSpreadPct,
    silverSpreadPct,
    deltaPts,
  }
}

/**
 * scripts/lib/reelImpact.mjs — shared "is this worth a reel" rule.
 *
 * Two branches, mirroring the flash-news `reelWorthy` logic that already
 * runs in production (scripts/generate-news.js, price-action and RSS/geo
 * branches), extracted here so the daily brief can reuse the exact same bar
 * instead of a bespoke one, and so both call sites are covered by one
 * tested module (C-01: one owning module per fact — see CLAUDE.md).
 *
 *   1. PRICE branch: a single instrument's move is big enough on its own.
 *   2. GEO/POLICY branch: content is geopolitics/policy-tagged AND has a
 *      real (non-neutral) directional effect.
 *
 * Flash articles get branch 2's "non-neutral" signal from a per-article LLM
 * DIRECTION: tag (one instrument, one story). A daily brief covers MULTIPLE
 * instruments in one edition and has no such per-article call — so
 * isBriefHighImpact() below is a deliberate, explicitly-labeled ADAPTATION,
 * not a byte-identical reuse: it substitutes an LLM-judged single direction
 * with a numeric "did anything actually move" proxy across the brief's own
 * tracked instruments.
 */

// Same threshold generate-news.js already uses for price-action reelWorthy.
export const PRICE_MOVE_THRESHOLD_PCT = 1.5

// The brief's own 5 commodities (per CLAUDE.md's description of what the
// brief covers) — NOT the full instrument list in data/market-snapshot.json
// (which also tracks Nickel, Zinc, JPY/INR, etc. the brief never discusses).
export const TRACKED_INSTRUMENTS = ['MCX_GOLD', 'MCX_CRUDE', 'MCX_SILVER', 'MCX_COPPER', 'USDINR']

// Same geo/policy tag vocabulary classifyMood() already checks in
// generate-brief-reel.mjs — reusing this list (not inventing a second one)
// keeps "geopolitical" meaning one thing across mood-selection and impact-gating.
export const GEO_POLICY_TAGS = ['Geopolitics', 'War', 'OPEC', 'Fed', 'RBI', 'Macro']

// Same categories generate-news.js's RSS/geo branch treats as reel-worthy.
export const GEO_POLICY_CATEGORIES = ['Geopolitics', 'Policy']

// Below PRICE_MOVE_THRESHOLD_PCT on purpose — this branch exists to catch
// geo/policy days where no single instrument alone clears 1.5% but the
// story still showed up in prices for a real reason. A reasoned starting
// guess, not derived from an existing constant — worth revisiting after a
// few weeks of live data.
export const NON_FLAT_THRESHOLD_PCT = 0.5

/**
 * Branch 1 — price move alone clears the bar.
 * @param {number} pct - signed % change (e.g. signal.pct or instrument.changePct)
 */
export function isPriceMoveHighImpact(pct) {
  return Math.abs(pct ?? 0) >= PRICE_MOVE_THRESHOLD_PCT
}

/**
 * Branch 2, flash-news shape (unchanged rule, just extracted) — category +
 * LLM-judged impact.
 * @param {'bullish'|'bearish'|'neutral'} impact
 * @param {string} category
 */
export function isGeoPolicyHighImpact(impact, category) {
  return impact !== 'neutral' && GEO_POLICY_CATEGORIES.includes(category)
}

/**
 * Branch 2, BRIEF ADAPTATION — no per-article LLM direction call exists for
 * a brief, so "real directional effect" is approximated as: the brief is
 * tagged with a geo/policy tag AND at least one of its tracked instruments
 * moved meaningfully (>= NON_FLAT_THRESHOLD_PCT) that day — i.e. the
 * geo/policy story actually showed up in prices, not background news over
 * a flat tape.
 * @param {string[]} tags - brief frontmatter tags
 * @param {Record<string, {changePct?: number}>} instruments - snapshot.instruments
 */
export function isBriefGeoPolicyHighImpact(tags, instruments) {
  const isGeo = (tags ?? []).some((t) => GEO_POLICY_TAGS.includes(t))
  if (!isGeo) return false
  return TRACKED_INSTRUMENTS.some((key) => Math.abs(instruments?.[key]?.changePct ?? 0) >= NON_FLAT_THRESHOLD_PCT)
}

/**
 * Top-level brief gate — ORs both branches, checked only across the brief's
 * own 5 tracked instruments (a big move in something the brief never
 * discusses shouldn't flag it as "high impact").
 * @param {string[]} tags
 * @param {Record<string, {changePct?: number}>} instruments
 * @returns {{ highImpact: boolean, reason: string|null }}
 */
export function isBriefHighImpact(tags, instruments) {
  for (const key of TRACKED_INSTRUMENTS) {
    const pct = instruments?.[key]?.changePct
    if (isPriceMoveHighImpact(pct)) {
      return { highImpact: true, reason: `price:${key}:${pct.toFixed(2)}%` }
    }
  }
  if (isBriefGeoPolicyHighImpact(tags, instruments)) {
    return { highImpact: true, reason: 'geo-policy-tag-with-nonflat-move' }
  }
  return { highImpact: false, reason: null }
}

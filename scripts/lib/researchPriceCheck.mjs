/**
 * scripts/lib/researchPriceCheck.mjs — the research gate's loose price
 * sanity check (validate-research.mjs step 3), as a pure function.
 *
 * It read `snapshot.prices.<commodity>.mcx`, but market-snapshot.json has no
 * `prices` key — prices live under `instruments.MCX_*.price` — so every
 * reference price was undefined and the check silently never ran. This
 * reads the real shape. Switching the old matching on as-is would have
 * rejected three of the four published articles on false positives (any ₹
 * figure within 60 chars of any commodity word — premiums, spreads, another
 * metal's price), so a figure is now attributed to the nearest commodity
 * named just before it and only price-sized figures are compared.
 *
 * Research prices come from a live chain at generation time, not the
 * snapshot, so a generous 25% band is deliberate: it catches a wrong order of
 * magnitude or the wrong commodity's price, not rupee-level drift.
 */

export const PRICE_TOLERANCE = 0.25

const SNAPSHOT_KEY = {
  gold: 'MCX_GOLD', silver: 'MCX_SILVER', crude: 'MCX_CRUDE', copper: 'MCX_COPPER', natgas: 'MCX_NATGAS',
}
const COMMODITY_WORD = /\b(gold|silver|copper|crude|oil|nat(?:ural)?\s*gas)\b/gi
const RUPEE_FIGURE = /₹\s?([\d,]+(?:\.\d+)?)/g
const ATTRIBUTION_WINDOW = 40
// A figure below this fraction of the commodity's price is not a price quote
// (option premium, spread, range width, P&L — "within ₹44", "₹15,445.6") and
// is not compared. Anything price-sized that is >25% off is still caught.
const MIN_PRICE_FRACTION = 0.2

function commodityOf(word) {
  const w = word.toLowerCase()
  if (w === 'oil' || w === 'crude') return 'crude'
  if (w.startsWith('nat')) return 'natgas'
  return w
}

/**
 * @param {string} body research article body (frontmatter stripped)
 * @param {Record<string, {price?: number}>} instruments market-snapshot.json `instruments`
 * @returns {string[]} PRICE-SANITY issue messages
 */
export function priceSanityIssues(body, instruments) {
  const issues = []
  for (const m of body.matchAll(RUPEE_FIGURE)) {
    // Attribute the figure to the nearest commodity named just before it,
    // with no other ₹ figure in between.
    const before = body.slice(Math.max(0, m.index - ATTRIBUTION_WINDOW), m.index)
    if (before.includes('₹')) continue
    const words = [...before.matchAll(COMMODITY_WORD)]
    if (!words.length) continue
    const commodity = commodityOf(words[words.length - 1][1])
    const refPrice = instruments?.[SNAPSHOT_KEY[commodity]]?.price
    if (!(refPrice > 0)) continue
    const stated = parseFloat(m[1].replace(/,/g, ''))
    if (!Number.isFinite(stated) || stated < refPrice * MIN_PRICE_FRACTION) continue
    const deviation = Math.abs(stated - refPrice) / refPrice
    if (deviation > PRICE_TOLERANCE) {
      issues.push(`PRICE-SANITY: "₹${m[1]}" stated for ${commodity} is ${(deviation * 100).toFixed(0)}% off the snapshot MCX price (₹${refPrice}) — possible wrong commodity or hallucinated figure`)
    }
  }
  return issues
}

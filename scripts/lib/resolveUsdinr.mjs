/**
 * scripts/lib/resolveUsdinr.mjs — USDINR source precedence: Kite CDS, then
 * Yahoo, then Frankfurter ECB rate.
 *
 * Kite preferred because it's the same live NSE-regulated feed already used
 * for MCX commodities and EUR/GBP/JPY-INR. Before 2026-08-27, USDINR came
 * from Yahoo only — a narrow `range=2d` chart query hit a gap in Yahoo's own
 * daily data (2026-08-26) and deterministically returned a two-day-stale
 * prevClose, falsely tripping the publish gate's 1.5% FX sanity band. Yahoo
 * and Frankfurter stay as fallbacks for when Kite itself is unavailable.
 */

/**
 * @param {{price: number, prevClose: number, changePct: number} | null | undefined} kiteQuote
 *   result of fetchKiteCurrencies()?.usdinr (CDS front-month future)
 * @param {{price: number, prevClose: number, changePct: number} | null | undefined} yahooQuote
 *   result of yahooMap.USDINR (Yahoo INR=X spot)
 * @param {number | null | undefined} frankfurterRate
 *   ECB reference rate (a single number, not a quote object)
 * @param {number | null | undefined} priorPrice
 *   existing snapshot's USDINR.price — used only to derive a synthetic
 *   prevClose when falling back to Frankfurter, which has no prevClose of its own
 * @returns {{price: number, prevClose: number, changePct: number, unit: 'INR'} | null}
 */
export function resolveUsdinr(kiteQuote, yahooQuote, frankfurterRate, priorPrice) {
  if (kiteQuote?.price > 0) {
    return { price: kiteQuote.price, prevClose: kiteQuote.prevClose, changePct: kiteQuote.changePct, unit: 'INR' }
  }
  if (yahooQuote?.price > 0) {
    return { price: yahooQuote.price, prevClose: yahooQuote.prevClose, changePct: yahooQuote.changePct, unit: 'INR' }
  }
  if (typeof frankfurterRate === 'number' && frankfurterRate > 0) {
    const prev = priorPrice > 0 ? priorPrice : frankfurterRate
    return {
      price: frankfurterRate,
      prevClose: prev,
      changePct: prev > 0 ? ((frankfurterRate - prev) / prev) * 100 : 0,
      unit: 'INR',
    }
  }
  return null
}

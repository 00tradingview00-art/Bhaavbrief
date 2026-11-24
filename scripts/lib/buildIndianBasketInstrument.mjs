/**
 * scripts/lib/buildIndianBasketInstrument.mjs — turns a raw
 * lib/indianBasketCrude.mjs fetch result into a snapshot instrument
 * entry. Pulled out of fetch-snapshot.mjs's main() (same reason as
 * resolveUsdinr.mjs: a branching decision worth its own unit tests,
 * not just an inline block).
 *
 * PPAC's Indian Basket crude is a periodic report, not a live quote — it
 * carries its own asOfDate (the date the figure is *for*, days behind
 * today) rather than this run's generatedAt. Never block the pipeline or
 * write a fabricated 0 if PPAC's AJAX call fails or its note wording
 * changes — this is a context benchmark, not a core instrument any gate
 * or duty-parity computation depends on.
 *
 * @param {{date: string, usdPerBbl: number} | null} fetched
 * @param {{price: number, asOfDate?: string} | undefined} existingInstrument
 * @returns {{price: number, prevClose: number, changePct: number, unit: string, asOfDate?: string, stale?: boolean} | null}
 */
export function buildIndianBasketInstrument(fetched, existingInstrument) {
  if (fetched) {
    const prevPrice = existingInstrument?.price > 0 ? existingInstrument.price : fetched.usdPerBbl
    if (existingInstrument?.asOfDate === fetched.date) {
      // Same report as last run — nothing new, keep it exactly as-is
      // rather than recomputing a 0% "change" against itself.
      return { ...existingInstrument, unit: 'USD/bbl' }
    }
    return {
      price:     fetched.usdPerBbl,
      prevClose: prevPrice,
      changePct: ((fetched.usdPerBbl - prevPrice) / prevPrice) * 100,
      unit:      'USD/bbl',
      asOfDate:  fetched.date,
    }
  }
  if (existingInstrument?.price > 0) {
    return { ...existingInstrument, unit: 'USD/bbl', stale: true }
  }
  return null
}

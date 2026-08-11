/**
 * Canonical mapping of topic keys to BhaavBrief Learn page URLs.
 * Used by the intelligence engine to inject approved internal links into
 * generated articles — prevents hallucinated URLs.
 *
 * Keys are descriptive slugs used in prompt injection; values are [title, path].
 * Add new entries here when new Learn pages are published.
 */

export const LEARN_LINKS = {
  'why-usdinr-affects-mcx-gold':      ['Why USD/INR Moves MCX Gold',                '/learn/why-usdinr-affects-mcx-gold'],
  'comex-vs-mcx-gold':                ['COMEX vs MCX Gold Price Formula',            '/learn/comex-vs-mcx-gold'],
  'mcx-lot-sizes':                    ['MCX Lot Sizes & Contract Details',            '/learn/mcx-lot-sizes'],
  'mcx-gold-contracts':               ['MCX Gold Contracts — Mini, Standard, Petal', '/learn/mcx-gold-contracts'],
  'mcx-commodity-tax-india':          ['MCX Commodity Tax — F&O Treatment',          '/learn/mcx-commodity-tax-india'],
  'mcx-rollover':                     ['MCX Contract Rollover Guide',                 '/learn/mcx-rollover'],
  'mcx-contract-expiry':              ['MCX Contract Expiry Explained',               '/learn/mcx-contract-expiry'],
  'mcx-margin-calculator':            ['MCX Margin Calculator',                       '/learn/mcx-margin-calculator'],
  'mcx-margin-calculation':           ['How MCX Margin Is Calculated',                '/learn/mcx-margin-calculation'],
  'mcx-circuit-limits':               ['MCX Circuit Limits & Price Bands',            '/learn/mcx-circuit-limits'],
  'mcx-trading-hours':                ['MCX Trading Hours (IST)',                     '/learn/mcx-trading-hours'],
  'mcx-order-types':                  ['MCX Order Types — Limit, Market, SL',        '/learn/mcx-order-types'],
  'best-time-to-trade-mcx':           ['Best Time to Trade MCX Commodities',         '/learn/best-time-to-trade-mcx'],
  'which-mcx-commodity-to-trade':     ['Which MCX Commodity Should You Trade?',      '/learn/which-mcx-commodity-to-trade'],
  'gold-etf-vs-mcx-gold':             ['Gold ETF vs MCX Gold Futures',               '/learn/gold-etf-vs-mcx-gold'],
  'mcx-gold-vs-physical-gold':        ['MCX Gold vs Physical Gold',                  '/learn/mcx-gold-vs-physical-gold'],
  'what-is-comex':                    ['What Is COMEX? The Global Gold Benchmark',   '/learn/what-is-comex'],
  'how-much-money-to-start-mcx':      ['How Much Capital Do You Need to Trade MCX?', '/learn/how-much-money-to-start-mcx-trading'],
}

/** Returns a compact prompt-ready string listing all approved learn links. */
export function formatApprovedLinks() {
  return Object.entries(LEARN_LINKS)
    .map(([, [title, url]]) => `  • ${title} → https://bhaavbrief.in${url}`)
    .join('\n')
}

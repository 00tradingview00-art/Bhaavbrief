export type MetricExplainer = {
  metric: string
  shows: string
  doesNotMean: string
  href: string
  linkLabel: string
}

const OPTION_CHAIN = { href: '/options', linkLabel: 'Explore the option chain' } as const

// Plain-language "what it shows / what it doesn't mean" copy for the tool
// pages' explain drawers. Kept in one place so the visual copy compliance
// test covers every line. IV Rank's copy lives in lib/ivPosition.ts.
export const METRIC_EXPLAINERS = {
  pcr: {
    metric: 'PCR',
    shows: 'Whether open positions in this expiry lean more towards puts or towards calls.',
    doesNotMean: 'It doesn’t predict direction or reveal why traders hold those positions.',
    ...OPTION_CHAIN,
  },
  maxPain: {
    metric: 'Max Pain',
    shows: 'The strike where option buyers as a group would lose the most at expiry, based on today’s open positions.',
    doesNotMean: 'It isn’t a price the market has to reach — futures often settle away from it.',
    ...OPTION_CHAIN,
  },
  openInterest: {
    metric: 'Open Interest',
    shows: 'Which strikes hold the most open call and put positions right now.',
    doesNotMean: 'Large positions don’t fix a price level, and they can change quickly as traders open or close them.',
    ...OPTION_CHAIN,
  },
  greeks: {
    metric: 'Greeks',
    shows: 'How an option’s premium tends to respond to changes in price, time to expiry and volatility.',
    doesNotMean: 'They describe sensitivity, not where the market is heading.',
    ...OPTION_CHAIN,
  },
  basis: {
    metric: 'Basis',
    shows: 'How far MCX prices are trading above or below the global benchmark in rupee terms.',
    doesNotMean: 'A gap isn’t a mispricing on its own — duty, taxes and local demand all affect it.',
    href: '/basis',
    linkLabel: 'See the basis history',
  },
} satisfies Record<string, MetricExplainer>

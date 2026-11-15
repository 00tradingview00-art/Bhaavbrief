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
  ivix: {
    metric: 'iVIX',
    shows: 'BhaavBrief’s estimate of the market’s expected annualized volatility for this commodity, drawn from at-the-money option prices.',
    doesNotMean: 'It describes how much movement options are pricing in, not which way the price is likely to move.',
    ...OPTION_CHAIN,
  },
  aav: {
    metric: '20D Avg',
    shows: 'BhaavBrief’s estimate of how much this commodity has actually moved over the recent weeks, for comparison against iVIX.',
    doesNotMean: 'It can differ from the exchange’s own published volatility figure by a few points, and it describes the past, not what happens next.',
    ...OPTION_CHAIN,
  },
  volPremium: {
    metric: 'Vol Premium',
    shows: 'Whether options are pricing in more movement (iVIX) than this commodity has actually shown recently (20D Avg).',
    doesNotMean: 'A positive or negative reading on its own doesn’t reveal which way the price will go.',
    ...OPTION_CHAIN,
  },
  oiVsLow: {
    metric: 'OI vs Low',
    shows: 'How much total open interest has been added across this chain since today’s lowest point intraday.',
    doesNotMean: 'It isn’t a day-over-day change, and a rising number on its own doesn’t reveal whether new positions are bullish or bearish.',
    ...OPTION_CHAIN,
  },
} satisfies Record<string, MetricExplainer>

// V3 visual grammar is chosen per mechanism, never by a one-size-fits-all card row.
const MODE_BY_ID = {
  'gold-india-story-001': 'comparison',
  'silver-solar-story-001': 'transmission',
  'crude-petrol-story-001': 'transmission',
  'copper-wire-story-001': 'transmission',
  'aluminium-power-story-001': 'transmission',
  'options-premium-story-001': 'options',
  'margin-exposure-story-001': 'contract',
  'what-is-mcx-001': 'exchange',
  'mcx-vs-jeweller-gold-001': 'comparison',
  'gold-mini-lot-001': 'contract',
  'india-vix-001': 'options',
  'mcx-hours-001': 'session',
  'comex-vs-mcx-001': 'comparison',
  'mcx-tick-value-001': 'contract',
  'crude-vs-petrol-001': 'transmission',
  'right-direction-losing-option-001': 'options',
  'margin-vs-risk-001': 'contract',
  'mcx-expiry-001': 'contract',
  'gold-price-labels-001': 'comparison',
  'india-gold-price-001': 'transmission',
  'silver-india-price-001': 'comparison',
}

export function visualPlanFor(reel) {
  return { mode: MODE_BY_ID[reel.id] ?? 'flow', labels: reel.steps }
}

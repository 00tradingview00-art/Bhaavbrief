export interface TableCard {
  type: 'table'
  section: string
  cardNum: string
  title: string
  subtitle?: string
  headers: string[]
  rows: string[][]
  note?: string
}

export interface BulletCard {
  type: 'bullets'
  section: string
  cardNum: string
  title: string
  subtitle?: string
  bullets: string[]
  note?: string
}

export type CardDef = TableCard | BulletCard

export const LEARN_CARDS: Record<string, CardDef> = {
  'gold-contracts': {
    type: 'table', section: 'CONTRACTS', cardNum: '1 OF 5',
    title: 'MCX Gold Contracts',
    subtitle: 'Standard · Mini · Guinea · Petal',
    headers: ['CONTRACT', 'LOT', 'MARGIN*', 'P&L/TICK'],
    rows: [
      ['Gold (Standard)', '1 kg',  '~₹5–7 lakh', '₹100'],
      ['Gold Mini',       '100g',  '~₹55–75K',   '₹10'],
      ['Gold Guinea',     '8g',    '~₹5–8K',     '₹1'],
      ['Gold Petal',      '1g',    '~₹700–1.2K', '₹1'],
    ],
    note: '* Approx SPAN margins at mid-2026 levels. Standard & Mini expire 5th of month. Guinea & Petal expire last day.',
  },
  'silver-contracts': {
    type: 'table', section: 'CONTRACTS', cardNum: '2 OF 5',
    title: 'MCX Silver Contracts',
    subtitle: 'Standard · Mini · Micro',
    headers: ['CONTRACT', 'LOT', 'MARGIN*', 'P&L/TICK'],
    rows: [
      ['Silver (Standard)', '30 kg', '~₹1.5–2.5L', '₹30'],
      ['Silver Mini',       '5 kg',  '~₹25–40K',   '₹5'],
      ['Silver Micro',      '1 kg',  '~₹5–8K',     '₹1'],
    ],
    note: 'Tick = ₹1/kg. Silver moves 2–3× more than gold in % terms — higher volatility, higher margin as % of contract.',
  },
  'energy-contracts': {
    type: 'table', section: 'CONTRACTS', cardNum: '3 OF 5',
    title: 'MCX Energy Contracts',
    subtitle: 'Crude Oil · Natural Gas',
    headers: ['CONTRACT', 'LOT', 'MARGIN*', 'P&L/TICK'],
    rows: [
      ['Crude Oil',    '100 bbl',     '~₹30–45K', '₹100'],
      ['Crude Mini',   '10 bbl',      '~₹3–5K',   '₹10'],
      ['Natural Gas',  '1,250 mmBtu', '~₹20–30K', '₹125'],
      ['NatGas Mini',  '250 mmBtu',   '~₹4–6K',   '₹25'],
    ],
    note: 'Crude expires 19–20th of month. NatGas expires 25th. EIA inventory data every Wednesday 8 PM IST is the key weekly event.',
  },
  'base-metals-1': {
    type: 'table', section: 'CONTRACTS', cardNum: '4 OF 5',
    title: 'Base Metals — I',
    subtitle: 'Copper · Aluminium',
    headers: ['CONTRACT', 'LOT', 'MARGIN*', 'P&L/TICK'],
    rows: [
      ['Copper',         '1,000 kg', '~₹80K–1.2L', '₹50'],
      ['Copper Mini',    '250 kg',   '~₹20–30K',   '₹12.5'],
      ['Aluminium',      '5,000 kg', '~₹25–40K',   '₹250'],
      ['Aluminium Mini', '1,000 kg', '~₹5–8K',     '₹50'],
    ],
    note: '"Dr Copper" = economic barometer. Aluminium tracks Indian infra spend. Tick = ₹0.05/kg. Both expire last day of month.',
  },
  'base-metals-2': {
    type: 'table', section: 'CONTRACTS', cardNum: '5 OF 5',
    title: 'Base Metals — II',
    subtitle: 'Zinc · Lead · Nickel',
    headers: ['CONTRACT', 'LOT', 'MARGIN*', 'P&L/TICK'],
    rows: [
      ['Zinc',        '5,000 kg', '~₹30–50K', '₹250'],
      ['Zinc Mini',   '1,000 kg', '~₹6–10K',  '₹50'],
      ['Lead',        '5,000 kg', '~₹50–70K', '₹250'],
      ['Lead Mini',   '1,000 kg', '~₹10–14K', '₹50'],
      ['Nickel',      '250 kg',   '~₹20–30K', '₹25'],
      ['Nickel Mini', '100 kg',   '~₹8–12K',  '₹10'],
    ],
    note: 'Nickel = most volatile MCX base metal (EV batteries + stainless steel). All expire last working day of month.',
  },
  'mcx-basics': {
    type: 'bullets', section: 'MCX BASICS', cardNum: '1 OF 2',
    title: 'What is MCX?',
    bullets: [
      "India's largest commodity derivatives exchange",
      'Regulated by SEBI since 2015',
      'Trades 9:00 AM – 11:30 PM IST (Mon–Fri)',
      "98% of India's commodity futures volume",
      'Daily turnover: ₹50,000+ crore',
      'Commodities: Gold, Silver, Crude, NatGas, Copper, Aluminium, Zinc, Lead, Nickel',
      'Separate commodity trading account needed (not equity demat)',
    ],
    note: 'MCX is where India\'s traders, jewellers, oil importers and merchants manage commodity price risk every day.',
  },
  'margin-leverage': {
    type: 'table', section: 'MCX BASICS', cardNum: '2 OF 2',
    title: 'Margin & Leverage',
    subtitle: 'What a 1% price move means in ₹',
    headers: ['CONTRACT', 'VALUE*', 'MARGIN ~6%', '1% MOVE'],
    rows: [
      ['Gold (1 kg)',      '~₹1 crore', '~₹6 lakh', '₹1,00,000'],
      ['Gold Mini (100g)', '~₹10 lakh', '~₹60,000', '₹10,000'],
      ['Silver (30 kg)',   '~₹30 lakh', '~₹1.8L',   '₹30,000'],
      ['Crude (100 bbl)',  '~₹6.5L',   '~₹39,000', '₹6,500'],
    ],
    note: '* Mid-2026 levels. MTM: daily P&L settled to account every evening. Buffer 20–30% above minimum margin to avoid forced squareoff.',
  },
  'how-prices-move': {
    type: 'table', section: 'MARKET DRIVERS', cardNum: '1 OF 1',
    title: 'Why MCX Prices Move',
    subtitle: '5 forces every trader must watch',
    headers: ['FORCE', 'HITS', 'MECHANISM'],
    rows: [
      ['USD/INR rate',  'All metals',   'Rupee ↓2% → MCX gold ↑₹2,200/10g even if COMEX flat'],
      ['COMEX/NYMEX',  'All',           'MCX tracks global benchmarks — gap closes within minutes'],
      ['Import duty',  'Gold/Silver',   '2% duty cut ≈ ₹2,000/10g fall in MCX gold — govt lever'],
      ['Geopolitics',  'Crude/Gold',    'Iran/OPEC news moves MCX crude within minutes of headline'],
      ['China PMI',    'Copper/Zinc',   'PMI >50 = metals rally. PMI <50 = sell. Data monthly.'],
    ],
    note: 'The rupee is the most overlooked factor in Indian commodity trading. Always watch USD/INR alongside the global price.',
  },
  'hedging': {
    type: 'bullets', section: 'HEDGING', cardNum: '1 OF 1',
    title: "Jeweller's Hedge",
    subtitle: 'Lock in today\'s price for a future purchase',
    bullets: [
      '₹50L gold order received — delivery in 45 days',
      'Risk: gold rises from ₹1,00,000 to ₹1,05,000/10g',
      'TODAY: buy MCX Gold futures at ₹1,00,000/10g',
      '30 days later: physical gold at ₹1,05,000/10g',
      'Sell futures → ₹5L profit offsets higher physical cost',
      'Net cost: ₹1,00,000/10g — exactly as planned',
    ],
    note: 'Gold Mini (100g, ~₹70K margin) is accessible for small jewellers. Hedge only committed exposure — not inventory.',
  },
  'taxation': {
    type: 'table', section: 'TAXATION', cardNum: '1 OF 1',
    title: 'MCX Trading Tax',
    subtitle: 'What you actually owe in India',
    headers: ['ITEM', 'RATE', 'KEY NOTE'],
    rows: [
      ['Income tax',        'Your slab rate',   'Non-speculative business income — file ITR-3'],
      ['CTT',               '0.01% sell side',  'Deductible as a business expense'],
      ['Exchange charge',   '~0.0026% both',    'Deductible'],
      ['GST on brokerage',  '18%',              'On brokerage + exchange charges'],
      ['Loss carry forward','8 years',           'Against other business income (not salary)'],
      ['STT',               'NIL',              'Does not apply to commodity futures'],
    ],
    note: 'No LTCG benefit for futures — all profits taxed at your slab rate regardless of holding period. Consult a CA for ITR-3 filing.',
  },
}

export const CARD_ORDER = [
  { slug: 'gold-contracts',      label: 'Gold Contracts',        highlight: 'Contracts' },
  { slug: 'silver-contracts',    label: 'Silver Contracts',      highlight: 'Contracts' },
  { slug: 'energy-contracts',    label: 'Energy Contracts',      highlight: 'Contracts' },
  { slug: 'base-metals-1',       label: 'Base Metals I',         highlight: 'Contracts' },
  { slug: 'base-metals-2',       label: 'Base Metals II',        highlight: 'Contracts' },
  { slug: 'mcx-basics',          label: 'What is MCX?',          highlight: 'MCX Basics' },
  { slug: 'margin-leverage',     label: 'Margin & Leverage',     highlight: 'MCX Basics' },
  { slug: 'how-prices-move',     label: 'Why Prices Move',       highlight: 'Market Drivers' },
  { slug: 'hedging',             label: "Jeweller's Hedge",      highlight: 'Hedging' },
  { slug: 'taxation',            label: 'MCX Trading Tax',       highlight: 'Taxation' },
]

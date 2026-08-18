import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

export const metadata = {
  title: 'MCX Contract Expiry 2026 — Gold, Silver, Crude Oil & Copper Expiry Dates',
  description: 'Complete guide to MCX contract expiry dates for gold, silver, crude oil, copper, and natural gas. What happens on expiry day, DVCAL settlement, when to exit vs rollover, and commodity-specific expiry rules.',
  keywords: [
    'MCX contract expiry date 2026',
    'when does MCX gold expire',
    'MCX silver expiry date',
    'MCX crude oil expiry',
    'MCX contract settlement',
    'MCX DVCAL price',
    'MCX rollover vs expiry',
    'MCX copper expiry date',
    'MCX futures expiry India',
    'MCX gold expiry month',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-contract-expiry' },
  openGraph: {
    title: 'MCX Contract Expiry 2026 — Gold, Silver, Crude Oil & Copper | BhaavBrief',
    description: 'When do MCX contracts expire? Complete expiry calendar, DVCAL settlement rules, and exit timing guide for all major MCX commodities.',
    url: 'https://bhaavbrief.in/learn/mcx-contract-expiry',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Contract+Expiry+2026&tags=Gold,Silver,Crude+Oil,Futures+Expiry', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Contract Expiry 2026 | BhaavBrief', description: 'When do MCX gold, silver, crude oil, and copper contracts expire? Complete expiry calendar and settlement guide.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Contract Expiry' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'When does MCX gold contract expire?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold contracts expire on the 5th day of the contract delivery month. If the 5th is a holiday, expiry moves to the previous trading day. For example, the MCX Gold June 2026 contract expires on 5 June 2026. MCX lists gold contracts for the current month plus the next 5 months, and also offers spot delivery contracts (T+2 settlement). Most retail traders trade the near-month or the next active month.' },
    },
    {
      '@type': 'Question',
      name: 'When does MCX crude oil contract expire?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX crude oil contracts expire on the 19th of the contract month, or the last day of the month if the 19th is a holiday. The settlement is cash-settled against the NYMEX WTI crude oil price converted to INR at the RBI reference rate. For example, the MCX Crude June 2026 contract expired on 19 June 2026. Crude is one of the most actively rolled contracts — most traders switch to the next month 4–5 days before expiry as volumes drop sharply in the final week.' },
    },
    {
      '@type': 'Question',
      name: 'What is MCX DVCAL settlement?',
      acceptedAnswer: { '@type': 'Answer', text: 'DVCAL (Daily Volume Weighted Average Price of the Last day of Continuous trading) is the settlement price MCX uses for cash-settled commodity contracts. On expiry day, MCX calculates the DVCAL price as the volume-weighted average of all trades during a specific window (usually the last hour of trading). Open positions that are not squared off before expiry are settled at this DVCAL price — you neither profit nor lose more than the DVCAL difference from your entry price. For physically delivered contracts (like MCX Gold), open positions on expiry day go into the delivery mechanism.' },
    },
    {
      '@type': 'Question',
      name: 'Should I exit my MCX position before expiry or let it settle?',
      acceptedAnswer: { '@type': 'Answer', text: 'For retail traders: always exit (square off) 3–4 days before expiry. Here is why: (1) liquidity drops sharply in the final 3–4 days — bid-ask spreads widen and slippage increases; (2) for gold and silver, if you cannot take physical delivery, your broker will force-close your position on expiry day at an unfavourable price; (3) cash-settled contracts (crude, copper, natural gas) are safer to hold until expiry but still carry execution risk in thin final-day markets. The standard practice for active traders is to roll over to the next contract month 3–4 days before expiry.' },
    },
    {
      '@type': 'Question',
      name: 'When does MCX silver contract expire?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX silver contracts expire on the 5th of the delivery month (same as gold). Silver is physically delivered — open positions on expiry go into the delivery mechanism, requiring both parties to give/take actual silver in approved vault grades. MCX Silver Micro (lot size 5 kg) and MCX Silver (30 kg) follow the same expiry date. For cash settlement on silver, you must square off before the last day of trading. Most active trading happens in near-month and next-month contracts.' },
    },
    {
      '@type': 'Question',
      name: 'What happens to my MCX position if I forget to close before expiry?',
      acceptedAnswer: { '@type': 'Answer', text: 'For cash-settled contracts (crude oil, copper, natural gas, zinc): your position is automatically settled at the DVCAL price on expiry day. You receive or pay the difference from your entry — no action needed, but you may get a worse price than if you had closed manually. For delivery-based contracts (gold, silver): brokers typically force-close retail positions that are not eligible for physical delivery before expiry, often charging a higher brokerage or penalty for this. Always check your broker policy and close manually.' },
    },
  ],
}

export default function Page() {
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 8, marginTop: 24 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #E05C00', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #E5E5DC', fontSize: 14, color: '#18180F', verticalAlign: 'top', lineHeight: 1.6 }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Contract Expiry</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Contract Expiry 2026 — Gold, Silver, Crude Oil & Copper
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          Expiry dates, settlement rules, and the exact window to exit or roll — for every major MCX commodity contract.
        </p>

        <div style={infoBox}>
          <strong>Quick reference:</strong> MCX Gold and Silver expire on the <strong>5th of the delivery month</strong>. MCX Crude Oil expires on the <strong>19th of the contract month</strong>. Copper, Zinc, Lead, and Aluminium expire on the <strong>last day of the contract month</strong>. Always square off or roll <strong>3–4 trading days</strong> before expiry to avoid thin liquidity and forced settlement.
        </div>

        <h2 style={h2}>MCX Expiry Calendar — All Commodities</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Commodity</th>
                <th style={th}>Expiry Rule</th>
                <th style={th}>Settlement</th>
                <th style={th}>Lot Size</th>
                <th style={th}>Roll By</th>
              </tr>
            </thead>
            <tbody>
              {[
                { commodity: 'MCX Gold (1 kg)', expiry: '5th of delivery month', settlement: 'Physical delivery (NSDL vault)', lot: '1 kg', roll: '1st–2nd of month' },
                { commodity: 'MCX Gold Mini (100g)', expiry: '5th of delivery month', settlement: 'Physical delivery', lot: '100g', roll: '1st–2nd of month' },
                { commodity: 'MCX Silver (30 kg)', expiry: '5th of delivery month', settlement: 'Physical delivery', lot: '30 kg', roll: '1st–2nd of month' },
                { commodity: 'MCX Silver Micro (5 kg)', expiry: '5th of delivery month', settlement: 'Physical delivery', lot: '5 kg', roll: '1st–2nd of month' },
                { commodity: 'MCX Crude Oil (100 bbl)', expiry: '19th of contract month', settlement: 'Cash (NYMEX WTI × RBI rate)', lot: '100 bbl', roll: '14th–15th of month' },
                { commodity: 'MCX Natural Gas (1250 mmBtu)', expiry: '25th of contract month', settlement: 'Cash (Henry Hub × RBI rate)', lot: '1,250 mmBtu', roll: '20th–22nd of month' },
                { commodity: 'MCX Copper (2.5 MT)', expiry: 'Last day of contract month', settlement: 'Cash (LME × RBI rate)', lot: '2.5 MT', roll: '4 days before EOM' },
                { commodity: 'MCX Zinc (5 MT)', expiry: 'Last day of contract month', settlement: 'Cash (LME × RBI rate)', lot: '5 MT', roll: '4 days before EOM' },
                { commodity: 'MCX Aluminium (5 MT)', expiry: 'Last day of contract month', settlement: 'Cash (LME × RBI rate)', lot: '5 MT', roll: '4 days before EOM' },
                { commodity: 'MCX Lead (5 MT)', expiry: 'Last day of contract month', settlement: 'Cash (LME × RBI rate)', lot: '5 MT', roll: '4 days before EOM' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.commodity}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.expiry}</td>
                  <td style={td}>{r.settlement}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{r.lot}</td>
                  <td style={{ ...td, color: '#E05C00' }}>{r.roll}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>What Happens on MCX Expiry Day</h2>
        <p style={prose}>
          On expiry day, MCX handles open positions in one of two ways depending on whether the contract is physically settled or cash settled.
        </p>

        <h3 style={h3}>Cash-Settled Contracts (Crude, Copper, Zinc, Natural Gas)</h3>
        <p style={prose}>
          MCX calculates the <strong>DVCAL price</strong> — the volume-weighted average of all trades during the final session. All open positions are automatically squared off at this price. You do not need to take any action, but the DVCAL price may differ from what you could have gotten by closing manually the day before.
        </p>
        <div style={infoBox}>
          <strong>DVCAL example:</strong> You bought MCX Crude at ₹7,100. On expiry day, you hold 1 lot (100 bbl). DVCAL settles at ₹7,240. Your P&L = (7,240 − 7,100) × 100 = <strong>₹14,000 profit</strong>, credited automatically to your account.
        </div>

        <h3 style={h3}>Physically Delivered Contracts (Gold, Silver)</h3>
        <p style={prose}>
          If you hold an open gold or silver position on expiry day, you are obligated to either deliver (if short) or take delivery (if long) of the physical commodity through MCX-approved vaults. This requires specific documentation, vault arrangements, and additional charges. <strong>Retail traders who cannot take delivery must square off before the last trading day.</strong>
        </p>
        <div style={warnBox}>
          <strong>Important:</strong> Most brokers will force-close retail gold/silver positions that are not eligible for physical delivery on expiry day. They may charge a penalty of ₹2,000–5,000 per lot for this forced closure. Always close gold and silver positions at least 2 trading days before expiry.
        </div>

        <h2 style={h2}>When to Exit vs When to Rollover</h2>
        <p style={prose}>
          When your MCX contract is approaching expiry, you have two choices: <strong>exit</strong> (square off your position and take profits or losses) or <strong>rollover</strong> (close the near-month contract and open the same position in the next month contract).
        </p>

        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Situation</th>
                <th style={th}>Action</th>
                <th style={th}>Why</th>
              </tr>
            </thead>
            <tbody>
              {[
                { situation: 'You hit your profit target before expiry', action: 'EXIT', why: 'No reason to carry a winning trade into thin expiry liquidity' },
                { situation: 'You have a trending view (multi-week)', action: 'ROLLOVER', why: 'Keep the directional exposure, switch to next month' },
                { situation: 'You are down and hoping for a recovery', action: 'Evaluate honestly, then EXIT or ROLLOVER', why: 'Rollover adds the spread cost; only rollover if thesis is intact' },
                { situation: 'Gold/Silver — cannot take delivery', action: 'EXIT by Day 2 of expiry month', why: 'Forced delivery risk and broker force-close penalty' },
                { situation: 'Crude/Copper — cash settled', action: 'ROLLOVER or EXIT by 19th/EOM', why: 'Can let it settle at DVCAL but may miss better manual exit' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={td}>{r.situation}</td>
                  <td style={{ ...td, fontWeight: 600, color: r.action === 'EXIT' ? '#E05C00' : r.action === 'ROLLOVER' ? '#2E6E3B' : '#C8720A' }}>{r.action}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>The Rollover Window — 3–4 Days Before Expiry</h2>
        <p style={prose}>
          The ideal rollover window is <strong>3–4 trading days before expiry</strong>. Here is why this timing matters:
        </p>
        <ul style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 24 }}>
          <li><strong>Day 5–4 before expiry:</strong> Next-month volume picks up, spreads tighten — best time to roll</li>
          <li><strong>Day 3 before expiry:</strong> Near-month volume starts falling, acceptable rollover window</li>
          <li><strong>Day 2 before expiry:</strong> Near-month spreads widen, rollover gets expensive</li>
          <li><strong>Day 1 before expiry (last trading day):</strong> Avoid — very thin near-month market, slippage risk</li>
          <li><strong>Expiry day:</strong> Only cash-settled positions can be held; do not hold delivery contracts</li>
        </ul>

        <h2 style={h2}>Frequently Asked Questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FAQ_SCHEMA.mainEntity.map(q => (
            <div key={q.name} style={{ borderBottom: '1px solid #E5E5DC', paddingBottom: 16 }}>
              <p style={{ fontWeight: 600, color: '#18180F', marginBottom: 8 }}>{q.name}</p>
              <p style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, margin: 0 }}>{q.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #E5E5DC', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/learn/mcx-rollover" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How to rollover MCX positions
          </Link>
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator
          </Link>
          <Link href="/learn/best-time-to-trade-mcx" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Best time to trade MCX
          </Link>
          <Link href="/learn/mcx-order-types" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX order types (close positions before expiry)
          </Link>
          <Link href="/learn/mcx-trading-hours" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX trading hours 2026
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Expiry rules and dates are based on MCX standard contract specifications and are subject to change. Always verify current expiry dates on the official MCX website (mcxindia.com) before trading. This is not investment advice.
        </p>
      </div>
    </>
  )
}

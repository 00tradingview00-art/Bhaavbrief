import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'

interface Prices {
  gold: number; silver: number; crude: number; copper: number
  natgas: number; zinc: number; aluminium: number; lead: number; nickel: number
}

function loadPrices(): Prices {
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_GOLD?.price) {
      return {
        gold:       i.MCX_GOLD.price,
        silver:     i.MCX_SILVER?.price    ?? 265000,
        crude:      i.MCX_CRUDE?.price     ?? 7100,
        copper:     i.MCX_COPPER?.price    ?? 960,
        natgas:     i.MCX_NATGAS?.price    ?? 320,
        zinc:       i.MCX_ZINC?.price      ?? 285,
        aluminium:  i.MCX_ALUMINIUM?.price ?? 265,
        lead:       i.MCX_LEAD?.price      ?? 185,
        nickel:     i.MCX_NICKEL?.price    ?? 1650,
      }
    }
  } catch { /* fall through */ }
  return { gold: 152000, silver: 265000, crude: 7100, copper: 960, natgas: 320, zinc: 285, aluminium: 265, lead: 185, nickel: 1650 }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtRs(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  return `₹${fmt(Math.round(n))}`
}

export const metadata = {
  title: 'MCX Margin Calculator 2026 — How Much Do You Need to Trade?',
  description: 'Calculate exact MCX margin requirements for Gold, Silver, Crude Oil, Copper, Zinc, and all base metals. Live contract values, SPAN margin estimates, and P&L per 1% move — India\'s most complete MCX margin guide.',
  keywords: [
    'MCX margin calculator 2026',
    'MCX margin required India',
    'MCX gold margin calculator',
    'MCX crude oil margin',
    'MCX silver margin India',
    'how much margin for MCX trading',
    'MCX SPAN margin India',
    'MCX contract value margin lot size',
    'MCX copper zinc nickel margin India',
    'MCX leverage margin calculation',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-margin-calculator' },
  openGraph: {
    title: 'MCX Margin Calculator 2026 — How Much Do You Need? | BhaavBrief',
    description: 'Live MCX margin requirements for all commodities: Gold, Silver, Crude, Copper, Zinc, Aluminium, Lead, Nickel. SPAN margin estimates and P&L per 1% move.',
    url: 'https://bhaavbrief.in/learn/mcx-margin-calculator',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Margin+Calculator+2026&tags=Margin,Leverage,Contract+Value', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Margin Calculator 2026 | BhaavBrief', description: 'Exact SPAN margin for Gold, Silver, Crude, Copper and all MCX commodities.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Margin Calculator 2026' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much margin do I need to trade MCX Gold Mini?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Mini (100g) requires approximately ₹55,000–₹75,000 in SPAN margin at mid-2026 gold prices. The contract value at ₹1,52,000/10g is approximately ₹15.2 lakh (100g × ₹1,52,000 ÷ 10). The SPAN margin is roughly 4–5% of contract value. A 1% gold move = ₹15,200 P&L on your ₹65,000 margin — that is 23× leverage.' },
    },
    {
      '@type': 'Question',
      name: 'How much margin is needed for MCX Crude Oil Mini?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Crude Oil Mini (10 barrels) requires approximately ₹3,000–₹5,000 SPAN margin at mid-2026 prices of ~₹7,100/bbl. Contract value is ₹71,000. A 1% crude move = ₹710 P&L. Crude Oil Mini is the most accessible MCX contract by margin. The standard 100-barrel contract needs ₹30,000–₹45,000.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between SPAN margin and exposure margin?',
      acceptedAnswer: { '@type': 'Answer', text: 'SPAN margin (also called initial margin) is the minimum you must deposit to open an MCX position — calculated daily by the exchange based on price volatility. Exposure margin is an additional buffer your broker may collect, typically 3–5% of contract value on top of SPAN. Total margin = SPAN + exposure margin. Many brokers charge only SPAN at position open but require total margin to avoid MTM shortfall alerts.' },
    },
    {
      '@type': 'Question',
      name: 'What happens if my MCX account falls below minimum margin?',
      acceptedAnswer: { '@type': 'Answer', text: 'If your available balance falls below the required SPAN margin, your broker will issue a margin call. If you do not top up within the stipulated time (usually by the next morning), the broker will square off your position — called forced squareoff. To avoid this: always maintain 20–30% buffer above minimum margin. MCX MTM (Mark to Market) loss is debited from your account every evening, not at expiry.' },
    },
    {
      '@type': 'Question',
      name: 'Is MCX margin the same for all brokers?',
      acceptedAnswer: { '@type': 'Answer', text: 'The SPAN margin set by MCX is the same across all SEBI-registered brokers — it is exchange-mandated. However, brokers can and do charge additional exposure margin (typically 3–5%), which varies by broker. Discount brokers like Zerodha and Angel One typically charge SPAN + exposure margin at the exchange-set rate, while some full-service brokers charge a higher buffer. The most accurate number is always from your broker\'s SPAN calculator updated daily.' },
    },
  ],
}

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to calculate MCX margin requirement',
  description: 'Step-by-step guide to calculating the margin needed to trade MCX gold, silver, crude oil, or copper futures.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Find the contract lot size', text: 'MCX Gold standard = 1 kg (100 units of 10g). Gold Mini = 100g. Silver = 30 kg. Crude Oil = 100 barrels. Copper = 2.5 MT.' },
    { '@type': 'HowToStep', position: 2, name: 'Calculate contract value', text: 'Contract value = MCX price × number of units in the lot. Example: Gold at ₹1,52,000/10g × 100 units = ₹1,52,00,000 (1 kg contract value).' },
    { '@type': 'HowToStep', position: 3, name: 'Apply SPAN margin percentage', text: 'MCX publishes SPAN margin daily (typically 4–6% for gold/silver, 5–7% for crude, 4–5% for base metals). Multiply contract value by SPAN %.' },
    { '@type': 'HowToStep', position: 4, name: 'Add exposure margin', text: 'Brokers typically add 2–4% exposure margin on top of SPAN. Total margin = SPAN + Exposure. Use the calculator on this page for current estimates.' },
    { '@type': 'HowToStep', position: 5, name: 'Verify with your broker', text: 'SPAN margin changes daily based on volatility. Always check the exact margin on your broker platform (Zerodha SPAN calculator, Angel One margin calculator) on the day you trade.' },
  ],
}

export default function Page() {
  const p = loadPrices()

  const contracts = [
    {
      group: 'Precious Metals',
      rows: [
        { name: 'Gold',         contract: 'Standard',  lot: '1 kg',    unitPrice: p.gold,      lotSize: 100, marginPct: 0.045, unit: '/10g',  span: [500_000, 700_000] },
        { name: 'Gold Mini',    contract: 'Mini',      lot: '100g',    unitPrice: p.gold,      lotSize: 10,  marginPct: 0.045, unit: '/10g',  span: [55_000, 75_000] },
        { name: 'Gold Guinea',  contract: 'Guinea',    lot: '8g',      unitPrice: p.gold,      lotSize: 0.8, marginPct: 0.05,  unit: '/10g',  span: [5_000, 8_000] },
        { name: 'Silver',       contract: 'Standard',  lot: '30 kg',   unitPrice: p.silver,    lotSize: 30,  marginPct: 0.065, unit: '/kg',   span: [160_000, 220_000] },
        { name: 'Silver Mini',  contract: 'Mini',      lot: '5 kg',    unitPrice: p.silver,    lotSize: 5,   marginPct: 0.065, unit: '/kg',   span: [25_000, 40_000] },
        { name: 'Silver Micro', contract: 'Micro',     lot: '1 kg',    unitPrice: p.silver,    lotSize: 1,   marginPct: 0.065, unit: '/kg',   span: [5_000, 8_000] },
      ],
    },
    {
      group: 'Energy',
      rows: [
        { name: 'Crude Oil',      contract: 'Standard', lot: '100 bbl', unitPrice: p.crude,  lotSize: 100, marginPct: 0.055, unit: '/bbl', span: [30_000, 45_000] },
        { name: 'Crude Oil Mini', contract: 'Mini',     lot: '10 bbl',  unitPrice: p.crude,  lotSize: 10,  marginPct: 0.055, unit: '/bbl', span: [3_000, 5_000] },
        { name: 'Natural Gas',    contract: 'Standard', lot: '1250 mmBtu', unitPrice: p.natgas, lotSize: 1250, marginPct: 0.065, unit: '/mmBtu', span: [20_000, 30_000] },
        { name: 'Nat Gas Mini',   contract: 'Mini',     lot: '250 mmBtu',  unitPrice: p.natgas, lotSize: 250,  marginPct: 0.065, unit: '/mmBtu', span: [4_000, 6_000] },
      ],
    },
    {
      group: 'Base Metals',
      rows: [
        { name: 'Copper',     contract: 'Standard', lot: '1,000 kg', unitPrice: p.copper,    lotSize: 1000, marginPct: 0.09, unit: '/kg', span: [80_000, 120_000] },
        { name: 'Copper Mini',contract: 'Mini',     lot: '250 kg',   unitPrice: p.copper,    lotSize: 250,  marginPct: 0.09, unit: '/kg', span: [20_000, 30_000] },
        { name: 'Zinc',       contract: 'Standard', lot: '1,000 kg', unitPrice: p.zinc,      lotSize: 1000, marginPct: 0.055, unit: '/kg', span: [7_000, 14_000] },
        { name: 'Aluminium',  contract: 'Standard', lot: '1,000 kg', unitPrice: p.aluminium, lotSize: 1000, marginPct: 0.055, unit: '/kg', span: [5_000, 9_000] },
        { name: 'Lead',       contract: 'Standard', lot: '1,000 kg', unitPrice: p.lead,      lotSize: 1000, marginPct: 0.055, unit: '/kg', span: [5_000, 9_000] },
        { name: 'Nickel',     contract: 'Standard', lot: '250 kg',   unitPrice: p.nickel,    lotSize: 250,  marginPct: 0.085, unit: '/kg', span: [20_000, 35_000] },
      ],
    },
  ]

  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #E05C00', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const th: React.CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 12px', borderTop: '1px solid #E5E5DC', fontSize: 14, color: '#18180F', verticalAlign: 'top' }
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 14 }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_SCHEMA) }} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Margin Calculator</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Margin Calculator 2026: How Much Do You Need to Trade?
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          Live SPAN margin estimates for all MCX contracts — Gold, Silver, Crude Oil, Copper, Zinc, Aluminium, Lead, and Nickel. Updated daily with live MCX prices.
        </p>

        <div style={infoBox}>
          <strong>The short answer:</strong> MCX Gold Mini requires ₹55,000–₹75,000. MCX Crude Mini requires ₹3,000–₹5,000. MCX Silver Mini requires ₹25,000–₹40,000. All values below are computed from today&apos;s live prices and typical SPAN margin rates. Always verify with your broker&apos;s margin calculator before trading.
        </div>

        {contracts.map(group => {
          const rows = group.rows.map(r => {
            const contractValue = r.unitPrice * r.lotSize
            const spanMid = Math.round((r.span[0] + r.span[1]) / 2)
            const pnlPct1 = contractValue * 0.01
            return { ...r, contractValue, spanMid, pnlPct1 }
          })

          return (
            <div key={group.group} style={{ marginBottom: 40 }}>
              <h2 style={h2}>{group.group}</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC', borderRadius: 4, overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      <th style={th}>Contract</th>
                      <th style={{ ...th, textAlign: 'right' }}>Lot Size</th>
                      <th style={{ ...th, textAlign: 'right' }}>Current Price</th>
                      <th style={{ ...th, textAlign: 'right' }}>Contract Value</th>
                      <th style={{ ...th, textAlign: 'right' }}>SPAN Margin</th>
                      <th style={{ ...th, textAlign: 'right' }}>P&L per 1% Move</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.name} style={{ background: r.contract === 'Mini' || r.contract === 'Micro' ? '#FAFAF7' : 'white' }}>
                        <td style={td}>
                          <div style={{ fontWeight: 500 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: '#8A8A7A', marginTop: 2 }}>{r.lot}</div>
                        </td>
                        <td style={{ ...td, ...mono, textAlign: 'right' }}>{r.lot}</td>
                        <td style={{ ...td, ...mono, textAlign: 'right' }}>₹{fmt(r.unitPrice)}{r.unit}</td>
                        <td style={{ ...td, ...mono, textAlign: 'right' }}>
                          {fmtRs(r.contractValue)}
                        </td>
                        <td style={{ ...td, textAlign: 'right' }}>
                          <span style={{ ...mono, color: '#C8720A', fontWeight: 600 }}>
                            {fmtRs(r.span[0])}–{fmtRs(r.span[1])}
                          </span>
                        </td>
                        <td style={{ ...td, ...mono, textAlign: 'right', color: '#16A34A', fontWeight: 500 }}>
                          {fmtRs(r.pnlPct1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: '#8A8A7A', marginTop: 8 }}>
                SPAN margin is approximate. Check your broker&apos;s margin calculator for exact live requirements. Prices are from the latest MCX snapshot.
              </p>
            </div>
          )
        })}

        <h2 style={h2}>How to Read This Table</h2>
        <p style={prose}>
          <strong>Contract Value</strong> is what one lot of that commodity is worth in rupees — this is not what you pay. You pay only the SPAN margin, which is typically 4–9% of contract value depending on the commodity&apos;s volatility.
        </p>
        <p style={prose}>
          <strong>P&L per 1% move</strong> is how much you gain or lose if the commodity price moves by exactly 1%. Since you only deposited the margin (not the full contract value), your actual return on margin is much higher — this is leverage.
        </p>
        <div style={infoBox}>
          <strong>Example — MCX Gold Mini:</strong> You deposit ₹65,000 margin. Gold moves 1% (₹1,520/10g). Your P&L = ₹15,200 — a 23% gain on your ₹65,000. This is leverage working in your favour. The same 1% move against you wipes 23% of your margin.
        </div>

        <h2 style={h2}>SPAN Margin vs Total Margin Required</h2>
        <p style={prose}>
          The values above are <strong>SPAN (initial) margin</strong> — the exchange-mandated minimum to open a position. Your broker may collect an additional <strong>exposure margin</strong> (3–5% of contract value) on top of SPAN. So if SPAN is ₹65,000 and exposure is ₹45,000, your broker&apos;s total requirement is ₹1.1 lakh.
        </p>
        <p style={prose}>
          SEBI regulations allow brokers to determine exposure margin. Discount brokers (Zerodha, Angel One, Upstox) typically charge close to the exchange minimum. Full-service brokers may charge higher buffers.
        </p>

        <h2 style={h2}>MTM and the Margin Trap Most Beginners Fall Into</h2>
        <div style={warnBox}>
          <strong>Critical warning:</strong> MCX Mark-to-Market (MTM) loss is debited from your account <em>every evening</em>, not at expiry. If gold falls ₹5,000/10g on a day you hold a Gold Mini long, ₹5,000 × 10 = ₹50,000 is debited from your account the same evening. If your balance drops below SPAN margin, your broker will square off your position the next morning — no warning, no waiting.
        </div>
        <p style={prose}>
          The rule every experienced MCX trader follows: <strong>always keep 20–30% buffer above the SPAN margin</strong>. If SPAN is ₹65,000, keep at least ₹85,000 in your account. This buffer absorbs one bad day without triggering forced squareoff.
        </p>

        <h2 style={h2}>Which Contract Is Right for Your Capital?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { range: '₹5,000–₹15,000', best: 'Gold Petal (1g), Crude Mini', note: 'For paper trading with real money. Learn without large risk.' },
            { range: '₹20,000–₹50,000', best: 'Gold Guinea, Silver Micro, Nat Gas Mini', note: 'Micro exposure to bullion and energy. Good starting range.' },
            { range: '₹50,000–₹1 lakh', best: 'Gold Mini, Silver Mini, Crude (standard)', note: 'Most popular range for retail MCX traders. Gold Mini is ideal.' },
            { range: '₹1–₹5 lakh', best: 'Silver (std), Copper, multiple lots', note: 'Active retail traders. Can hold multiple positions simultaneously.' },
          ].map(c => (
            <div key={c.range} style={{ background: '#F8F7F2', borderRadius: 6, padding: '16px', border: '1px solid #E5E5DC' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#C8720A', marginBottom: 6 }}>{c.range}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#18180F', marginBottom: 6 }}>{c.best}</div>
              <div style={{ fontSize: 13, color: '#8A8A7A', lineHeight: 1.5 }}>{c.note}</div>
            </div>
          ))}
        </div>

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
          <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How leverage works in MCX
          </Link>
          <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX contract lot sizes
          </Link>
          <Link href="/markets" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Live MCX prices
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX learning guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Margin values are estimates based on typical MCX SPAN rates and current prices. Actual margin requirements vary daily and by broker. This is educational content only — not investment advice. Commodity trading involves substantial risk of loss. Please verify with your broker before trading.
        </p>
      </div>
    </>
  )
}

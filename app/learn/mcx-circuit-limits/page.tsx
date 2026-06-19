import Link from 'next/link'

export const metadata = {
  title: 'MCX Circuit Limits 2026 — Daily Price Bands for Gold, Silver, Crude Oil & Copper',
  description: 'Complete guide to MCX circuit limits and daily price bands for all commodities. What is the MCX circuit limit for gold, silver, crude oil, copper, and natural gas? What happens when MCX hits circuit? How to protect your position.',
  keywords: [
    'MCX circuit limit 2026',
    'MCX circuit breaker gold',
    'MCX daily price limit',
    'MCX upper circuit silver',
    'MCX crude oil circuit limit',
    'MCX price band India',
    'MCX circuit filter',
    'MCX trading halt',
    'MCX copper circuit limit',
    'MCX price limit percentage',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-circuit-limits' },
  openGraph: {
    title: 'MCX Circuit Limits 2026 — Gold, Silver, Crude Oil & Copper Price Bands | BhaavBrief',
    description: 'MCX circuit limits, daily price bands, what happens when a circuit triggers, and how to protect your position. Complete guide for Indian commodity traders.',
    url: 'https://bhaavbrief.in/learn/mcx-circuit-limits',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Circuit+Limits+2026&tags=Gold,Silver,Crude+Oil,Circuit+Breaker', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Circuit Limits 2026 | BhaavBrief', description: 'MCX daily price bands for gold, silver, crude oil, copper — what circuit limits are and what happens when they trigger.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Circuit Limits' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MCX circuit limit?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX circuit limits (also called daily price bands or circuit filters) are the maximum price move allowed in a single trading session before trading is temporarily halted or restricted. MCX uses a two-stage system: an initial circuit limit (Stage 1) and an expanded circuit limit (Stage 2). For most non-agricultural commodities, Stage 1 is ±3% from the previous day close, and Stage 2 is ±6%. If prices hit Stage 1, trading is paused for 15 minutes and then resumes at the expanded ±6% band. Circuit limits protect traders from extreme price movements and reduce market manipulation risk.' },
    },
    {
      '@type': 'Question',
      name: 'What is the MCX circuit limit for gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold has an initial (Stage 1) circuit limit of ±3% from the previous closing price. If gold hits this limit, trading pauses for 15 minutes and resumes at an expanded ±6% band (Stage 2). For example, if MCX gold closed at ₹70,000/10g, Stage 1 circuit limits are ₹67,900 (lower) and ₹72,100 (upper). Stage 2 bands would be ₹65,800 and ₹74,200. In practice, MCX gold rarely hits circuit limits under normal market conditions — only extreme global events (major Fed decisions, geopolitical shocks) push gold to these levels in a single session.' },
    },
    {
      '@type': 'Question',
      name: 'What happens when MCX hits upper circuit?',
      acceptedAnswer: { '@type': 'Answer', text: 'When MCX gold, silver, crude oil, or any other commodity hits the upper circuit limit (Stage 1 at +3%), MCX Exchange temporarily halts trading for 15 minutes. During this halt, no new orders can be placed and existing orders are frozen. After 15 minutes, MCX reopens trading with expanded limits (Stage 2 at +6%). If prices hit the Stage 2 upper circuit, MCX may halt trading for the rest of the session or extend the circuit further based on global market conditions. Buyers benefit from upper circuits — you already own the commodity at a lower price and it is now at the maximum allowed level.' },
    },
    {
      '@type': 'Question',
      name: 'Which MCX commodity has the highest circuit limit?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX crude oil has the highest effective circuit range among major contracts. While the standard Stage 1/Stage 2 bands (±3%/±6%) apply, MCX can and does expand crude oil circuit limits to ±9% in high-volatility periods (such as during major geopolitical events or OPEC emergency decisions). Natural gas also has provision for expanded limits given its extreme volatility — nat gas can move 5–10% on a single EIA storage report. Gold and silver are the most stable and rarely hit even the Stage 1 circuit.' },
    },
    {
      '@type': 'Question',
      name: 'Can I place orders when MCX is in circuit?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. During an MCX circuit halt (the 15-minute pause after hitting Stage 1 limits), no new orders can be placed and existing pending orders are frozen. Your existing open positions (bought or sold contracts) remain active — you cannot exit them during the halt. After the 15-minute halt, MCX reopens with expanded Stage 2 limits and you can place orders again. Some brokers send an SMS/app alert when a circuit halt occurs. If you need to exit urgently during a halt, you must wait for the resumption of trading.' },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Circuit Limits</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Circuit Limits 2026 — Daily Price Bands for All Commodities
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          What circuit limits are, the two-stage MCX circuit system, commodity-specific bands, and what to do when your position is frozen in a halt.
        </p>

        <div style={infoBox}>
          <strong>Quick answer:</strong> MCX uses a <strong>two-stage circuit system</strong>. Stage 1: <strong>±3%</strong> from previous close — triggers a 15-minute trading halt. Stage 2: <strong>±6%</strong> — trading resumes at this expanded band after the halt. Crude oil can expand to <strong>±9%</strong> in extreme conditions. Gold rarely hits circuits under normal conditions.
        </div>

        <h2 style={h2}>MCX Circuit Limit Table — All Major Commodities</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Commodity</th>
                <th style={th}>Stage 1 (Initial)</th>
                <th style={th}>Stage 2 (Expanded)</th>
                <th style={th}>Max Limit</th>
                <th style={th}>Circuit Frequency</th>
              </tr>
            </thead>
            <tbody>
              {[
                { commodity: 'MCX Gold', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare (major global events only)' },
                { commodity: 'MCX Silver', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare–Occasional (more volatile than gold)' },
                { commodity: 'MCX Crude Oil', s1: '±3%', s2: '±6%', max: '±9% (SEBI approval)', freq: 'Occasional (OPEC shocks, supply disruptions)' },
                { commodity: 'MCX Natural Gas', s1: '±3%', s2: '±6%', max: '±9% (high-vol periods)', freq: 'Occasional (EIA storage surprises)' },
                { commodity: 'MCX Copper', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare (major China demand shocks)' },
                { commodity: 'MCX Zinc', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare' },
                { commodity: 'MCX Aluminium', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare' },
                { commodity: 'MCX Lead', s1: '±3%', s2: '±6%', max: '±6%', freq: 'Rare' },
                { commodity: 'MCX Nickel', s1: '±3%', s2: '±6%', max: '±9% (approved)', freq: 'Occasional (supply disruptions)' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.commodity}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#2E6E3B' }}>{r.s1}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.s2}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#E05C00' }}>{r.max}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.freq}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>How the Two-Stage Circuit System Works</h2>
        <p style={prose}>
          MCX uses SEBI&apos;s mandated circuit breaker framework with two price limits per trading session. The system is designed to give markets time to absorb information rather than allowing runaway panic-driven moves.
        </p>

        <h3 style={h3}>Stage 1 — Initial Circuit (±3%)</h3>
        <p style={prose}>
          When any MCX commodity moves ±3% from its previous day&apos;s closing price, MCX automatically halts trading for <strong>15 minutes</strong>. During this halt:
        </p>
        <ul style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 24 }}>
          <li>No new orders can be placed</li>
          <li>Existing pending orders are frozen (not cancelled)</li>
          <li>Open positions remain active (you still have your P&L exposure)</li>
          <li>MCX publishes a notice on the exchange terminal</li>
        </ul>

        <h3 style={h3}>Stage 2 — Expanded Circuit (±6%)</h3>
        <p style={prose}>
          After the 15-minute halt, MCX reopens with expanded limits of ±6% from the <em>original</em> previous close (not from the circuit level). Trading continues normally within this band. If prices hit ±6%, MCX can halt again and may choose to close trading for the session, seek regulatory approval for further expansion, or wait for global markets to stabilise.
        </p>

        <div style={infoBox}>
          <strong>Example — MCX Crude hitting circuit:</strong> MCX Crude closes at ₹7,000. Stage 1 band: ₹6,790–₹7,210. If crude falls to ₹6,790 on a large EIA inventory surprise, MCX halts for 15 minutes. Resumes with Stage 2 band: ₹6,580–₹7,420. Most crude moves stay within Stage 1 even on volatile EIA Wednesdays.
        </div>

        <h2 style={h2}>When Do MCX Circuits Actually Trigger?</h2>
        <p style={prose}>
          Circuit triggers are rare for most commodities under normal market conditions. These are the typical situations that have caused MCX circuit halts historically:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Event Type</th>
                <th style={th}>Commodity</th>
                <th style={th}>Typical Move</th>
              </tr>
            </thead>
            <tbody>
              {[
                { event: 'Major Fed rate surprise (surprise hike/cut)', commodity: 'Gold, Silver', move: '±2–4% single session' },
                { event: 'OPEC emergency production cut or surge', commodity: 'Crude Oil', move: '±4–8% single session' },
                { event: 'Major China economic data shock (GDP, PMI miss)', commodity: 'Copper, Zinc, Base Metals', move: '±2–4% single session' },
                { event: 'Geopolitical escalation (Hormuz, Russia pipeline)', commodity: 'Crude Oil, Natural Gas', move: '±3–6% single session' },
                { event: 'Large EIA storage surprise (nat gas)', commodity: 'Natural Gas', move: '±5–10% single session' },
                { event: 'Indian duty change (Budget day)', commodity: 'Gold, Silver', move: '±4–7% single session' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={td}>{r.event}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{r.commodity}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.move}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>What to Do When Your Position Is Frozen in a Circuit</h2>
        <div style={warnBox}>
          <strong>You cannot exit during the halt.</strong> Here is what to do:
          <ol style={{ margin: '12px 0 0', padding: '0 0 0 20px', lineHeight: 2 }}>
            <li><strong>Stay calm — 15 minutes is the standard halt duration.</strong> Do not panic about temporary inability to exit.</li>
            <li><strong>Do not cancel your pending exit orders.</strong> They will execute immediately when trading resumes if within the new expanded band.</li>
            <li><strong>Assess your risk:</strong> Calculate your maximum loss at the Stage 2 limit. Is it within your risk tolerance?</li>
            <li><strong>Place a stop-loss order</strong> to execute the moment trading resumes if you want to exit quickly after reopening.</li>
            <li><strong>Watch global markets</strong> during the halt — COMEX, CME, and overseas markets continue trading and will signal where MCX resumes.</li>
          </ol>
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
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator
          </Link>
          <Link href="/learn/best-time-to-trade-mcx" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Best time to trade MCX
          </Link>
          <Link href="/learn/mcx-contract-expiry" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX contract expiry guide
          </Link>
          <Link href="/learn/mcx-order-types" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX order types (SL-M for gap protection)
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity should I trade?
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Circuit limit percentages are based on SEBI and MCX guidelines as of 2026 and are subject to change. MCX may modify price bands at any time based on market conditions and regulatory approvals. Always verify current circuit limits on the official MCX website (mcxindia.com). This is not investment advice.
        </p>
      </div>
    </>
  )
}

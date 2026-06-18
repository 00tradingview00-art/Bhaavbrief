import Link from 'next/link'

export const metadata = {
  title: 'MCX Trading Hours in India 2026 — Session Timings, Best Windows & Commodity Guide',
  description: 'MCX trading hours: 9:00 AM to 11:30 PM IST (Monday–Friday). Gold, Silver trade until 11:30 PM. Crude Oil until 11:30 PM. Full guide to morning vs evening sessions, EIA timing, COMEX overlap, and when NOT to trade MCX.',
  keywords: [
    'MCX trading hours India 2026',
    'MCX market open time India',
    'MCX market close time India',
    'what time does MCX open',
    'MCX gold trading hours IST',
    'MCX crude oil trading hours',
    'MCX evening session timings',
    'MCX trading time today India',
    'MCX commodity market hours IST',
    'COMEX MCX overlap time India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-trading-hours' },
  openGraph: {
    title: 'MCX Trading Hours India 2026 | BhaavBrief',
    description: 'MCX opens at 9:00 AM IST and closes at 11:30 PM IST. Full timing guide: morning session, evening session, EIA window, COMEX overlap, and commodity-specific best hours.',
    url: 'https://bhaavbrief.in/learn/mcx-trading-hours',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Trading+Hours+India+2026&tags=Beginner,Timing,MCX+India', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Trading Hours India 2026 | BhaavBrief', description: 'MCX: 9 AM–11:30 PM IST. Gold trades until 11:30 PM. Crude until 11:30 PM. Full commodity timing guide.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Trading Hours India' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What are MCX trading hours in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX (Multi Commodity Exchange of India) trading hours are 9:00 AM to 11:30 PM IST, Monday to Friday. This is a single continuous session — there is no lunch break. The 9 AM–5 PM window is the "morning session" (broadly), and 5 PM–11:30 PM is the "evening session" when international markets (COMEX, NYMEX, LME) are most active. MCX is closed on Saturdays, Sundays, and declared MCX holidays. The extended hours until 11:30 PM are what make MCX unique — Indian traders can react to US market moves in real time.' },
    },
    {
      '@type': 'Question',
      name: 'What time does MCX gold trading start and close?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold (all variants — Gold Mini, Gold Standard, Gold Guinea, Gold Petal) trades from 9:00 AM to 11:30 PM IST on weekdays. The best volume and tightest spreads for MCX Gold are in the evening session: 7:00 PM to 11:30 PM IST, when COMEX gold in New York is actively traded. US market open is at approximately 7:30–8:00 PM IST. Major US economic data (CPI, Fed rate decisions, NFP) releases between 6:00–8:30 PM IST and drives sharp MCX Gold moves.' },
    },
    {
      '@type': 'Question',
      name: 'What time does MCX crude oil trading start and close?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Crude Oil (Mini and Standard) trades from 9:00 AM to 11:30 PM IST on weekdays. The most critical window for crude traders is 7:30 PM to 9:30 PM IST — NYMEX WTI crude open and peak volume. The single most important MCX crude event is the EIA Crude Oil Inventory report, released every Wednesday at approximately 8:00–8:30 PM IST. This causes sharp, often ₹100–300/bbl moves in 1–2 minutes. Crude traders must always check if it is Wednesday and budget for extra volatility.' },
    },
    {
      '@type': 'Question',
      name: 'Does MCX close at 5 PM like the stock market?',
      acceptedAnswer: { '@type': 'Answer', text: 'No — MCX does NOT close at 5 PM. This is a very common misconception. NSE and BSE (stock markets) close at 3:30 PM IST. MCX commodity trading continues until 11:30 PM IST. This extended session is specifically to allow Indian commodity traders to participate in COMEX (gold/silver), NYMEX (crude oil), and LME (copper/zinc) price discovery, which happens during US and European trading hours. Most of the big price action on MCX gold and crude happens between 7:30 PM and 11:00 PM IST.' },
    },
    {
      '@type': 'Question',
      name: 'What time does LME session affect MCX copper and zinc?',
      acceptedAnswer: { '@type': 'Answer', text: 'The London Metal Exchange (LME) has two key sessions: Ring session (official price) at 12:00–5:00 PM London time = 4:30–9:30 PM IST; LME Select electronic session runs around the clock. The LME afternoon pricing session (roughly 3:00 PM London = 8:30 PM IST) sets official LME closing prices that MCX copper and zinc reference. Most LME-driven action on MCX copper and zinc happens in the 2:00–6:00 PM IST window (European morning) and again 8:00–9:30 PM IST (LME close).' },
    },
    {
      '@type': 'Question',
      name: 'When should I NOT trade MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Avoid trading MCX between 12:00 PM and 4:30 PM IST — this is the dead zone. European markets are quiet (lunch time in London), US markets are not open yet, and MCX volume drops sharply. Spreads widen, slippage increases, and price moves are often random and thin. Also avoid: trading in the first 15 minutes of MCX open (9:00–9:15 AM IST) until early orders settle; trading around MCX expiry dates when rollover distorts near-month prices; and holding positions through US Fed rate decisions or NFP data without a clear stop-loss.' },
    },
    {
      '@type': 'Question',
      name: 'Is MCX open today? How do I check MCX holidays?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX is closed on all Saturdays, Sundays, and approximately 14–16 declared MCX holidays per year (Republic Day, Holi, Good Friday, Diwali Muhurat trading special session, Independence Day, Dussehra, Christmas, etc.). The MCX holiday list is published at the start of each year on mcxindia.com. Note: Diwali Muhurat trading is a special 1-hour session on Diwali evening that most other markets are closed — MCX conducts it as a special event.' },
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
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

  const sessions = [
    { time: '9:00–9:15 AM', label: 'MCX Open', activity: 'Volatile open — orders from overnight accumulate. Spreads wide.', quality: 'Avoid', qColor: '#C0392B' },
    { time: '9:15–11:00 AM', label: 'Morning Active', activity: 'Indian macro data, SEBI/RBI news, early trade. Active for all contracts.', quality: 'Good', qColor: '#2E6E3B' },
    { time: '11:00 AM–2:00 PM', label: 'Morning Quiet', activity: 'Low volume. European markets not fully active. Wider spreads.', quality: 'Moderate', qColor: '#7A6000' },
    { time: '2:00–6:00 PM', label: 'LME Session', activity: 'Best window for Copper, Zinc, Nickel, Lead. LME afternoon pricing at ~8:30 PM IST.', quality: 'Good (metals)', qColor: '#2E6E3B' },
    { time: '4:30–7:00 PM', label: 'Pre-US Quiet', activity: 'European morning active, US not open. Moderate volume on gold.', quality: 'Moderate', qColor: '#7A6000' },
    { time: '7:00–11:30 PM', label: 'COMEX/NYMEX Session ★', activity: 'PEAK WINDOW. COMEX gold + silver + NYMEX crude all active. EIA data at 8 PM Wed. Best liquidity, tightest spreads.', quality: 'Best', qColor: '#C8720A' },
    { time: '11:00–11:30 PM', label: 'MCX Close', activity: 'Final 30 min. Volume drops. Settlement approaching. Square off open positions.', quality: 'Caution', qColor: '#7A6000' },
  ]

  const commodityWindows = [
    { commodity: 'MCX Gold Mini / Standard', best: '7:00–11:30 PM IST', driver: 'COMEX New York', note: 'US economic data 6–8:30 PM, Fed decisions' },
    { commodity: 'MCX Silver Micro / Mini', best: '7:00–11:30 PM IST', driver: 'COMEX New York', note: 'More volatile than gold — especially 8–10 PM' },
    { commodity: 'MCX Crude Oil Mini', best: '7:30–9:30 PM IST', driver: 'NYMEX WTI open', note: 'EIA inventory: every Wednesday 8:00–8:30 PM' },
    { commodity: 'MCX Natural Gas Mini', best: '7:30–9:00 PM IST', driver: 'NYMEX Natural Gas', note: 'EIA storage: every Thursday 8:00–8:30 PM' },
    { commodity: 'MCX Copper Mini', best: '2:00–6:00 PM + 8–9:30 PM IST', driver: 'LME London', note: 'LME official close ~8:30 PM IST' },
    { commodity: 'MCX Zinc / Lead / Nickel', best: '2:00–6:00 PM IST', driver: 'LME London', note: 'European morning session peak' },
    { commodity: 'MCX Aluminium', best: '2:00–5:30 PM IST', driver: 'LME London', note: 'China production data also key driver' },
  ]

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
          <span style={{ color: '#18180F' }}>MCX Trading Hours India</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Trading Hours in India (2026)
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          Complete guide to MCX session timings, best windows by commodity, EIA schedule, and when to avoid trading.
        </p>

        <div style={infoBox}>
          <strong>MCX trading hours: 9:00 AM to 11:30 PM IST, Monday to Friday.</strong> MCX does NOT close at 5 PM like the stock market. The evening session (7–11:30 PM) is when COMEX gold and NYMEX crude are most active — this is the highest-volume window for most MCX commodity traders.
        </div>

        <h2 style={h2}>MCX Session Quality Throughout the Day</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={{ ...th, ...mono }}>IST Time</th>
                <th style={th}>Session</th>
                <th style={th}>What Is Active</th>
                <th style={th}>Quality</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i} style={{ background: s.quality === 'Best' ? '#FFFBF5' : i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, ...mono, fontSize: 13, fontWeight: 600, color: s.quality === 'Best' ? '#C8720A' : '#18180F', whiteSpace: 'nowrap' }}>{s.time}</td>
                  <td style={{ ...td, fontWeight: s.quality === 'Best' ? 600 : 400 }}>{s.label}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{s.activity}</td>
                  <td style={{ ...td, fontWeight: 600, color: s.qColor, whiteSpace: 'nowrap' }}>{s.quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>Best Trading Window by MCX Commodity</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Commodity</th>
                <th style={th}>Best Window (IST)</th>
                <th style={th}>Global Driver</th>
                <th style={th}>Key Event</th>
              </tr>
            </thead>
            <tbody>
              {commodityWindows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.commodity}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, color: '#C8720A', fontWeight: 600 }}>{r.best}</td>
                  <td style={td}>{r.driver}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>The MCX–Stock Market Confusion</h2>
        <p style={prose}>
          The single most common question from new commodity traders: &quot;Does MCX also close at 3:30 PM?&quot; The answer is no — and this is by design.
        </p>
        <p style={prose}>
          NSE and BSE (equity markets) close at 3:30 PM IST because Indian company valuations are primarily driven by domestic factors. MCX commodities — gold, silver, crude oil, copper — are globally priced. The benchmark prices are set in New York (COMEX, NYMEX) and London (LME), which are active while India is in the evening.
        </p>
        <p style={prose}>
          If MCX closed at 3:30 PM, Indian commodity traders would have no way to react to a Fed rate decision at 7:30 PM or an EIA inventory surprise at 8 PM. The 11:30 PM close captures almost the entire active US trading session.
        </p>

        <h2 style={h2}>The Dead Zone: When NOT to Trade MCX</h2>
        <div style={warnBox}>
          <strong>Avoid trading MCX between 12:00 PM and 4:30 PM IST.</strong> This 4.5-hour window is the lowest-liquidity period on MCX. European markets are at lunch, US markets are not open, and domestic-only traders are thin. The result: wider bid-ask spreads (you pay more to enter and exit), more price slippage, and random/choppy price action. Experienced traders call this the &quot;MCX graveyard shift.&quot;
        </div>

        <h3 style={h3}>Other times to avoid</h3>
        <ul style={{ paddingLeft: 24, marginBottom: 20 }}>
          {[
            'MCX open (9:00–9:15 AM): First 15 minutes are volatile as accumulated overnight orders hit the market. Spreads are wide.',
            'MCX close (11:15–11:30 PM): Final 15 minutes see position squaring. Price can spike or drop sharply as traders close.',
            'MCX expiry week: Near-month contracts become illiquid as traders roll. Spreads widen on the expiring contract.',
            'Major US data releases without a stop-loss: Fed rate decisions, CPI, Non-Farm Payrolls can move MCX gold ₹500–1,500 in minutes.',
          ].map((t, i) => <li key={i} style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 8 }}>{t}</li>)}
        </ul>

        <h2 style={h2}>Weekly Calendar — Key MCX Events by Day</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Day</th>
                <th style={th}>Key Event (IST)</th>
                <th style={th}>Commodity Affected</th>
                <th style={th}>Typical Move</th>
              </tr>
            </thead>
            <tbody>
              {[
                { day: 'Monday', event: 'Weekend gap fill, China PMI data', commodity: 'Copper, Gold', move: 'Moderate' },
                { day: 'Tuesday', event: 'US Consumer Confidence (usually 7:30 PM IST)', commodity: 'Gold, Crude', move: 'Low–Moderate' },
                { day: 'Wednesday ⚠', event: 'EIA Crude Oil Inventory (~8:00–8:30 PM IST)', commodity: 'Crude Oil', move: 'HIGH — ₹100–400/bbl in minutes' },
                { day: 'Thursday', event: 'EIA Natural Gas Storage (~8:00–8:30 PM IST), US Jobless Claims', commodity: 'Natural Gas, Gold', move: 'High for Nat Gas' },
                { day: 'Friday', event: 'Non-Farm Payrolls (first Friday of month, ~6:00 PM IST)', commodity: 'Gold, Silver, Crude', move: 'Very High on NFP Friday' },
              ].map((r, i) => (
                <tr key={i} style={{ background: r.day.includes('Wednesday') ? '#FFF8F0' : i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: r.day.includes('Wednesday') ? 700 : 500, color: r.day.includes('Wednesday') ? '#E05C00' : '#18180F' }}>{r.day}</td>
                  <td style={{ ...td, fontSize: 13 }}>{r.event}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{r.commodity}</td>
                  <td style={{ ...td, fontSize: 13, fontWeight: r.move.startsWith('HIGH') || r.move.startsWith('Very') ? 600 : 400, color: r.move.startsWith('HIGH') || r.move.startsWith('Very') ? '#C0392B' : '#48483A' }}>{r.move}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity should I trade?
          </Link>
          <Link href="/learn/mcx-contract-expiry" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX contract expiry dates 2026
          </Link>
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much capital do I need for MCX?
          </Link>
          <Link href="/markets" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX live prices
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Trading session timings and event schedules are based on standard MCX operating hours and typical US/European data release schedules. MCX may modify trading hours on special occasions. Always verify with your broker or mcxindia.com for the latest schedule. This is educational content only.
        </p>
      </div>
    </>
  )
}

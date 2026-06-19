import Link from 'next/link'

export const metadata = {
  title: 'Best Time to Trade MCX in India 2026 — Session Guide for Gold, Crude & Silver',
  description: 'The best time to trade MCX in India is 7 PM–11 PM IST when US markets are open. Complete guide to morning vs evening session, commodity-specific peak hours, EIA timing, COMEX overlap, and when not to trade.',
  keywords: [
    'best time to trade MCX India',
    'MCX trading hours India 2026',
    'MCX evening session timing',
    'MCX gold best trading time',
    'MCX crude oil best time to trade',
    'MCX market open time India',
    'MCX trading hours 9 AM 11 PM',
    'MCX silver best trading session',
    'when to trade MCX commodities',
    'MCX COMEX overlap India timing',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/best-time-to-trade-mcx' },
  openGraph: {
    title: 'Best Time to Trade MCX in India 2026 | BhaavBrief',
    description: 'Morning session vs evening session, COMEX overlap, EIA release timing — complete guide to peak MCX trading hours for gold, silver, and crude oil.',
    url: 'https://bhaavbrief.in/learn/best-time-to-trade-mcx',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=Best+Time+to+Trade+MCX+India&tags=Trading+Hours,Evening+Session,COMEX', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'Best Time to Trade MCX 2026 | BhaavBrief', description: 'Morning vs evening session, COMEX overlap, EIA timing — complete guide to MCX trading hours India.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'Best Time to Trade MCX' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best time to trade MCX gold in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'The best time to trade MCX gold is between 7:00 PM and 11:30 PM IST. This is when the US market is open, US economic data is released, and COMEX (the global gold benchmark) sees its highest volume. MCX gold volume jumps sharply after 7 PM — spreads tighten, liquidity is maximum, and price discovery is most accurate. During the morning session (9 AM–1 PM), MCX gold volume is lower and prices often drift without direction until the London fixing at ~1:30 PM IST.' },
    },
    {
      '@type': 'Question',
      name: 'What is the best time to trade MCX crude oil?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX crude oil has two peak windows: (1) 6:30–7:30 PM IST when the US crude oil market opens and trading resumes on NYMEX, and (2) Wednesdays at 8:00–8:30 PM IST when the EIA US crude inventory report is released. The inventory report is the single biggest weekly event for crude — a surprise build or draw causes immediate 1–4% moves. Avoid trading crude in the Indian morning session (9 AM–3 PM) unless a major geopolitical event is live.' },
    },
    {
      '@type': 'Question',
      name: 'What is the best time to trade MCX silver?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX silver follows gold closely, so the same 7 PM–11 PM IST window applies. Silver additionally reacts to US manufacturing data (ISM PMI, released around 7:30 PM IST on the first business day of each month), which reflects industrial demand. Silver tends to be the more volatile metal — a 1.5–2% single-session move is common during the US session. If you prefer lower volatility, trade in the morning session; if you want maximum movement and liquidity, trade in the evening.' },
    },
    {
      '@type': 'Question',
      name: 'Should beginners trade the morning or evening MCX session?',
      acceptedAnswer: { '@type': 'Answer', text: 'Beginners should start with the morning session (9 AM–1 PM IST). Volatility is lower, moves are smaller, and there is less news risk. The evening session (6 PM onwards) is driven by US data releases, FOMC statements, and COMEX price action — these create sharp, fast moves that are difficult to navigate without experience. Learn price patterns in the morning session, then graduate to evening trading once you understand how global catalysts affect MCX prices.' },
    },
    {
      '@type': 'Question',
      name: 'What time does MCX close?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX closes at 11:30 PM IST during Indian Standard Time (November to March when US is on standard time, MCX extends to 11:55 PM to maintain the overlap with COMEX closing). Agricultural commodities close at 5:00 PM IST. Non-agricultural commodities (gold, silver, crude, copper, etc.) trade until 11:30 PM or 11:55 PM. MCX opens at 9:00 AM IST every weekday (Monday–Friday).' },
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
          <span style={{ color: '#18180F' }}>Best Time to Trade MCX</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          Best Time to Trade MCX in India 2026
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          A session-by-session breakdown for gold, silver, crude oil, and base metals — with exact timings for key data releases and COMEX overlap.
        </p>

        <div style={infoBox}>
          <strong>Short answer:</strong> The best time to trade MCX gold, silver, and crude oil is <strong>7:00 PM – 11:30 PM IST</strong>. This is when the US market is open, COMEX and NYMEX volumes are at their highest, and Indian MCX prices have the tightest spreads and maximum liquidity. Base metals (Copper, Zinc, Lead) peak earlier: <strong>3:30 PM – 6:30 PM IST</strong> when LME Ring closes and US copper market opens.
        </div>

        <h2 style={h2}>The Two MCX Sessions</h2>
        <p style={prose}>
          MCX trades from <strong>9:00 AM to 11:30 PM IST</strong> — a 14.5-hour window for non-agricultural commodities. But not all hours are equal. The session splits into two distinct phases with very different characteristics.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Session</th>
                <th style={th}>Time (IST)</th>
                <th style={th}>Volume</th>
                <th style={th}>Catalyst</th>
                <th style={th}>Best For</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}><strong>Morning</strong></td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13 }}>9:00 AM – 1:30 PM</td>
                <td style={td}>Low–Medium</td>
                <td style={td}>London open (1:30 PM), Asian carry-over</td>
                <td style={td}>Beginners, range trading, low-risk exposure</td>
              </tr>
              <tr style={{ background: '#FAFAF7' }}>
                <td style={td}><strong>Afternoon</strong></td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13 }}>1:30 PM – 6:30 PM</td>
                <td style={td}>Medium</td>
                <td style={td}>London session, LME metals close (3:15 PM), base metal settlements</td>
                <td style={td}>Copper, Zinc, Aluminium, Lead trades</td>
              </tr>
              <tr>
                <td style={td}><strong>Evening (Power Session)</strong></td>
                <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13 }}>6:30 PM – 11:30 PM</td>
                <td style={td}><strong>High</strong></td>
                <td style={td}>COMEX/NYMEX open, US data, Fed commentary</td>
                <td style={td}>Gold, Silver, Crude — maximum liquidity and movement</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 style={h2}>Why 7 PM is When MCX Really Wakes Up</h2>
        <p style={prose}>
          At 7:00–7:30 PM IST, the New York Mercantile Exchange (NYMEX) and COMEX open for the regular session. This is where the world&apos;s oil and gold prices are ultimately set. Within minutes of the US open, MCX gold and crude volumes spike — sometimes 3–5× the morning average.
        </p>
        <p style={prose}>
          The reason is simple: Indian MCX prices are derived from US benchmark prices (COMEX for gold/silver, NYMEX for crude oil), converted via the USD/INR exchange rate. During the day, MCX prices track overnight COMEX/NYMEX closing prices. The evening session is where live price discovery happens — where today&apos;s data, news, and trades actually set prices.
        </p>
        <div style={infoBox}>
          Most institutional traders in India — HNIs, prop desks, and commodity hedgers — place their significant positions in the 7–11 PM window. If you are trading with small capital, you are competing against better-informed participants in this session. That is the trade-off: more liquidity and movement, but also more sophisticated participants.
        </div>

        <h2 style={h2}>Commodity-by-Commodity Best Times</h2>

        <h3 style={h3}>MCX Gold &amp; Silver</h3>
        <p style={prose}>
          Peak window: <strong>7:00 PM – 10:30 PM IST</strong>. Volume drops sharply after 10:30 PM as COMEX trading slows. Key events: US CPI (released ~6:00–7:00 PM IST, first Tuesday after the 10th of each month), Federal Reserve rate decisions (8:00–8:30 PM IST), and non-farm payrolls (7:30 PM IST on first Friday of each month).
        </p>

        <h3 style={h3}>MCX Crude Oil</h3>
        <p style={prose}>
          Two peak windows: <strong>6:30–8:30 PM IST</strong> (NYMEX open + EIA inventory) and <strong>9:00–10:00 PM IST</strong> (US trading hours active). <strong>Wednesday 8:00–8:30 PM IST</strong> is the single most important weekly event — EIA crude inventory report. A surprise draw of 3M+ barrels typically triggers a ₹150–300 jump in MCX crude; a large build triggers a sharp fall.
        </p>

        <h3 style={h3}>MCX Base Metals (Copper, Zinc, Lead, Aluminium)</h3>
        <p style={prose}>
          Peak window: <strong>3:15 PM – 6:30 PM IST</strong>. The London Metal Exchange (LME) ring closes at 3:15 PM IST — this is when official LME prices are set, which MCX base metal contracts directly reference. The second window is 7:30 PM IST when US Copper and base metals trade on COMEX.
        </p>

        <h3 style={h3}>MCX Natural Gas</h3>
        <p style={prose}>
          Natural Gas is extreme — avoid it unless you know exactly what you&apos;re doing. Peak window: <strong>7:00–10:30 PM IST</strong>. The single most important event: EIA natural gas storage report, released every <strong>Thursday ~8:30 PM IST</strong>. A surprise draw or build can move MCX nat gas 5–10% in minutes. This is the highest-risk MCX contract for beginners.
        </p>

        <h2 style={h2}>Key Weekly Events Calendar (IST)</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Day</th>
                <th style={th}>Time (IST)</th>
                <th style={th}>Event</th>
                <th style={th}>Impact</th>
              </tr>
            </thead>
            <tbody>
              {[
                { day: 'Monday', time: '—', event: 'China Caixin Manufacturing PMI (monthly, early IST)', impact: 'Copper, Zinc, Base metals' },
                { day: 'Tuesday', time: '7:00–7:30 PM', event: 'API crude oil inventory (unofficial weekly)', impact: 'MCX Crude ±₹50–200' },
                { day: 'Wednesday', time: '8:00–8:30 PM', event: 'EIA crude oil inventory (official weekly)', impact: 'MCX Crude ±₹150–400' },
                { day: 'Thursday', time: '8:30–9:00 PM', event: 'EIA natural gas storage', impact: 'MCX Nat Gas ±3–10%' },
                { day: 'Friday', time: '7:30 PM (monthly)', event: 'US Non-Farm Payrolls (first Friday)', impact: 'Gold, Silver, Crude' },
                { day: 'Monthly', time: '~6:00–7:00 PM', event: 'US CPI (Consumer Price Index)', impact: 'Gold, Silver (major)' },
                { day: 'Monthly', time: '8:00–8:30 PM', event: 'FOMC rate decision (8 per year)', impact: 'All MCX — biggest event' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.day}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.time}</td>
                  <td style={td}>{r.event}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>When NOT to Trade MCX</h2>
        <div style={warnBox}>
          <strong>Avoid trading during these periods:</strong>
          <ul style={{ margin: '12px 0 0', padding: '0 0 0 20px', lineHeight: 2 }}>
            <li><strong>Last 15 minutes before MCX close (11:15–11:30 PM):</strong> Spreads widen, forced squareoffs happen, price moves are erratic</li>
            <li><strong>Within 5 minutes of a major US data release:</strong> Slippage is extreme — prices gap 0.5–2% in seconds</li>
            <li><strong>Within 3 days of contract expiry:</strong> Near-month volumes collapse, spreads widen, execution is poor</li>
            <li><strong>Indian market holidays:</strong> MCX is closed on Indian national holidays even though COMEX trades</li>
            <li><strong>US Federal holidays (Memorial Day, Thanksgiving etc.):</strong> COMEX is closed, MCX volume drops 60–80%</li>
          </ul>
        </div>

        <h2 style={h2}>Morning Session: Why Beginners Should Start Here</h2>
        <p style={prose}>
          The MCX morning session (9 AM – 1 PM) is driven by Asian price carry-over — gold and crude prices set overnight in COMEX/NYMEX. Moves are typically smaller (0.2–0.5% is common), spreads are slightly wider, but there are fewer sudden data-driven spikes.
        </p>
        <p style={prose}>
          This is where most retail Indian traders — especially those who cannot monitor screens until midnight — should operate. Use the daily brief (published at 9:30 AM IST on BhaavBrief) to understand the overnight context before placing morning trades.
        </p>

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
          <Link href="/learn/mcx-rollover" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How to rollover MCX futures
          </Link>
          <Link href="/learn/mcx-trading-hours" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX trading hours (full session guide)
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity to trade?
          </Link>
          <Link href="/learn/mcx-order-types" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX order types
          </Link>
          <Link href="/briefs" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Daily 9:30 AM MCX brief
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Timing information is for educational purposes only. MCX trading hours are subject to change. All trading involves substantial risk of loss. This is not investment advice.
        </p>
      </div>
    </>
  )
}

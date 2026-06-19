import Link from 'next/link'

export const metadata = {
  title: 'What is COMEX? Why It Matters for MCX Gold Traders in India',
  description: 'COMEX is the New York commodity exchange where world gold, silver, and copper prices are set in US dollars. Learn what COMEX is, how it affects MCX gold prices in India, and how to track it from India.',
  keywords: [
    'what is COMEX',
    'COMEX meaning in India',
    'COMEX gold price India',
    'COMEX exchange explained',
    'what is COMEX gold',
    'COMEX and MCX gold relationship',
    'COMEX gold price in rupees',
    'why COMEX affects MCX gold',
    'COMEX trading hours India',
    'what is COMEX silver',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/what-is-comex' },
  openGraph: {
    title: 'What is COMEX? Why It Matters for MCX Gold Traders in India | BhaavBrief',
    description: 'COMEX is where world gold prices are set. Learn what COMEX is, why it controls MCX gold, and how to track it from India.',
    url: 'https://bhaavbrief.in/learn/what-is-comex',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=What+is+COMEX%3F&tags=Gold,MCX,New+York,Commodity+Exchange', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'What is COMEX? Explained for MCX Traders | BhaavBrief', description: 'COMEX is the New York exchange where gold, silver, and copper world prices are set — and why every MCX trader in India needs to know it.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'What is COMEX' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is COMEX?',
      acceptedAnswer: { '@type': 'Answer', text: 'COMEX (Commodity Exchange, Inc.) is the world\'s largest and most important exchange for trading gold, silver, copper, and palladium futures. It is located in New York and is a division of the CME Group (Chicago Mercantile Exchange Group). When you hear "gold is up $15 today" on any news channel — that price is from COMEX. COMEX is to commodities what Nasdaq is to technology stocks — it sets the global reference price that every other exchange in the world follows, including India\'s MCX.' },
    },
    {
      '@type': 'Question',
      name: 'Why does COMEX affect MCX gold price in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is not priced independently — it is mathematically derived from COMEX gold using the formula: MCX Gold (₹/10g) = COMEX price ($/oz) ÷ 31.1 × 10 × USD/INR × (1 + duties). This means if COMEX gold rises $50, MCX gold will rise approximately ₹4,000–5,000 per 10g (depending on the USD/INR rate). You cannot understand MCX gold without tracking COMEX gold — they are the same price, just in different currencies and with Indian duties added.' },
    },
    {
      '@type': 'Question',
      name: 'What time does COMEX open in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'COMEX operates in two sessions. The electronic (Globex) session runs nearly 24 hours: it opens Sunday 11:00 PM IST and runs through Friday 11:30 PM IST with a 60-minute daily break. The main open-outcry (pit) session that sees the highest volume is 7:00 PM – 11:30 PM IST (Monday to Friday). The most important COMEX trading window for Indian traders is 7:00 PM – 10:30 PM IST — this is when COMEX volume peaks, spreads tighten, and MCX gold sees its largest price moves of the day.' },
    },
    {
      '@type': 'Question',
      name: 'What commodities trade on COMEX?',
      acceptedAnswer: { '@type': 'Answer', text: 'COMEX primarily trades: Gold (GC futures — 100 troy oz per contract), Silver (SI futures — 5,000 troy oz per contract), Copper (HG futures — 25,000 lbs per contract), and Palladium (PA futures). Crude oil, natural gas, and agricultural commodities trade on NYMEX (New York Mercantile Exchange), which is a sister exchange under the same CME Group. So when people say "COMEX crude," they technically mean NYMEX crude (WTI).' },
    },
    {
      '@type': 'Question',
      name: 'How do I track COMEX gold price from India?',
      acceptedAnswer: { '@type': 'Answer', text: 'You can track COMEX gold in real time through: (1) BhaavBrief price ticker — shows live COMEX gold in $/oz alongside MCX prices; (2) MCX trading terminal — shows the "COMEX Reference Price" alongside MCX price; (3) CME Group website (cmegroup.com) — official COMEX data; (4) Investing.com or TradingView — free real-time COMEX charts in $/oz. For Indian traders, the most useful view is COMEX gold in ₹/10g (after converting with USD/INR) — that tells you the "fair value" of MCX gold before Indian market opens.' },
    },
    {
      '@type': 'Question',
      name: 'What is COMEX gold in Indian rupees today?',
      acceptedAnswer: { '@type': 'Answer', text: 'To convert COMEX gold ($/oz) to Indian rupees per 10 grams: multiply the COMEX price by the current USD/INR rate, divide by 31.1035 (troy ounces per kg), and multiply by 10 (for 10g). Example: if COMEX gold is $3,300/oz and USD/INR is 84.5, the base value is ₹89,700/10g. Add Indian import duties (~12–13%) and market premium to get the MCX fair value of approximately ₹1,01,000–1,02,000/10g. BhaavBrief shows this "COMEX parity" calculation on each commodity page.' },
    },
  ],
}

export default function Page() {
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 8, marginTop: 24 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const keyBox: React.CSSProperties = { background: '#FFFBF5', border: '1px solid #E8D5B0', borderRadius: 6, padding: '20px 24px', marginBottom: 24 }
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
          <span style={{ color: '#18180F' }}>What is COMEX</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          What is COMEX? Why Every MCX Trader in India Needs to Know It
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          Every time your MCX gold price moves, COMEX moved first. Here is what it is, why it matters, and how to track it from India.
        </p>

        <div style={keyBox}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#C8720A', marginBottom: 12, fontWeight: 600 }}>
            One-Line Answer
          </div>
          <p style={{ fontSize: 16, color: '#18180F', lineHeight: 1.7, margin: 0 }}>
            <strong>COMEX</strong> (Commodity Exchange, New York) is the global exchange where <strong>gold, silver, and copper world prices are set in US dollars</strong>. MCX in India follows COMEX the way Sensex follows Dow Jones — when COMEX gold moves, MCX gold moves within minutes.
          </p>
        </div>

        <h2 style={h2}>COMEX in Plain Language</h2>
        <p style={prose}>
          Imagine you want to know the &quot;correct&quot; price of gold — not just what a local jeweller quotes, but what the entire world agrees gold is worth right now. That price comes from COMEX.
        </p>
        <p style={prose}>
          COMEX is a financial exchange in New York where large institutions — banks, hedge funds, mining companies, central banks, refiners — buy and sell gold futures contracts. These are agreements to buy or sell a fixed amount of gold at a fixed price on a future date. Because so many of the world&apos;s biggest players trade there, the price that emerges is accepted as the global reference price.
        </p>
        <p style={prose}>
          Think of it this way: if you want to know the price of a flight from Mumbai to Delhi, you look at what airlines are charging — not just one airline, but all of them together. COMEX is that clearing house for gold. Millions of contracts trade every day. The price that comes out is what the world agrees gold is worth.
        </p>
        <div style={infoBox}>
          <strong>MCX gold does not have its own price.</strong> MCX gold price = COMEX gold price, converted from US dollars to Indian rupees, with Indian import duties added. If you do not watch COMEX, you are trading MCX gold without knowing your primary input.
        </div>

        <h2 style={h2}>Where COMEX Sits in the World</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Exchange</th>
                <th style={th}>Location</th>
                <th style={th}>What It Prices</th>
                <th style={th}>Indian Connection</th>
              </tr>
            </thead>
            <tbody>
              {[
                { exchange: 'COMEX', location: 'New York, USA (CME Group)', what: 'Gold, Silver, Copper, Palladium', india: 'MCX Gold, Silver, Copper derive from COMEX' },
                { exchange: 'NYMEX', location: 'New York, USA (CME Group)', what: 'Crude Oil (WTI), Natural Gas', india: 'MCX Crude Oil, Natural Gas derive from NYMEX' },
                { exchange: 'LME', location: 'London, UK', what: 'Copper, Zinc, Aluminium, Lead, Nickel', india: 'MCX base metals (Copper, Zinc, etc.) derive from LME' },
                { exchange: 'MCX', location: 'Mumbai, India (SEBI regulated)', what: 'Indian ₹ price of all the above', india: 'Where Indian traders actually trade' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i === 3 ? '#FFFBF5' : i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 600, color: i === 0 ? '#C8720A' : '#18180F' }}>{r.exchange}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{r.location}</td>
                  <td style={td}>{r.what}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.india}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>The Chain: From New York to Your MCX Terminal</h2>
        <p style={prose}>
          Here is exactly how a price move in New York becomes a price move on your MCX screen in India:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 28 }}>
          {[
            { step: '1', title: 'Something happens in the world', detail: 'US inflation data is released. Or the Fed makes a statement. Or there is a geopolitical event. Or China publishes its manufacturing data.' },
            { step: '2', title: 'COMEX traders react instantly', detail: 'Within seconds, large banks and hedge funds adjust their gold positions on COMEX. If good news for gold (eg. Fed hints at rate cuts), they buy. If bad news (eg. dollar strengthens), they sell.' },
            { step: '3', title: 'COMEX price moves', detail: 'The gold futures price on COMEX changes — say from $3,300/oz to $3,320/oz (up $20).' },
            { step: '4', title: 'MCX terminals update', detail: 'Indian trading terminals pull the COMEX price in real time. Within 1–2 minutes, MCX gold price adjusts — in this case, rising approximately ₹1,700–1,800/10g (based on current USD/INR).' },
            { step: '5', title: 'You see it on your screen', detail: 'Your MCX gold chart shows a jump. Most Indian traders do not know why — now you do.' },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: 20, borderLeft: i < 4 ? '2px solid #E5E5DC' : 'none', marginLeft: 20, paddingLeft: 20, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: -12, top: 0,
                width: 24, height: 24, borderRadius: '50%',
                background: '#C8720A', color: 'white',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {r.step}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#18180F', marginBottom: 4 }}>{r.title}</div>
                <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.7 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>COMEX Trading Hours in India (IST)</h2>
        <p style={prose}>
          COMEX does not follow Indian market hours. It runs through the night in India, which is why MCX gold often opens at a very different price from where it closed the previous evening.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Session</th>
                <th style={th}>IST Timing</th>
                <th style={th}>What Happens</th>
                <th style={th}>MCX Impact</th>
              </tr>
            </thead>
            <tbody>
              {[
                { session: 'Asian overnight', time: '11:00 PM – 9:00 AM IST', what: 'Low COMEX volume. China, Japan trading affects metals but lightly.', impact: 'Thin MCX overnight session (if open)' },
                { session: 'London open', time: '1:30 PM – 5:30 PM IST', what: 'European banks enter. LME metals trade. Volume rises on gold.', impact: 'MCX base metals (copper, zinc) move most' },
                { session: 'COMEX open (main)', time: '7:00 PM – 11:30 PM IST', what: 'US regular session opens. Maximum volume. US data released here.', impact: 'MCX gold and silver peak volatility. Major moves happen here.' },
                { session: 'COMEX close', time: '11:30 PM IST', what: 'COMEX regular session closes. Electronic continues but thin.', impact: 'MCX closes at 11:30 PM IST (same window)' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i === 2 ? '#FFFBF5' : i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: i === 2 ? 600 : 400 }}>{r.session}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.time}</td>
                  <td style={td}>{r.what}</td>
                  <td style={{ ...td, color: '#48483A', fontWeight: i === 2 ? 500 : 400 }}>{r.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={infoBox}>
          <strong>Key insight:</strong> MCX closes at 11:30 PM IST and reopens at 9:00 AM IST the next morning. During those 9.5 hours, COMEX is still trading. Whatever happens on COMEX overnight — US data, Fed speeches, geopolitical events — is fully priced in by the time MCX opens. That is why the MCX opening price is rarely the same as the previous closing price.
        </div>

        <h2 style={h2}>What Moves COMEX Gold?</h2>
        <p style={prose}>
          Understanding COMEX means understanding what drives gold globally. The main factors, in order of importance:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {[
            { rank: '1', factor: 'US Federal Reserve policy', detail: 'When the Fed raises rates, gold falls (because bonds become more attractive than gold, which pays no interest). When the Fed cuts rates, gold rises. Every Fed statement moves COMEX gold.' },
            { rank: '2', factor: 'US Dollar (DXY Index)', detail: 'Gold is priced in dollars globally. When the dollar rises, it takes fewer dollars to buy gold — so the dollar price of gold falls. Dollar down = gold up, and vice versa.' },
            { rank: '3', factor: 'US inflation data (CPI, PCE)', detail: 'Higher inflation makes real interest rates lower (negative real rates), which is good for gold (a zero-yield asset). Surprise high CPI → gold often rallies.' },
            { rank: '4', factor: 'Geopolitical events', detail: 'Wars, crises, sanctions — gold is the world\'s safe-haven asset. When investors are scared, they buy COMEX gold. This is the "fear premium" in gold prices.' },
            { rank: '5', factor: 'Central bank buying', detail: 'Countries like China, India, Turkey, and Saudi Arabia buy gold to diversify their reserves away from US dollars. Central bank buying (especially since 2022) has created a structural floor under gold prices.' },
          ].map((r) => (
            <div key={r.rank} style={{ display: 'flex', gap: 16, padding: '14px 16px', background: '#FAFAF7', borderRadius: 4, border: '1px solid #E5E5DC' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                color: '#C8720A', flexShrink: 0, width: 20, paddingTop: 2,
              }}>
                {r.rank}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#18180F', marginBottom: 4 }}>{r.factor}</div>
                <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.7 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>How to Track COMEX from India — Free Tools</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Tool</th>
                <th style={th}>What You See</th>
                <th style={th}>Best For</th>
              </tr>
            </thead>
            <tbody>
              {[
                { tool: 'BhaavBrief price ticker', what: 'COMEX gold and silver in $/oz, live, alongside MCX prices', best: 'Quick check — both prices side by side' },
                { tool: 'BhaavBrief commodity page (/commodities/gold)', what: 'COMEX price converted to ₹/10g (import parity), live MCX, spread between them', best: 'Understanding the MCX-COMEX gap' },
                { tool: 'TradingView (tradingview.com)', what: 'Full COMEX charts — GC1! for gold, SI1! for silver, HG1! for copper', best: 'Technical analysis of COMEX gold' },
                { tool: 'Investing.com (Gold)', what: 'Live COMEX gold spot price, news, economic calendar', best: 'Checking price + upcoming events in one place' },
                { tool: 'CME Group website (cmegroup.com)', what: 'Official COMEX quotes, volume, open interest data', best: 'Checking open interest and large trader positions' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500, color: i === 0 ? '#C8720A' : '#18180F' }}>{r.tool}</td>
                  <td style={td}>{r.what}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>The One Habit Every MCX Trader Should Build</h2>
        <p style={prose}>
          Before you open your MCX terminal every morning, check two numbers:
        </p>
        <ol style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 24 }}>
          <li><strong>COMEX gold overnight:</strong> Did it close up or down vs the previous MCX close? By how much?</li>
          <li><strong>USD/INR:</strong> Did the rupee strengthen or weaken overnight? Even ₹0.50 on the dollar moves MCX gold ₹500–700/10g.</li>
        </ol>
        <p style={prose}>
          These two numbers tell you where MCX gold will open — before you see a single candle on your chart. Every morning, BhaavBrief&apos;s daily brief (published at 9:30 AM IST) does exactly this analysis and tells you how overnight COMEX and USD/INR moves have set up the Indian market.
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
          <Link href="/learn/comex-vs-mcx-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → COMEX vs MCX gold: import parity formula
          </Link>
          <Link href="/learn/why-usdinr-affects-mcx-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Why USD/INR moves MCX gold
          </Link>
          <Link href="/learn/best-time-to-trade-mcx" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Best time to trade MCX (COMEX overlap)
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity should I trade?
          </Link>
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much capital do I need for MCX?
          </Link>
          <Link href="/commodities/gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Live MCX gold price & analysis
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: This guide is for educational purposes only. Commodity trading involves substantial risk. COMEX prices are indicative — always verify through your broker or exchange terminal before trading. This is not investment advice.
        </p>
      </div>
    </>
  )
}

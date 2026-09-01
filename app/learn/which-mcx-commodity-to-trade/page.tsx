import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

export const metadata = {
  title: 'Which MCX Commodity Should I Trade? — Beginner Guide India 2026',
  description: 'Best MCX commodity for beginners in India: Crude Oil Mini for under ₹50,000 capital, Gold Mini for ₹1–1.5 lakh. Full decision matrix: capital, risk, screen time, and trading hours for every MCX commodity.',
  keywords: [
    'which MCX commodity to trade India beginners',
    'MCX mein kya trade karein',
    'best MCX commodity for beginners India 2026',
    'MCX gold vs crude oil vs silver which is better',
    'MCX commodity for small capital India',
    'MCX crude oil mini beginner India',
    'MCX gold mini vs crude mini',
    'best commodity to trade on MCX India',
    'MCX commodity selection guide India',
    'which MCX futures to buy',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/which-mcx-commodity-to-trade' },
  openGraph: {
    title: 'Which MCX Commodity Should I Trade? | BhaavBrief',
    description: 'Crude Oil Mini for beginners under ₹50k, Gold Mini for ₹1–1.5L. Full MCX commodity selection guide for Indian retail traders.',
    url: 'https://bhaavbrief.in/learn/which-mcx-commodity-to-trade',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=Which+MCX+Commodity+to+Trade%3F&tags=Beginner,Strategy,MCX+India', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'Best MCX Commodity for Beginners India 2026 | BhaavBrief', description: 'Crude Mini for <₹50k. Gold Mini for ₹1–1.5L. Full MCX commodity selection guide with capital, risk, and timing matrix.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'Which MCX Commodity to Trade' },
  ],
}

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to choose which MCX commodity to trade in India',
  description: 'Step-by-step decision framework for Indian retail traders choosing their first or next MCX commodity to trade.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Determine your available capital', text: 'Count only risk capital — money you can afford to lose. Under ₹25,000 → Crude Oil Mini or Natural Gas Mini. ₹25,000–75,000 → Silver Micro or Copper Mini. ₹75,000–1,50,000 → Gold Mini. Above ₹1,50,000 → any contract.' },
    { '@type': 'HowToStep', position: 2, name: 'Assess your screen time availability', text: 'If you can only trade evenings (7–10 PM IST), choose Crude Oil Mini, Gold Mini, or Silver (COMEX-driven, most volatile in this window). If you trade afternoons (2–6 PM IST), Copper or Zinc follow LME afternoon session. If you can trade mornings (9–11 AM IST), all contracts are active at MCX open.' },
    { '@type': 'HowToStep', position: 3, name: 'Match volatility to your risk tolerance', text: 'For calm, slow moves: Copper or Zinc. For moderate volatility: Gold Mini. For higher volatility: Crude Oil (EIA Wednesday, OPEC events). For extreme volatility: Silver or Natural Gas — avoid as a beginner.' },
    { '@type': 'HowToStep', position: 4, name: 'Start with 1 lot for at least 30 trades', text: 'Never start with more than 1 lot regardless of capital. Trade the same commodity for at least 30 trades to understand its rhythm — how it responds to news, how wide the spread is during day vs evening, how much slippage you get at your broker.' },
    { '@type': 'HowToStep', position: 5, name: 'Read the daily brief before every trade', text: 'Check what is driving the commodity today — OPEC news for crude, COMEX for gold, LME for copper. Trading without knowing the day\'s key driver is gambling. BhaavBrief publishes a daily MCX brief every morning at 9:30 AM.' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which MCX commodity is best for beginners in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'For beginners with under ₹50,000: MCX Crude Oil Mini (10 barrels). Reasons: lowest margin (₹3,000–5,000), smallest P&L per 1% move (₹710), excellent liquidity especially in evening session, clear news drivers (OPEC, EIA weekly inventory). For beginners with ₹75,000–1,50,000: MCX Gold Mini (100g). Reasons: most liquid MCX contract, tracks COMEX gold cleanly, well-understood by most Indian traders, 9 AM–11:30 PM MCX trading window. Avoid for beginners: MCX Silver (too volatile), Natural Gas (extreme volatility), and standard contracts (oversized for retail capital).' },
    },
    {
      '@type': 'Question',
      name: 'MCX gold vs crude oil — which is better to trade?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Mini: Better for traders with ₹75,000+ who want predictable, COMEX-driven moves. Gold moves 0.5–1.5% on a typical day, driven by USD/INR and COMEX. It peaks in the evening session (7–11 PM IST) when US markets are active. MCX Crude Oil Mini: Better for traders with ₹10,000–50,000 who want higher frequency trades. Crude moves 1–3% on a typical day, with sharp spikes on EIA inventory data (every Wednesday 8:00–8:30 PM IST) and OPEC news. Crude is more volatile, so risk management is more important. Choose Gold if you prefer stability; choose Crude if you can monitor the evening EIA window.' },
    },
    {
      '@type': 'Question',
      name: 'Is MCX silver good for beginners?',
      acceptedAnswer: { '@type': 'Answer', text: 'No — MCX silver is not recommended for beginners. Silver is the most volatile mainstream MCX commodity, routinely moving 3–5% in a single day. MCX Silver Micro (1 kg) costs ~₹2,470 per 1% move — manageable in isolation, but a 4% adverse day is ₹9,880 loss on a ₹7,000 margin. Silver is also "gold with leverage" — it amplifies gold moves plus has its own industrial demand component (solar, EVs, electronics), making it harder to predict. Start with Crude or Gold Mini, learn the market, and graduate to Silver after 6+ months of consistent trading.' },
    },
    {
      '@type': 'Question',
      name: 'Can I trade MCX Natural Gas as a beginner?',
      acceptedAnswer: { '@type': 'Answer', text: 'Strongly avoid MCX Natural Gas as a beginner. Natural Gas is the most volatile commodity on MCX — 5–10% daily moves are not uncommon, and 15–20% moves happen multiple times a year. The margin is low (₹4,000–6,000 for Mini), which makes it look accessible, but a 5% move against you wipes your margin entirely. Natural Gas is driven by US weather forecasts, EIA storage reports, and NYMEX speculation — all factors that are difficult to read without experience. If you trade Natural Gas, use very tight stop-losses and never hold through EIA data releases.' },
    },
    {
      '@type': 'Question',
      name: 'What time should I trade MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'The best MCX trading window depends on which commodity you trade. For Crude Oil Mini: 7:30–9:30 PM IST (NYMEX open, highest volume, tightest spreads; EIA data at 8:00–8:30 PM IST on Wednesdays). For Gold Mini: 7:30–11:30 PM IST (COMEX peak volume; US economic data releases). For Copper/Zinc: 2:00–6:00 PM IST (LME afternoon session peak). Morning session (9:00–11:00 AM IST) is active for all contracts at MCX open, but spreads are wider than the evening window. Avoid trading MCX between 12–5 PM IST — this is the low-volume lunch/afternoon lull with wider spreads and slower moves.' },
    },
    {
      '@type': 'Question',
      name: 'Which MCX commodity has the most liquidity in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Mini is the most liquid commodity contract in India by volume and open interest, followed by MCX Crude Oil (standard and mini), MCX Silver (all variants), and MCX Copper. Gold Mini has the tightest bid-ask spreads on MCX, making it easiest to enter and exit positions cleanly. Natural Gas and base metals (Zinc, Lead, Nickel, Aluminium) have thinner liquidity — wider spreads and more slippage — which increases the cost of trading even if their margin is lower.' },
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
  const mono: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }

  const recommendations: {
    capital: string
    commodity: string
    reason: string
    avoid: string
    color: string
  }[] = [
    { capital: 'Under ₹25,000', commodity: 'MCX Crude Oil Mini', reason: 'Lowest margin, manageable P&L per 1% move (₹710), excellent evening liquidity', avoid: 'Everything else', color: '#2E6E3B' },
    { capital: '₹25,000–75,000', commodity: 'Silver Micro or Crude Mini', reason: 'Silver Micro gives ₹2,470/1% P&L; Crude Mini for those who prefer cleaner news drivers', avoid: 'Gold Mini (need ₹75K+)', color: '#2E6E3B' },
    { capital: '₹75,000–1,50,000', commodity: 'MCX Gold Mini', reason: 'Most liquid MCX contract, tracks COMEX cleanly, good for evening session traders', avoid: 'Silver standard, Crude standard', color: '#C8720A' },
    { capital: '₹1,50,000–5,00,000', commodity: 'Gold Mini + Crude Mini', reason: 'Two-commodity approach: gold for evening, crude for EIA days', avoid: 'Natural Gas, standard gold', color: '#C8720A' },
    { capital: 'Above ₹5,00,000', commodity: 'Gold Mini + Silver Mini + Crude', reason: 'Full liquid MCX universe, can trade multiple contracts with risk allocation', avoid: 'Natural Gas as primary contract', color: '#8A8A7A' },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(HOWTO_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>Which MCX Commodity to Trade</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          Which MCX Commodity Should I Trade?
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          A decision framework for Indian retail traders — matched to your capital, risk tolerance, and how much time you can spend watching markets.
        </p>

        <div style={infoBox}>
          <strong>Quick answer:</strong> If you have under ₹50,000 — start with <strong>MCX Crude Oil Mini</strong> (lowest margin, evening liquidity, clear news drivers). If you have ₹75,000–1,50,000 — start with <strong>MCX Gold Mini</strong> (most liquid MCX contract, tracks COMEX). Avoid Natural Gas and Silver as a beginner.
        </div>

        <h2 style={h2}>Recommendation by Capital</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {recommendations.map((r, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${r.color}`, padding: '14px 18px', background: '#FAFAF7', borderRadius: '0 4px 4px 0' }}>
              <div style={{ ...mono, fontSize: 12, color: '#8A8A7A', marginBottom: 4 }}>{r.capital}</div>
              <div style={{ fontWeight: 600, color: r.color, marginBottom: 4, fontSize: 15 }}>{r.commodity}</div>
              <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.6 }}>{r.reason}</div>
              <div style={{ fontSize: 12, color: '#8A8A7A', marginTop: 4 }}>Avoid: {r.avoid}</div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Full MCX Commodity Comparison — Decision Matrix</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Contract</th>
                <th style={{ ...th, textAlign: 'right' }}>Min. Capital</th>
                <th style={{ ...th, textAlign: 'right' }}>P&L per 1%</th>
                <th style={th}>Volatility</th>
                <th style={th}>Best Session (IST)</th>
                <th style={th}>Beginner?</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Crude Oil Mini', capital: '₹8,000–15,000', pnl: '~₹710', vol: 'Medium–High', session: '7:30–9:30 PM (EIA Wed 8 PM)', beginner: 'Yes ✓', beginnerColor: '#2E6E3B' },
                { name: 'Natural Gas Mini', capital: '₹10,000–18,000', pnl: '~₹750', vol: 'Very High ⚠', session: '7:30–9:30 PM', beginner: 'No', beginnerColor: '#C0392B' },
                { name: 'Silver Micro', capital: '₹15,000–20,000', pnl: '~₹2,470', vol: 'High', session: '7:00–11:30 PM', beginner: 'Moderate', beginnerColor: '#7A6000' },
                { name: 'Copper Mini', capital: '₹18,000–25,000', pnl: '~₹3,300', vol: 'Low–Medium', session: '2:00–6:00 PM (LME)', beginner: 'Yes ✓', beginnerColor: '#2E6E3B' },
                { name: 'Zinc Mini', capital: '₹15,000–20,000', pnl: '~₹2,000', vol: 'Low–Medium', session: '2:00–6:00 PM (LME)', beginner: 'Yes ✓', beginnerColor: '#2E6E3B' },
                { name: 'Gold Mini', capital: '₹1,00,000–1,25,000', pnl: '~₹15,200', vol: 'Low–Medium', session: '7:00–11:30 PM (COMEX)', beginner: 'Yes ✓ (with capital)', beginnerColor: '#2E6E3B' },
                { name: 'Silver Mini', capital: '₹50,000–70,000', pnl: '~₹12,350', vol: 'High', session: '7:00–11:30 PM', beginner: 'No', beginnerColor: '#C0392B' },
                { name: 'Crude Oil (Std)', capital: '₹60,000–80,000', pnl: '~₹7,100', vol: 'Medium–High', session: '7:30–9:30 PM', beginner: 'No — use Mini', beginnerColor: '#7A6000' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.name}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, textAlign: 'right', color: '#C8720A' }}>{r.capital}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, textAlign: 'right' }}>{r.pnl}</td>
                  <td style={td}>{r.vol}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{r.session}</td>
                  <td style={{ ...td, fontWeight: 600, color: r.beginnerColor }}>{r.beginner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>Deep Dive: Each MCX Commodity</h2>

        <h3 style={h3}>MCX Crude Oil Mini — The Beginner&apos;s Entry Point</h3>
        <p style={prose}>
          MCX Crude Oil Mini (10 barrels) is the single best starting contract for most Indian retail traders. The margin is the lowest on MCX (₹3,000–5,000), the P&L per 1% move is small enough to survive early mistakes (₹710), and the contract has excellent liquidity during the evening session when NYMEX is active.
        </p>
        <p style={prose}>
          The key driver is <strong>EIA Crude Oil Inventory</strong> data, released every Wednesday at approximately 8:00–8:30 PM IST. This creates a predictable high-volatility window you can prepare for. On non-EIA days, crude follows OPEC sentiment, USD strength, and broader risk appetite.
        </p>
        <div style={infoBox}>
          <strong>Crude Mini in numbers:</strong> At ₹7,100/bbl × 10 barrels = ₹71,000 contract value. 1% move = ₹710. A 3% adverse day (common on EIA) = ₹2,130 loss — manageable with a ₹10,000–15,000 account.
        </div>

        <h3 style={h3}>MCX Gold Mini — The Most Popular Retail Contract</h3>
        <p style={prose}>
          MCX Gold Mini (100g) is the contract most active Indian retail traders use once they have enough capital. It is the most liquid MCX contract by far — tightest spreads, fastest execution, and the deepest order book outside of MCX Gold standard.
        </p>
        <p style={prose}>
          Gold Mini moves are driven by COMEX gold (international price) and USD/INR (rupee-dollar exchange rate). A ₹1 move in USD/INR moves MCX gold by approximately ₹350–400 per 10g. COMEX moves during US market hours (7 PM – 11:30 PM IST) are directly reflected on MCX in real time.
        </p>
        <p style={prose}>
          The risk: a 1% Gold Mini move is ₹15,200. A bad trade can cost more than a month&apos;s margin in a single session. Never trade Gold Mini without a defined stop-loss and never without reading what COMEX did overnight.
        </p>

        <h3 style={h3}>MCX Silver — For Experienced Traders Only</h3>
        <p style={prose}>
          Silver is &quot;gold on steroids&quot; — it amplifies every gold move and adds its own industrial demand layer (solar panels, EV batteries, electronics manufacturing). Silver Micro (1 kg) has a low enough margin for beginners (₹5,000–8,000), but the volatility makes it dangerous. A 5% silver move is not unusual — that is ₹12,350 on a Silver Micro, nearly 2× the margin.
        </p>
        <p style={prose}>
          The Gold:Silver ratio is a key signal — when silver underperforms gold for weeks, a catch-up is likely. This kind of multi-month thinking is not beginner territory. Trade Silver Micro only after you have 6+ months of MCX experience and understand how it diverges from gold.
        </p>

        <div style={warnBox}>
          <strong>Avoid MCX Natural Gas as a beginner.</strong> Natural Gas on MCX can move 8–15% in a single day. The low margin (₹4,000–6,000) is deceptive — at a 5% move, you lose your entire margin. Natural Gas is driven by US weather forecasts, storage data, and LNG export demand — factors that require specialist knowledge to trade effectively. Even experienced traders use very tight stops on Natural Gas.
        </div>

        <h3 style={h3}>MCX Copper & Zinc — Overlooked but Solid</h3>
        <p style={prose}>
          MCX Copper Mini (250 kg) and Zinc Mini are underrated by retail traders because they are less glamorous than gold or crude. But they have important advantages: lower volatility, clear LME-driven price action in the afternoon session (2–6 PM IST), and reasonable P&L per 1% move. Copper is directly tied to China&apos;s industrial activity and LME warehouse stocks — clear, trackable drivers that do not require you to monitor US night markets.
        </p>

        <h2 style={h2}>The One Rule Every Beginner Breaks</h2>
        <p style={prose}>
          <strong>Starting with multiple contracts simultaneously.</strong> New traders think diversification reduces risk. On MCX, it multiplies it. If you are in Crude, Gold, and Silver at the same time, and global risk-off hits (equity crash, USD spike), all three move against you simultaneously and each one has a margin call.
        </p>
        <p style={prose}>
          Pick one contract. Trade it for 30 trades. Learn its rhythm — how it opens, when volume picks up, how it reacts to news, how wide the spread is on your broker during volatile vs quiet times. Only then consider a second contract.
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
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much money do I need to start MCX?
          </Link>
          <Link href="/learn/best-time-to-trade-mcx" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Best time to trade MCX
          </Link>
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator
          </Link>
          <Link href="/learn/mcx-gold-vs-physical-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX gold vs physical gold
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: MCX commodity trading involves substantial risk of loss. This is educational content only and not investment advice. Past price patterns do not guarantee future results. Always use stop-losses and trade only with capital you can afford to lose.
        </p>
      </div>
    </>
  )
}

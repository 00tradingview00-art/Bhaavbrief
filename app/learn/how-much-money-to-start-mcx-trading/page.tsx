import Link from 'next/link'

export const metadata = {
  title: 'How Much Money Do You Need to Start MCX Trading in India? (2026)',
  description: 'Minimum capital to start MCX trading in India: ₹3,000–5,000 for Crude Oil Mini, ₹55,000–75,000 for Gold Mini, ₹5,000–8,000 for Silver Micro. Complete guide with margin requirements, recommended capital, and common beginner mistakes.',
  keywords: [
    'how much money to start MCX trading India',
    'MCX trading minimum capital 2026',
    'MCX minimum margin India',
    'MCX trading ke liye kitna paisa chahiye',
    'MCX gold minimum investment',
    'MCX crude oil minimum capital',
    'start trading MCX with 10000 rupees',
    'MCX trading beginner capital India',
    'minimum amount to trade MCX gold',
    'MCX silver minimum investment India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/how-much-money-to-start-mcx-trading' },
  openGraph: {
    title: 'How Much Money to Start MCX Trading in India? | BhaavBrief',
    description: 'Minimum capital for MCX trading: ₹3,000 for Crude Mini to ₹75,000 for Gold Mini. Exact margin requirements, recommended buffers, and beginner guidance.',
    url: 'https://bhaavbrief.in/learn/how-much-money-to-start-mcx-trading',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=How+Much+Money+for+MCX+Trading%3F&tags=Beginner,Capital,Margin,MCX+India', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'Minimum Capital for MCX Trading India 2026 | BhaavBrief', description: '₹3,000 for Crude Mini to ₹75,000 for Gold Mini — exact capital needed to start MCX trading in India.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'How Much Money to Start MCX Trading' },
  ],
}

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to calculate how much capital you need to start MCX trading',
  description: 'Step-by-step method to determine the right starting capital for MCX commodity trading in India.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Choose your starting commodity', text: 'Pick based on capital: under ₹25,000 → Crude Oil Mini or Natural Gas. ₹25,000–1,00,000 → Gold Mini or Silver Micro. Above ₹1,00,000 → any contract.' },
    { '@type': 'HowToStep', position: 2, name: 'Check the SPAN margin', text: 'Look up today\'s SPAN margin on the MCX website or your broker\'s margin calculator. This is the minimum deposit to open 1 lot.' },
    { '@type': 'HowToStep', position: 3, name: 'Add a 50% buffer for MTM losses', text: 'Margin covers your position but not adverse moves. Add 50% extra as a safety buffer. If SPAN is ₹60,000, keep ₹90,000 in your account.' },
    { '@type': 'HowToStep', position: 4, name: 'Add brokerage and charges', text: 'MCX charges CTT (0.01% on sell), exchange charges, and your broker\'s brokerage. Budget ₹50–200 per trade depending on contract size.' },
    { '@type': 'HowToStep', position: 5, name: 'Start with 1 lot only', text: 'Never start with more than 1 lot. Even experienced traders start with 1 lot in a new commodity. Understand the rhythm of the contract before scaling up.' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much money do I need to start MCX trading in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'The minimum capital depends on which MCX contract you trade. MCX Crude Oil Mini (10 barrels) requires ₹3,000–5,000 SPAN margin — the cheapest entry point on MCX. MCX Gold Mini (100g) requires ₹55,000–75,000. MCX Silver Micro (1 kg) requires ₹5,000–8,000. However, margin alone is not enough — you should keep 1.5–2× the margin in your account to cover adverse price moves (mark-to-market losses). Practical starting capital: ₹8,000–15,000 for Crude Mini, ₹1,00,000–1,50,000 for Gold Mini.' },
    },
    {
      '@type': 'Question',
      name: 'Can I start MCX trading with ₹5,000?',
      acceptedAnswer: { '@type': 'Answer', text: 'Technically yes — MCX Crude Oil Mini requires ₹3,000–5,000 SPAN margin. But trading with exactly the margin amount is extremely risky. A single adverse move of 1–2% can trigger a margin call, and your broker may force-close your position. With ₹5,000, you have no buffer. The recommended minimum for Crude Mini is ₹10,000–15,000 so you have enough cushion to survive normal price swings without getting wiped out on your first trade.' },
    },
    {
      '@type': 'Question',
      name: 'Can I start MCX trading with ₹10,000?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, ₹10,000–15,000 is a workable starting amount for MCX Crude Oil Mini (10 barrels) or MCX Natural Gas Mini. These are the most accessible MCX contracts for small capital. At ₹10,000, trade only 1 lot, never add positions, and always use stop-losses. Do not attempt MCX Gold or Silver with ₹10,000 — the margin alone exceeds your capital. MCX Crude Mini at ₹7,100/bbl × 10 barrels = ₹71,000 contract value; margin is roughly 5% = ₹3,550. Your ₹10,000 gives you a reasonable buffer.' },
    },
    {
      '@type': 'Question',
      name: 'What is the minimum amount to trade MCX gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'The smallest MCX Gold contract with reasonable liquidity is Gold Mini (100g), which requires ₹55,000–75,000 in SPAN margin at current prices around ₹1,50,000/10g (Gold Mini contract value = ₹15,00,000). To trade Gold Mini safely, keep at least ₹1,00,000–1,25,000 in your account. The even smaller Gold Guinea (8g) exists but has very low liquidity and wide spreads — not recommended. There is no way to trade MCX gold with ₹5,000 or ₹10,000.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between margin and capital needed for MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Margin is the minimum deposit to open a position — it is blocked but not lost. Capital is the total amount you should keep in your account. You need capital = margin + buffer for losses. If gold moves 2% against you on a Gold Mini contract (₹15L value), your loss is ₹30,000 — debited from your account daily via MTM settlement. If your account only had the ₹60,000 margin, it drops to ₹30,000 and your broker calls for more margin. Always keep 1.5–2× the margin as your total account balance.' },
    },
    {
      '@type': 'Question',
      name: 'How much money do I need to trade MCX silver?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Silver Micro (1 kg) requires ₹5,000–8,000 SPAN margin and is the smallest silver contract. MCX Silver Mini (5 kg) requires ₹25,000–40,000. MCX Silver standard (30 kg) requires ₹1,60,000–2,20,000. Silver is more volatile than gold — a 3% daily move is common, which means ₹7,000–8,000 P&L per Micro lot per 1% move. Recommended starting capital for Silver Micro: ₹15,000–20,000 minimum.' },
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(HOWTO_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>How Much Money to Start MCX Trading</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          How Much Money Do You Need to Start MCX Trading in India?
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          Exact minimum capital for every major MCX contract — with the buffer you actually need, not just the margin.
        </p>

        <div style={infoBox}>
          <strong>Short answer:</strong> You need as little as <strong>₹8,000–15,000</strong> to start with MCX Crude Oil Mini. For MCX Gold Mini, you need <strong>₹1,00,000–1,25,000</strong>. Never trade with just the margin amount — always keep 1.5–2× margin in your account to survive normal market swings.
        </div>

        <h2 style={h2}>Minimum Capital by MCX Contract — 2026</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Contract</th>
                <th style={th}>Lot Size</th>
                <th style={{ ...th, textAlign: 'right' }}>SPAN Margin</th>
                <th style={{ ...th, textAlign: 'right' }}>Recommended Capital</th>
                <th style={{ ...th, textAlign: 'right' }}>P&L per 1% Move</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'MCX Crude Oil Mini', lot: '10 bbl', margin: '₹3,000–5,000', capital: '₹8,000–15,000', pnl: '~₹710', highlight: false },
                { name: 'MCX Natural Gas Mini', lot: '250 mmBtu', margin: '₹4,000–6,000', capital: '₹10,000–18,000', pnl: '~₹750', highlight: false },
                { name: 'MCX Silver Micro', lot: '1 kg', margin: '₹5,000–8,000', capital: '₹15,000–20,000', pnl: '~₹2,470', highlight: false },
                { name: 'MCX Copper Mini', lot: '250 kg', margin: '₹8,000–12,000', capital: '₹18,000–25,000', pnl: '~₹3,300', highlight: false },
                { name: 'MCX Gold Mini', lot: '100g', margin: '₹55,000–75,000', capital: '₹1,00,000–1,25,000', pnl: '~₹15,200', highlight: true },
                { name: 'MCX Silver Mini', lot: '5 kg', margin: '₹25,000–40,000', capital: '₹50,000–70,000', pnl: '~₹12,350', highlight: false },
                { name: 'MCX Crude Oil (standard)', lot: '100 bbl', margin: '₹30,000–45,000', capital: '₹60,000–80,000', pnl: '~₹7,100', highlight: false },
                { name: 'MCX Gold (standard)', lot: '1 kg', margin: '₹5,00,000–7,00,000', capital: '₹8,00,000+', pnl: '~₹1,52,000', highlight: false },
                { name: 'MCX Silver (standard)', lot: '30 kg', margin: '₹1,60,000–2,20,000', capital: '₹3,00,000+', pnl: '~₹74,100', highlight: false },
              ].map((r, i) => (
                <tr key={i} style={{ background: r.highlight ? '#FFFBF5' : i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: r.highlight ? 600 : 400, color: r.highlight ? '#C8720A' : '#18180F' }}>{r.name}</td>
                  <td style={{ ...td, ...mono, fontSize: 13 }}>{r.lot}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, textAlign: 'right', color: '#C8720A', fontWeight: 500 }}>{r.margin}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{r.capital}</td>
                  <td style={{ ...td, ...mono, fontSize: 13, textAlign: 'right', color: '#48483A' }}>{r.pnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 28, lineHeight: 1.6 }}>
          * SPAN margins are approximate based on mid-2026 prices and change daily. Recommended capital = SPAN margin × 1.8 to account for MTM losses and broker exposure margin. P&L per 1% move is based on approximate current MCX prices.
        </p>

        <h2 style={h2}>Margin vs Capital — The Difference That Trips Beginners</h2>
        <p style={prose}>
          This is the most common beginner mistake: depositing exactly the margin amount and nothing more.
        </p>
        <p style={prose}>
          <strong>Margin</strong> is the deposit that MCX requires to open a position. It is like a security deposit — it is blocked in your account but not immediately lost. The problem is that commodity prices move every day, and those losses are debited from your account <em>daily</em> — not at the end of the trade.
        </p>
        <div style={infoBox}>
          <strong>Example:</strong> You open 1 lot of MCX Gold Mini. Margin: ₹60,000. You deposit exactly ₹60,000. Gold moves against you by 1.5% the next day. Loss = ₹15,200 × 1.5 = ₹22,800. Your account balance falls to ₹37,200 — below the maintenance margin. Your broker calls for top-up. If you don&apos;t add funds by next morning, they force-close your position at the worst possible time.
        </div>
        <p style={prose}>
          The solution: always keep <strong>1.5–2× the SPAN margin</strong> as your total account balance. If SPAN is ₹60,000, keep ₹1,00,000–1,20,000 in the account. This gives you room to breathe through normal adverse moves without getting margin-called.
        </p>

        <h2 style={h2}>Which Contract Should You Start With?</h2>

        <h3 style={h3}>If you have under ₹25,000 — MCX Crude Oil Mini</h3>
        <p style={prose}>
          MCX Crude Oil Mini (10 barrels) is the most accessible MCX contract. Margin of ₹3,000–5,000 means even ₹10,000–15,000 gives you a buffer. The contract value is small (₹71,000 at ₹7,100/bbl × 10), so a 1% move is only ₹710 — manageable for a beginner learning the market. Trade only in the evening session (7:30–9:30 PM IST) when NYMEX volume is high and spreads are tight.
        </p>

        <h3 style={h3}>If you have ₹25,000–75,000 — Silver Micro or Copper Mini</h3>
        <p style={prose}>
          MCX Silver Micro (1 kg) is a good intermediate contract — small enough to manage with ₹15,000–20,000, but large enough that moves are meaningful. Copper Mini is also in this range and is less volatile than silver, driven by LME afternoon session (3–6 PM IST).
        </p>

        <h3 style={h3}>If you have ₹75,000–1,50,000 — MCX Gold Mini</h3>
        <p style={prose}>
          Gold Mini (100g) is the sweet spot for most retail MCX traders. It tracks COMEX gold cleanly, has excellent liquidity, and the ₹15,200 P&L per 1% move is large enough to be meaningful but not terrifying. This is the contract most active Indian retail traders graduate to after learning basics on Crude Mini.
        </p>

        <h3 style={h3}>If you have above ₹1,50,000 — any contract, still start small</h3>
        <p style={prose}>
          Even with large capital, start with 1 lot of your chosen contract. Learn the specific rhythm — how it reacts to news, what time of day it moves most, how your broker&apos;s execution works. Scale up only after 20–30 trades.
        </p>

        <div style={warnBox}>
          <strong>The #1 beginner mistake:</strong> Starting with MCX Gold standard (1 kg) because &quot;gold is safe.&quot; MCX Gold standard requires ₹5–7 lakh margin and a 1% move is ₹1,52,000 P&L. A 2% move against you wipes ₹3 lakh from your account overnight. Gold Mini exists for a reason — use it.
        </div>

        <h2 style={h2}>What Your ₹X Gets You on MCX</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Starting Capital</th>
                <th style={th}>Best Contract</th>
                <th style={th}>What You Can Do</th>
                <th style={th}>What You Cannot Do</th>
              </tr>
            </thead>
            <tbody>
              {[
                { capital: '₹5,000', contract: 'Nothing safely', can: 'Open a demat/trading account, paper trade', cannot: 'Any real MCX position with safe buffer' },
                { capital: '₹10,000–15,000', contract: 'Crude Oil Mini (1 lot)', can: 'Learn MCX, experience real P&L, trade crude evening session', cannot: 'Gold, Silver, Copper — too small' },
                { capital: '₹25,000–50,000', contract: 'Silver Micro or Crude Mini', can: 'Trade 1–2 contracts, meaningful P&L per trade', cannot: 'Gold Mini — need ₹75K+' },
                { capital: '₹75,000–1,50,000', contract: 'Gold Mini (primary)', can: 'Trade the most popular retail MCX contract, full evening session', cannot: 'Gold standard — need ₹6L+' },
                { capital: '₹1,50,000–5,00,000', contract: 'Gold Mini + Crude', can: 'Multiple contracts, build a commodity portfolio', cannot: 'Gold standard still risky below ₹8L' },
                { capital: '₹5,00,000+', contract: 'Any contract', can: 'Full MCX universe, multiple lots', cannot: 'Nothing — this is active trading capital' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, ...mono, fontWeight: 600, color: '#C8720A' }}>{r.capital}</td>
                  <td style={{ ...td, fontWeight: 500 }}>{r.contract}</td>
                  <td style={{ ...td, color: '#2E6E3B' }}>{r.can}</td>
                  <td style={{ ...td, color: '#8A8A7A' }}>{r.cannot}</td>
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
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator (live prices)
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity should I trade?
          </Link>
          <Link href="/learn/best-time-to-trade-mcx" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Best time to trade MCX
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Margin figures are estimates based on typical MCX SPAN margins and change daily with price volatility. Always verify current margin requirements with your broker before trading. MCX commodity trading involves substantial risk of loss and is not suitable for all investors. This is not investment advice.
        </p>
      </div>
    </>
  )
}

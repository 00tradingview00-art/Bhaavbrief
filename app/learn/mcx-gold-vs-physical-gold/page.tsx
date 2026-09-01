import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

export const metadata = {
  title: 'MCX Gold vs Physical Gold India — What is the Difference? (2026)',
  description: 'MCX gold is a futures contract, not real gold. Learn the difference between MCX gold and physical gold in India — delivery, prices, minimum investment, and who should use each.',
  keywords: [
    'MCX gold vs physical gold India',
    'MCX gold aur physical gold mein kya fark hai',
    'is MCX gold real gold',
    'MCX gold se physical gold milta hai kya',
    'MCX gold delivery process India',
    'can I buy physical gold through MCX',
    'MCX gold vs gold ETF vs physical gold',
    'MCX gold minimum investment India',
    'gold futures vs physical gold India',
    'MCX gold contract explanation India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-gold-vs-physical-gold' },
  openGraph: {
    title: 'MCX Gold vs Physical Gold India | BhaavBrief',
    description: 'MCX gold is a futures contract, not physical gold. Understand the key differences, minimum investment, and who should use each.',
    url: 'https://bhaavbrief.in/learn/mcx-gold-vs-physical-gold',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Gold+vs+Physical+Gold&tags=Beginner,Gold,MCX+India', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Gold vs Physical Gold India 2026 | BhaavBrief', description: 'MCX gold is NOT physical gold — it is a futures contract. Learn the difference and decide which is right for you.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Gold vs Physical Gold' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between MCX gold and physical gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is a futures contract — a legal agreement to buy or sell gold at a fixed price on a future date. You are not buying actual gold; you are buying/selling a financial contract on MCX exchange. Physical gold is actual gold metal — jewellery, coins, bars, ETFs backed by physical gold. The MCX gold price tracks physical gold prices closely, but 99.9% of retail MCX traders never take delivery — they settle in cash. Physical gold requires a locker or safe; MCX gold only requires a trading account.' },
    },
    {
      '@type': 'Question',
      name: 'Is MCX gold real gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is NOT physical gold. It is a futures contract traded on MCX (Multi Commodity Exchange of India). When you buy MCX gold, you own a contract — not gold. The price moves exactly with international and domestic gold prices, but you do not hold any gold. You can choose to take physical delivery of gold from MCX (from NSDL-approved vaults), but this requires meeting strict delivery lot requirements (minimum 100g for Gold Mini) and completing the delivery process before expiry. Almost no retail trader does this.' },
    },
    {
      '@type': 'Question',
      name: 'Can I take physical delivery of gold from MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, MCX allows physical delivery of gold, but the process is complex and rarely used by retail traders. To take delivery, you must hold your Gold Mini (100g) or Gold standard (1 kg) contract through the delivery period (last 5 days of the contract). Your broker must be registered for delivery, you must pay the full contract value (not just margin), and then gold is credited to your NSDL demat vault account as "electronic gold" (EGR — Electronic Gold Receipt). Converting that to physical bars requires going to an approved MCX vault. Most retail traders simply roll over or square off before expiry.' },
    },
    {
      '@type': 'Question',
      name: 'What is the minimum investment for MCX gold vs physical gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold: The smallest contract is Gold Mini (100g), which requires ₹55,000–75,000 in margin at current prices (~₹90,000/10g). There is also Gold Guinea (8g) but it has very poor liquidity. You cannot invest ₹5,000 or ₹10,000 in MCX gold — the minimum entry is approximately ₹55,000. Physical gold: You can buy from as little as ₹500 (digital gold) or 1 gram of gold coin (~₹9,200). Physical gold has no lower limit — even ₹1,000 can buy a small amount digitally.' },
    },
    {
      '@type': 'Question',
      name: 'MCX gold vs Gold ETF — what should I choose?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is for active trading with leverage (~16x on Gold Mini). Profits/losses are daily, you must monitor positions, and contracts expire every month requiring rollover or exit. Tax: profits taxed as business income at your slab rate (28–30% for most). Gold ETF is for long-term investment. No leverage, no expiry, no monitoring required — hold for years. Tax: 12.5% LTCG after 12 months. SIP from ₹500/month. If you want to grow wealth in gold over 5–10 years, use Gold ETF. If you want to trade gold price movements actively, use MCX. Never confuse the two purposes.' },
    },
    {
      '@type': 'Question',
      name: 'Does the MCX gold price equal the physical gold market price in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold prices closely track spot gold rates in India but are not identical. MCX gold is the near-month futures price, which includes carrying costs (financing + storage). Physical gold market rates (bullion market) may differ by ₹100–500 per 10g from MCX near-month depending on demand/supply and delivery premium. Jewellers track both prices but use MCX as the primary reference for risk management.' },
    },
    {
      '@type': 'Question',
      name: 'Who should buy MCX gold and who should buy physical gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'Buy MCX gold if: you are an active trader with ₹75,000+ capital, you can monitor positions daily, you understand margin calls and MTM settlement, and your goal is to profit from gold price movements. Buy physical gold (or Gold ETF) if: you want to invest in gold for the long term, you cannot monitor positions daily, you want to give gold as a gift or for a wedding, you have less than ₹75,000 to invest, or you want a simple SIP. Most Indian families should use Gold ETF for investment, not MCX gold.' },
    },
  ],
}

export default function Page() {
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 8, marginTop: 24 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #E5E5DC', fontSize: 14, color: '#18180F', verticalAlign: 'top', lineHeight: 1.6 }
  const tdGold: React.CSSProperties = { ...td, background: '#FFF8EC', color: '#7A4400' }
  const tdPhys: React.CSSProperties = { ...td, background: '#F5FAF5', color: '#1E4D1E' }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Gold vs Physical Gold</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Gold vs Physical Gold — What is the Difference?
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          MCX gold is a futures contract, not real gold. Most traders never receive a single gram — here is what you actually own.
        </p>

        <div style={infoBox}>
          <strong>Key fact:</strong> When you buy MCX Gold Mini, you own a <strong>contract</strong> to buy 100g of gold at a fixed price on expiry day — not the gold itself. 99.9% of retail traders settle in cash. Physical delivery requires broker registration, NSDL vault account, and paying the full contract value (~₹9–15 lakh), not just margin.
        </div>

        <h2 style={h2}>MCX Gold vs Physical Gold — Full Comparison</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '25%' }}>Feature</th>
                <th style={{ ...th, background: '#FFF8EC', color: '#7A4400', width: '37%' }}>MCX Gold (Futures)</th>
                <th style={{ ...th, background: '#F5FAF5', color: '#1E4D1E', width: '37%' }}>Physical Gold</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'What you own', mcx: 'A futures contract (not gold)', phys: 'Actual gold metal, jewellery, or coin' },
                { feature: 'Minimum entry', mcx: '₹55,000–75,000 (Gold Mini margin)', phys: '₹500 (digital gold) or 1g coin (~₹9,200)' },
                { feature: 'Purpose', mcx: 'Trading / speculation / hedging', phys: 'Long-term investment, gift, jewellery' },
                { feature: 'Leverage', mcx: '~16× (you control ₹15L with ₹75K margin)', phys: 'None — you own what you paid for' },
                { feature: 'Expiry', mcx: 'Monthly — must exit or rollover', phys: 'None — hold indefinitely' },
                { feature: 'Daily monitoring', mcx: 'Required — MTM losses debited daily', phys: 'Not required' },
                { feature: 'Storage', mcx: 'No physical storage needed', phys: 'Locker / safe / bank vault' },
                { feature: 'Tax on profits', mcx: 'Business income — your income slab (28–30%)', phys: 'LTCG 12.5% after 24 months (jewellery/coins)' },
                { feature: 'SIP / small amounts', mcx: 'Not possible — lot-based', phys: 'Yes — Gold ETF SIP from ₹500' },
                { feature: 'Trading hours', mcx: '9 AM – 11:30 PM on MCX (weekdays)', phys: 'No market hours — hold and sell anytime' },
                { feature: 'Price difference', mcx: 'Near-month futures price', phys: 'Spot (immediate delivery) price' },
                { feature: 'Risk', mcx: 'Margin calls, forced exit, 16× amplified P&L', phys: 'Price risk only — cannot go below zero' },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontWeight: 500, background: i % 2 === 0 ? '#FAFAF7' : 'white' }}>{r.feature}</td>
                  <td style={{ ...tdGold, background: i % 2 === 0 ? '#FFF8F0' : '#FFF4E8' }}>{r.mcx}</td>
                  <td style={{ ...tdPhys, background: i % 2 === 0 ? '#F7FAF7' : '#F0F7F0' }}>{r.phys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>MCX Gold is Not &quot;Buying Gold&quot; — Understanding What You Own</h2>
        <p style={prose}>
          When a new trader hears &quot;MCX gold is at ₹92,000 per 10g,&quot; they naturally think: &quot;I can buy gold here.&quot; This is a misunderstanding that causes real financial harm.
        </p>
        <p style={prose}>
          MCX gold is a <strong>standardised futures contract</strong>. The contract says: &quot;I agree to buy/sell X grams of gold at ₹Y per 10g on expiry date Z.&quot; You are not buying gold — you are buying the <em>right</em> to buy gold at that price. In practice, almost no one exercises this right. Instead, before expiry, you sell your contract at the then-current price and book profit or loss.
        </p>
        <p style={prose}>
          The power (and the danger) is <strong>leverage</strong>. A Gold Mini contract controls 100g of gold worth ~₹9,20,000 at current prices, but you only deposit ₹60,000 margin. A 1% move in gold = ₹9,200 gain or loss — on a ₹60,000 deposit, that&apos;s 15% of your capital in one day.
        </p>

        <h2 style={h2}>Can You Take Physical Delivery of MCX Gold?</h2>
        <p style={prose}>
          Yes — but it is complex and not designed for retail traders. The process:
        </p>
        <ol style={{ paddingLeft: 24, marginBottom: 20 }}>
          {[
            'Hold your Gold Mini (100g) or Gold standard (1 kg) contract into the delivery period (last 5 days before expiry)',
            'Your broker must be delivery-registered and you must notify intent to take delivery',
            'Pay the full contract value in cash — not just margin. Gold Mini at ₹9,20,000 per 100g = ₹9.2 lakh full payment',
            'Gold is credited as Electronic Gold Receipt (EGR) to your NSDL demat account',
            'To convert to physical bars, go to an MCX-approved vault (locations: Mumbai, Ahmedabad, Delhi, Hyderabad)',
          ].map((step, i) => (
            <li key={i} style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 8 }}>
              <strong>Step {i + 1}:</strong> {step}
            </li>
          ))}
        </ol>
        <p style={prose}>
          For most retail traders, this is impractical. If you want physical gold, just buy it from a bank or jeweller. If you want to invest in gold prices, use Gold ETF (simpler, no expiry, better tax on long-term). MCX is for trading.
        </p>

        <h2 style={h2}>Minimum Investment — The Number That Surprises Most Beginners</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Gold Investment Type</th>
                <th style={{ ...th, textAlign: 'right' }}>Minimum Amount</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'Digital Gold (Google Pay, MMTC-PAMP)', min: '₹1', note: 'Stored in MMTC vault, can sell anytime, buy any amount' },
                { type: 'Gold ETF (SIP)', min: '₹500/month', note: 'Sensex-listed, tracks gold price, 12.5% LTCG after 12 months' },
                { type: 'Gold Coin (1g)', min: '~₹9,200', note: 'From banks or jewellers, has making charges' },
                { type: 'MCX Gold Guinea (8g)', min: '₹6,000–8,000 margin', note: 'Illiquid, very wide spread — not recommended' },
                { type: 'MCX Gold Mini (100g)', min: '₹55,000–75,000 margin', note: 'Most popular MCX gold contract for retail traders' },
                { type: 'MCX Gold Standard (1 kg)', min: '₹5,00,000–7,00,000 margin', note: 'For high-capital traders and institutions only' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: r.type.startsWith('MCX Gold Mini') ? 600 : 400, color: r.type.startsWith('MCX') ? '#C8720A' : '#18180F' }}>{r.type}</td>
                  <td style={{ ...td, textAlign: 'right', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>{r.min}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: '#8A8A7A', marginBottom: 28, lineHeight: 1.6 }}>
          There is no MCX contract for &quot;small amounts&quot; of gold. The cheapest MCX entry requires ~₹55,000–75,000 in margin. If your budget is below ₹50,000, Gold ETF is a better fit.
        </p>

        <h2 style={h2}>Who Should Use MCX Gold vs Physical Gold?</h2>

        <h3 style={h3}>Use MCX Gold if you are…</h3>
        <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
          {[
            'An active trader with ₹75,000+ capital dedicated to trading',
            'Able to monitor your position daily (MTM settlement happens every evening)',
            'Comfortable with margin calls — if gold moves 5% against you, broker can force-close your position',
            'A jeweller or importer who needs to hedge physical gold purchases (MCX is the professional tool for this)',
            'Looking to profit from short-term gold price moves driven by USD/INR, COMEX, or geopolitics',
          ].map((p, i) => <li key={i} style={{ fontSize: 15, color: '#2E6E3B', lineHeight: 1.8, marginBottom: 4 }}>{p}</li>)}
        </ul>

        <h3 style={h3}>Use Physical Gold / Gold ETF if you are…</h3>
        <ul style={{ paddingLeft: 24, marginBottom: 16 }}>
          {[
            'Investing for 5+ years (wedding, children\'s education, retirement)',
            'A salaried professional who cannot watch markets during the day',
            'Buying gold as a gift or for cultural/religious purposes',
            'Starting with less than ₹50,000 — ETF SIP from ₹500 is the right vehicle',
            'Someone who finds monthly rollovers stressful — ETFs have no expiry',
            'A long-term investor — Gold ETF pays 12.5% LTCG vs 28–30% on MCX futures profits',
          ].map((p, i) => <li key={i} style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 4 }}>{p}</li>)}
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
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much money do you need to start MCX trading?
          </Link>
          <Link href="/learn/comex-vs-mcx-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → COMEX vs MCX gold price formula
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity should I trade?
          </Link>
          <Link href="/commodities/gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX Gold live price
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: MCX gold futures trading involves substantial risk of loss and is not suitable for all investors. This is educational content only and does not constitute investment advice. Margin requirements change daily — verify with your broker before trading.
        </p>
      </div>
    </>
  )
}

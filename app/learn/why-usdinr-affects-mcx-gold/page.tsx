import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

interface Prices { gold: number; usdinr: number; comexGold: number }

function loadPrices(): Prices {
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_GOLD?.price) {
      const comex = i.COMEX_GOLD?.price ?? 3200
      const gold  = i.MCX_GOLD.price
      const usdinr = i.USDINR?.price ?? 85.0
      return { gold, usdinr: parseFloat(usdinr.toFixed(2)), comexGold: comex }
    }
  } catch { /* fall through */ }
  return { gold: 152000, usdinr: 85.0, comexGold: 3200 }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

export const metadata = {
  title: 'Why USD/INR Affects MCX Gold Price: The Complete Explainer 2026',
  description: 'Understand exactly how the rupee-dollar rate moves MCX gold price in India. The import parity formula, worked examples with live prices, and how to use USD/INR as a trading signal. India\'s most detailed MCX gold-rupee guide.',
  keywords: [
    'why USD/INR affects MCX gold',
    'rupee dollar MCX gold price India',
    'how rupee affects MCX gold price',
    'MCX gold import parity formula',
    'USDINR MCX gold correlation India',
    'rupee depreciation MCX gold',
    'rupee fall MCX gold impact India',
    'MCX gold price formula calculation',
    'COMEX gold to MCX gold conversion India',
    'why MCX gold different from international price',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/why-usdinr-affects-mcx-gold' },
  openGraph: {
    title: 'Why USD/INR Moves MCX Gold Price — Complete Explainer | BhaavBrief',
    description: 'The import parity formula, worked examples, and how to use rupee-dollar as a gold trading signal. India-specific MCX gold-USDINR guide.',
    url: 'https://bhaavbrief.in/learn/why-usdinr-affects-mcx-gold',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=USD%2FINR+and+MCX+Gold&tags=Rupee,COMEX,Import+Parity', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'Why USD/INR Moves MCX Gold | BhaavBrief', description: 'The formula that connects COMEX gold, rupee-dollar, and MCX gold price — with live examples.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'Why USD/INR Affects MCX Gold' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Why does the rupee-dollar rate affect MCX gold price in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is priced in Indian rupees, but gold is a globally traded commodity priced in US dollars on COMEX (New York). Since India imports almost all its gold, the price Indian traders pay — and the MCX futures price — is essentially the COMEX dollar price converted into rupees, plus import duty and taxes. When the rupee falls against the dollar (more rupees needed to buy one dollar), MCX gold rises in rupee terms even if international gold (COMEX) is completely flat. A 1% rupee depreciation adds approximately ₹1,000–₹1,500/10g to MCX gold.' },
    },
    {
      '@type': 'Question',
      name: 'What is the MCX gold import parity formula?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold theoretical price = (COMEX gold price in $/oz ÷ 31.1035 troy oz per kg) × 10 × USD/INR rate × import duty factor. Post-July 2024 budget duty factor is 1.12 (6% BCD + 3% AIDC + 3% GST). At reference levels of $3,200/oz COMEX and ₹85/USD: ($3,200 ÷ 31.1035) × 10 × ₹85 × 1.12 ≈ ₹98,000/10g as import parity. If MCX is trading above this level, it indicates domestic demand premium. Below this level indicates arbitrage opportunity or rupee is strengthening faster than international prices.' },
    },
    {
      '@type': 'Question',
      name: 'How much does MCX gold move per 1% rupee depreciation?',
      acceptedAnswer: { '@type': 'Answer', text: 'A 1% depreciation in the Indian rupee (e.g., USD/INR moves from ₹84 to ₹84.84) adds approximately ₹1,000–₹1,500 to MCX gold per 10 grams, assuming COMEX gold prices are unchanged. At a Gold Mini lot (100g), this is ₹10,000–₹15,000 per lot P&L impact purely from the currency move. This is why MCX gold can rise sharply even on days when COMEX gold is flat — if the rupee is under pressure from RBI policy, capital outflows, or dollar strength.' },
    },
    {
      '@type': 'Question',
      name: 'How do I use USD/INR as a trading signal for MCX gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'Watch USD/INR spot on NSE currency market (9 AM–5 PM IST) as an early signal for MCX gold movement. If rupee weakens sharply (USD/INR rises) before 9 AM MCX open, MCX gold is likely to open higher. If COMEX gold is rising AND rupee is weakening simultaneously, MCX gold rise is amplified. The opposite also holds: if COMEX gold is rising but rupee is strengthening, the two forces offset and MCX gold may barely move despite an international gold rally.' },
    },
    {
      '@type': 'Question',
      name: 'Does USD/INR affect MCX silver and crude oil the same way?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, all MCX commodities that are imported are affected by USD/INR. Silver (almost entirely imported) has the same rupee linkage as gold. Crude oil is priced in dollars globally and India imports ~85% of its crude, so MCX crude also has a direct rupee impact. Copper, zinc, aluminium, lead, and nickel are all LME-priced in dollars and are partially imported — they also react to rupee moves. The formula is the same: a weakening rupee lifts all these MCX prices in rupee terms.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  // Live worked example
  const basePrice = Math.round((p.comexGold / 31.1035) * 10 * p.usdinr * 1.12)
  const rupeeDown1 = Math.round((p.comexGold / 31.1035) * 10 * (p.usdinr * 1.01) * 1.12)
  const rupeeUp1   = Math.round((p.comexGold / 31.1035) * 10 * (p.usdinr * 0.99) * 1.12)
  const comexUp1   = Math.round(((p.comexGold * 1.01) / 31.1035) * 10 * p.usdinr * 1.12)
  const bothDown   = Math.round(((p.comexGold * 0.99) / 31.1035) * 10 * (p.usdinr * 1.01) * 1.12)

  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 8, marginTop: 24 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #E5E5DC', fontSize: 14, color: '#18180F', verticalAlign: 'top', lineHeight: 1.6 }
  const up: React.CSSProperties = { color: '#16A34A', fontWeight: 600 }
  const down: React.CSSProperties = { color: '#DC2626', fontWeight: 600 }
  const mono: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }

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
          <span style={{ color: '#18180F' }}>Why USD/INR Affects MCX Gold</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          Why the Rupee-Dollar Rate Moves MCX Gold Price
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          The complete explainer: the import parity formula, live worked examples, and how to use USD/INR as a trading signal.
        </p>

        <div style={infoBox}>
          <strong>The core insight:</strong> MCX gold is priced in rupees, but gold is a dollar asset. Every time the rupee falls 1% against the dollar, MCX gold rises by approximately <strong>₹1,000–₹1,500 per 10g</strong> — even if international gold (COMEX) hasn&apos;t moved at all. Most retail MCX traders track only COMEX and miss this invisible hand entirely.
        </div>

        <h2 style={h2}>The Import Parity Formula</h2>
        <p style={prose}>
          India imports almost all its gold — over 700–800 tonnes per year. The price at which gold arrives in India determines the MCX price. This is called the <strong>import parity price</strong>, and it depends on three things:
        </p>
        <ol style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 20 }}>
          <li><strong>COMEX gold price</strong> (international benchmark, in $/troy ounce)</li>
          <li><strong>USD/INR exchange rate</strong> (how many rupees per dollar)</li>
          <li><strong>Indian import duty + GST</strong> (currently 6% BCD + 3% AIDC + 3% GST, effective ~12%, post-July 2024 budget)</li>
        </ol>
        <div style={{ background: '#18180F', color: '#F0EFE6', padding: '20px 24px', borderRadius: 6, marginBottom: 24, fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 2 }}>
          <div style={{ color: '#C8720A', fontWeight: 700, marginBottom: 8, fontSize: 12, letterSpacing: 1 }}>FORMULA</div>
          <div>MCX Gold (₹/10g) =</div>
          <div style={{ marginLeft: 24 }}>(COMEX $/oz ÷ 31.1035) × 10 × USD/INR × (1 + duty factor)</div>
          <div style={{ marginTop: 12, color: '#8A8A7A', fontSize: 13 }}>Where: 31.1035 = troy ounces per kg | duty factor ≈ 1.12 (6% BCD + 3% AIDC + 3% GST, post-July 2024 budget)</div>
        </div>

        <h2 style={h2}>Live Example (Today&apos;s Prices)</h2>
        <p style={prose}>
          Using COMEX gold at <strong style={mono}>${fmt(p.comexGold)}/oz</strong> and USD/INR at <strong style={mono}>₹{fmt(p.usdinr, 2)}</strong>:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Scenario</th>
                <th style={{ ...th, textAlign: 'right' }}>COMEX $/oz</th>
                <th style={{ ...th, textAlign: 'right' }}>USD/INR</th>
                <th style={{ ...th, textAlign: 'right' }}>MCX Gold ₹/10g</th>
                <th style={{ ...th, textAlign: 'right' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}><strong>Current</strong></td>
                <td style={{ ...td, ...mono, textAlign: 'right' }}>${fmt(p.comexGold)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right' }}>₹{fmt(p.usdinr, 2)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', fontWeight: 600 }}>₹{fmt(basePrice)}</td>
                <td style={{ ...td, textAlign: 'right' }}>—</td>
              </tr>
              <tr style={{ background: '#FAFAF7' }}>
                <td style={td}>Rupee weakens 1% (COMEX flat)</td>
                <td style={{ ...td, ...mono, textAlign: 'right' }}>${fmt(p.comexGold)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', color: '#DC2626' }}>₹{fmt(p.usdinr * 1.01, 2)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', fontWeight: 600 }}>₹{fmt(rupeeDown1)}</td>
                <td style={{ ...td, textAlign: 'right' }}><span style={up}>+₹{fmt(rupeeDown1 - basePrice)}</span></td>
              </tr>
              <tr>
                <td style={td}>Rupee strengthens 1% (COMEX flat)</td>
                <td style={{ ...td, ...mono, textAlign: 'right' }}>${fmt(p.comexGold)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', color: '#16A34A' }}>₹{fmt(p.usdinr * 0.99, 2)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', fontWeight: 600 }}>₹{fmt(rupeeUp1)}</td>
                <td style={{ ...td, textAlign: 'right' }}><span style={down}>−₹{fmt(basePrice - rupeeUp1)}</span></td>
              </tr>
              <tr style={{ background: '#FAFAF7' }}>
                <td style={td}>COMEX up 1% (rupee flat)</td>
                <td style={{ ...td, ...mono, textAlign: 'right', color: '#16A34A' }}>${fmt(p.comexGold * 1.01)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right' }}>₹{fmt(p.usdinr, 2)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', fontWeight: 600 }}>₹{fmt(comexUp1)}</td>
                <td style={{ ...td, textAlign: 'right' }}><span style={up}>+₹{fmt(comexUp1 - basePrice)}</span></td>
              </tr>
              <tr>
                <td style={td}>COMEX down 1% + Rupee weakens 1%</td>
                <td style={{ ...td, ...mono, textAlign: 'right', color: '#DC2626' }}>${fmt(p.comexGold * 0.99)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', color: '#DC2626' }}>₹{fmt(p.usdinr * 1.01, 2)}</td>
                <td style={{ ...td, ...mono, textAlign: 'right', fontWeight: 600 }}>₹{fmt(bothDown)}</td>
                <td style={{ ...td, textAlign: 'right', color: '#8A8A7A' }}>
                  {bothDown > basePrice ? <span style={up}>+₹{fmt(bothDown - basePrice)}</span> : <span style={down}>−₹{fmt(basePrice - bothDown)}</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 28 }}>
          Prices computed from today&apos;s MCX snapshot. The last row shows how rupee depreciation can partially offset a COMEX fall — MCX gold may barely move even when COMEX is down.
        </p>

        <h2 style={h2}>What Moves USD/INR (and Therefore MCX Gold)</h2>

        <h3 style={h3}>1. RBI Policy &amp; Intervention</h3>
        <p style={prose}>
          The Reserve Bank of India actively manages the rupee. When RBI raises interest rates (hawkish), the rupee strengthens (gold bearish in rupee terms). When RBI cuts rates or signals dovishness, the rupee can weaken. RBI also directly intervenes — selling dollars to prevent rupee depreciation — which suppresses MCX gold from rising as much as it otherwise would.
        </p>

        <h3 style={h3}>2. US Federal Reserve Policy</h3>
        <p style={prose}>
          When the US Fed raises rates, the dollar strengthens globally — rupee weakens against it. This is doubly negative for gold in dollar terms (high rates = lower gold) but has a partial offsetting effect in rupee terms (weaker rupee = higher MCX gold). The net effect depends on which force dominates: if dollar strength is driven by rate hikes, COMEX gold may fall enough to outweigh the rupee impact.
        </p>

        <h3 style={h3}>3. Foreign Portfolio Investor (FPI) Flows</h3>
        <p style={prose}>
          When FPIs sell Indian equities and bonds and repatriate dollars, they put selling pressure on the rupee — weakening it and lifting MCX gold. This is why MCX gold sometimes rallies during Indian stock market selloffs: both are driven by FPI outflows creating rupee weakness.
        </p>

        <h3 style={h3}>4. Oil Prices</h3>
        <p style={prose}>
          India imports ~85% of its crude oil, paying in dollars. When crude oil is expensive, India&apos;s dollar demand rises — the rupee weakens. Higher crude oil = weaker rupee = higher MCX gold. This creates a positive correlation between MCX crude and MCX gold in the short term, even though they are fundamentally unrelated commodities.
        </p>

        <h3 style={h3}>5. Import Duty Changes</h3>
        <p style={prose}>
          The Indian government occasionally changes gold import duty in the Union Budget or through notifications. A 1% reduction in duty instantly drops MCX gold by ~₹1,000–1,200/10g, regardless of COMEX or rupee levels. A duty increase has the opposite effect. This is a pure India-specific risk that international gold traders do not face.
        </p>

        <h2 style={h2}>How to Use USD/INR as a Trading Signal</h2>
        <div style={infoBox}>
          <strong>The Signal:</strong> Before MCX opens at 9 AM IST, check USD/INR spot on NSE currency market (opens 9 AM). If rupee is trading significantly weaker than yesterday&apos;s close, MCX gold is likely to open higher — even before COMEX shows any move.
        </div>
        <p style={prose}>
          More specifically, look for the <strong>divergence</strong>:
        </p>
        <ul style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 20 }}>
          <li><strong>COMEX flat + Rupee falling:</strong> MCX gold rises — pure currency effect. This is a soft signal; the move may reverse when COMEX becomes active in the evening.</li>
          <li><strong>COMEX rising + Rupee falling:</strong> Double-positive for MCX gold. Strong signal.</li>
          <li><strong>COMEX rising + Rupee strengthening:</strong> Mixed signal. MCX gold may rise less than COMEX implies. Check the magnitude of each move to estimate net impact.</li>
          <li><strong>COMEX falling + Rupee weakening:</strong> Can result in MCX gold being nearly flat — the two forces partially cancel. This confuses traders who expected MCX to fall with COMEX.</li>
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
          <Link href="/commodities/gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Live MCX gold analysis
          </Link>
          <Link href="/learn/mcx-gold-contracts" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX gold contracts guide
          </Link>
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator
          </Link>
          <Link href="/learn/comex-vs-mcx-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → COMEX vs MCX gold price formula
          </Link>
          <Link href="/learn/mcx-gold-vs-physical-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX gold vs physical gold
          </Link>
          <Link href="/briefs" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Daily 9:30 AM MCX brief
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Import parity calculations are illustrative. Actual MCX prices depend on liquidity, demand-supply dynamics, and exchange settlement rules. This is educational content only — not investment advice. Commodity trading involves substantial risk.
        </p>
      </div>
    </>
  )
}

import Link from 'next/link'

export const metadata = {
  title: 'COMEX vs MCX Gold Price — Why They Differ & How to Convert (2026)',
  description: 'Why is MCX gold price different from COMEX gold? Complete explanation of the import parity formula, duty structure, USD/INR impact, and how to convert COMEX $/oz to MCX ₹/10g. For Indian commodity traders.',
  keywords: [
    'COMEX vs MCX gold price',
    'why MCX gold price different from COMEX',
    'COMEX to MCX gold conversion formula',
    'MCX gold import parity',
    'MCX gold price calculation',
    'COMEX gold to INR conversion',
    'MCX gold duty structure',
    'COMEX gold vs Indian gold price',
    'MCX gold price formula 2026',
    'why Indian gold price higher than international',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/comex-vs-mcx-gold' },
  openGraph: {
    title: 'COMEX vs MCX Gold Price: Import Parity Formula Explained | BhaavBrief',
    description: 'Why MCX gold trades at a premium to COMEX, how duties and USD/INR determine the spread, and the exact formula to convert international to Indian gold prices.',
    url: 'https://bhaavbrief.in/learn/comex-vs-mcx-gold',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=COMEX+vs+MCX+Gold+Price&tags=Import+Parity,Gold,USD+INR,Duties', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'COMEX vs MCX Gold: Why They Differ | BhaavBrief', description: 'Import parity formula, duty structure, and why MCX gold trades at a premium to COMEX. Complete guide for Indian traders.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'COMEX vs MCX Gold Price' },
  ],
}

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  'name': 'How to convert COMEX gold price to MCX gold price',
  'description': 'Step-by-step formula to calculate what MCX gold should trade at based on the international COMEX gold price.',
  'step': [
    { '@type': 'HowToStep', position: 1, name: 'Get COMEX gold price in $/oz', text: 'Find the current COMEX gold spot or front-month futures price in USD per troy ounce (e.g. $3,300/oz).' },
    { '@type': 'HowToStep', position: 2, name: 'Convert $/oz to $/gram', text: 'Divide by 31.1035 (troy ounces per kg) to get $/gram, then multiply by 10 to get $/10g. Example: $3,300 ÷ 31.1035 × 10 = $1,061/10g.' },
    { '@type': 'HowToStep', position: 3, name: 'Apply USD/INR exchange rate', text: 'Multiply by the current USD/INR rate. Example: $1,061 × 84.5 = ₹89,664/10g (base import value).' },
    { '@type': 'HowToStep', position: 4, name: 'Add import duties', text: 'Add 6% Basic Customs Duty (BCD) + 3% Agriculture Infrastructure Development Cess (AIDC) + 3% GST on the landed cost. Total duty effect ≈ 12–13% on the base import value.' },
    { '@type': 'HowToStep', position: 5, name: 'Add market premium', text: 'Add ₹200–600/10g for the physical market premium (varies by demand season). This is the MCX import parity price.' },
    { '@type': 'HowToStep', position: 6, name: 'Compare to MCX spot', text: 'The result is the theoretical MCX fair value. MCX trades within ±₹200–400 of this level normally. Large divergences signal arbitrage opportunity or data error.' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Why is MCX gold price higher than COMEX gold price?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is priced in Indian rupees per 10 grams, while COMEX gold is priced in US dollars per troy ounce. The MCX price is higher for three reasons: (1) Currency conversion — multiplying the dollar price by USD/INR (~84–95) gives the rupee value; (2) Import duties — India charges 6% Basic Customs Duty + 3% AIDC + 3% GST, adding roughly 12–13% to the landed cost; (3) Physical market premium — domestic demand (weddings, festivals, RBI buying) adds ₹200–600/10g above import parity. The sum of these factors means MCX gold typically trades at a 12–16% premium to the raw COMEX price converted to INR.' },
    },
    {
      '@type': 'Question',
      name: 'What is the MCX gold import parity formula?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Import Parity = [COMEX ($/oz) ÷ 31.1035 × 10 × USD/INR] × (1 + 0.06 BCD + 0.03 AIDC) × (1 + 0.03 GST) + ₹200–600 premium. Example at COMEX $3,300/oz and USD/INR 84.5: Step 1: $3,300 ÷ 31.1035 × 10 = $1,061/10g. Step 2: $1,061 × 84.5 = ₹89,664. Step 3: × 1.09 (BCD+AIDC) = ₹97,734. Step 4: × 1.03 (GST) = ₹100,666. Step 5: + ₹400 premium = ₹1,01,066/10g MCX fair value.' },
    },
    {
      '@type': 'Question',
      name: 'Why does MCX gold sometimes diverge from COMEX even after adjusting for duties and exchange rate?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold can trade above or below import parity for several reasons: (1) Festival/wedding season demand pushes the physical premium up to ₹800–1,200/10g above parity; (2) Import restrictions or duty changes cause temporary dislocations; (3) Gold ETF demand (domestic) adds buying pressure independent of international prices; (4) Rupee volatility — a rapid USD/INR move is priced into MCX before it fully shows in COMEX; (5) Global arbitrage tightens the spread again over days or weeks. A sustained MCX premium above ₹600/10g over import parity often signals strong domestic demand.' },
    },
    {
      '@type': 'Question',
      name: 'How does a change in USD/INR affect MCX gold price?',
      acceptedAnswer: { '@type': 'Answer', text: 'Every ₹1 move in USD/INR changes MCX gold by approximately ₹1,000–1,300 per 10 grams (depending on the COMEX level). At COMEX $3,300/oz: a rupee depreciating from 84 to 85 (₹1 weaker) would push MCX gold up by about ₹1,060/10g — purely from the currency effect, even if COMEX stays flat. This is why Indian gold traders watch USD/INR as closely as they watch COMEX. When COMEX falls but INR weakens simultaneously, MCX gold can stay flat or even rise.' },
    },
    {
      '@type': 'Question',
      name: 'What happened to MCX gold when India cut import duty in 2024?',
      acceptedAnswer: { '@type': 'Answer', text: 'In the Union Budget 2024 (July 2024), India cut the Basic Customs Duty (BCD) on gold from 15% to 6%. This was the single largest duty cut in decades. MCX gold fell ₹5,000–6,000/10g on the budget day as import parity repriced lower. The duty cut also narrowed the MCX-COMEX spread significantly — the old 15% BCD had kept MCX at a much larger premium to COMEX. This event illustrates how domestic policy (not just COMEX or INR) can independently move MCX gold prices.' },
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
          <span style={{ color: '#18180F' }}>COMEX vs MCX Gold</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          COMEX vs MCX Gold Price: Why They Differ & How to Convert
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 20, lineHeight: 1.6 }}>
          The import parity formula, duty structure, and the role of USD/INR — explained for Indian commodity traders.
        </p>

        <p style={{ fontSize: 14, color: '#48483A', marginBottom: 28, padding: '12px 16px', background: '#F8F7F2', borderRadius: 4, lineHeight: 1.7 }}>
          <strong>New to COMEX?</strong> COMEX (Commodity Exchange, New York) is the world exchange where gold&apos;s global price is set in US dollars — MCX in India derives its price from it.{' '}
          <Link href="/learn/what-is-comex" style={{ color: '#C8720A', textDecoration: 'none', fontWeight: 500 }}>
            Read: What is COMEX? →
          </Link>
        </p>

        <div style={infoBox}>
          <strong>The short answer:</strong> MCX gold trades at a premium to COMEX because of <strong>currency conversion (USD/INR)</strong>, <strong>import duties (~12%)</strong>, and a <strong>domestic physical premium</strong>. At COMEX $3,300/oz and USD/INR 84.5, MCX gold&apos;s theoretical fair value is approximately <strong>₹1,00,000–1,02,000 per 10g</strong>.
        </div>

        <h2 style={h2}>The Import Parity Formula — Step by Step</h2>
        <p style={prose}>
          MCX gold is not independently priced. It is derived from the international COMEX price through a precise chain of conversions. Understanding this chain is the most important insight for any Indian gold trader.
        </p>

        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Step</th>
                <th style={th}>Calculation</th>
                <th style={th}>Example (COMEX $3,300/oz, USD/INR 84.5)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { step: '1. COMEX to $/10g', calc: 'COMEX ($/oz) ÷ 31.1035 × 10', example: '$3,300 ÷ 31.1035 × 10 = $1,061.0/10g' },
                { step: '2. Convert to INR', calc: '$/10g × USD/INR rate', example: '$1,061 × 84.5 = ₹89,655/10g' },
                { step: '3. Add BCD (6%)', calc: '× 1.06', example: '₹89,655 × 1.06 = ₹95,034' },
                { step: '4. Add AIDC (3%)', calc: '× 1.03 (on BCD-inclusive value)', example: '₹95,034 × 1.03 = ₹97,885' },
                { step: '5. Add GST (3%)', calc: '× 1.03', example: '₹97,885 × 1.03 = ₹1,00,822' },
                { step: '6. Add market premium', calc: '+ ₹200–600/10g (seasonal)', example: '₹1,00,822 + ₹400 = ₹1,01,222 MCX fair value' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.step}</td>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.calc}</td>
                  <td style={{ ...td, color: '#48483A' }}>{r.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 style={h2}>The Three Components of the MCX–COMEX Spread</h2>

        <h3 style={h3}>1. Currency: USD/INR Is the Largest Driver</h3>
        <p style={prose}>
          Every ₹1 move in USD/INR shifts MCX gold by approximately <strong>₹1,000–1,300 per 10 grams</strong>. This means a weakening rupee independently pushes MCX gold higher, even if COMEX is flat or falling. This is why on days when the rupee depreciates sharply (risk-off, global dollar strength), MCX gold can rise while COMEX gold falls — they are momentarily moving in opposite directions.
        </p>
        <p style={prose}>
          For traders: if COMEX gold is falling but USD/INR is rising, your MCX gold position may still be profitable. Always track USD/INR alongside COMEX when trading MCX gold.
        </p>

        <h3 style={h3}>2. Import Duties: The Structural Premium</h3>
        <p style={prose}>
          India imposes layered duties on gold imports that create a structural premium in MCX prices vs the raw COMEX-to-INR conversion:
        </p>
        <ul style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 24 }}>
          <li><strong>Basic Customs Duty (BCD): 6%</strong> — reduced from 15% in Union Budget 2024 (July 2024)</li>
          <li><strong>Agriculture Infrastructure Development Cess (AIDC): 3%</strong> — on the BCD-inclusive value</li>
          <li><strong>GST: 3%</strong> — on the total landed cost</li>
          <li><strong>Total duty effect: ~12–13%</strong> above the raw import value</li>
        </ul>
        <div style={infoBox}>
          When India cut BCD from 15% to 6% in July 2024, MCX gold fell ₹5,000–6,000/10g in a single session. Duty policy is a direct, immediate lever on MCX gold prices that has no analog in COMEX trading.
        </div>

        <h3 style={h3}>3. Physical Market Premium: Seasonal and Demand-Driven</h3>
        <p style={prose}>
          Beyond the formula, MCX gold carries a <strong>domestic physical market premium</strong> that reflects actual supply-demand in India. This premium typically ranges from ₹200 to ₹600/10g but spikes to ₹800–1,500/10g during peak demand periods:
        </p>
        <ul style={{ fontSize: 15, color: '#48483A', lineHeight: 2, paddingLeft: 24, marginBottom: 24 }}>
          <li><strong>Dhanteras (Oct–Nov):</strong> Premium spikes ₹800–1,200 as jewellers scramble for physical stock</li>
          <li><strong>Akha Teej (Apr–May):</strong> Second-largest demand spike, ₹500–800 premium</li>
          <li><strong>Wedding season (Nov–Dec, Feb–Apr):</strong> Sustained elevated premium</li>
          <li><strong>July–September (monsoon/off-season):</strong> Premium can fall to ₹100–200/10g</li>
        </ul>

        <h2 style={h2}>When MCX Diverges from Parity</h2>
        <p style={prose}>
          MCX gold normally trades within ₹200–400 of the calculated import parity. Large divergences — MCX trading ₹800+ above or below parity — signal something unusual:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Divergence</th>
                <th style={th}>What It Signals</th>
              </tr>
            </thead>
            <tbody>
              {[
                { div: 'MCX 800–1500 above parity', signal: 'Strong domestic demand (festival, RBI buying), limited import supply' },
                { div: 'MCX 400–800 below parity', signal: 'Excess domestic supply, weak demand, or recent duty reduction not fully priced' },
                { div: 'MCX and COMEX moving in opposite directions', signal: 'USD/INR move is dominating; not a true COMEX divergence' },
                { div: 'Spread suddenly widens overnight', signal: 'Duty change announced, import quota change, or RBI gold buying/selling' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontFamily: 'var(--font-mono)', fontSize: 13, color: '#C8720A' }}>{r.div}</td>
                  <td style={td}>{r.signal}</td>
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
          <Link href="/learn/why-usdinr-affects-mcx-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Why USD/INR affects MCX gold
          </Link>
          <Link href="/learn/mcx-gold-contracts" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX gold contracts — lot sizes & specs
          </Link>
          <Link href="/learn/mcx-gold-vs-physical-gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX gold vs physical gold
          </Link>
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much capital to start MCX gold trading?
          </Link>
          <Link href="/commodities/gold" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Live MCX gold price & analysis
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Import parity calculations use approximate duty rates and representative market premiums. Actual MCX prices depend on real-time COMEX, USD/INR, and domestic market conditions. Duty rates are subject to change by government policy. This is not investment advice.
        </p>
      </div>
    </>
  )
}

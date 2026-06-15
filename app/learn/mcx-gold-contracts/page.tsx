import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'

interface Prices {
  gold: number
  snapshotDate: string
}

function loadPrices(): Prices {
  const cwd = process.cwd()
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(cwd, 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_GOLD?.price) {
      return {
        gold:         i.MCX_GOLD.price,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, 'data/mcx-last-prices.json'), 'utf8'))
    if (raw?.gold) {
      const d = new Date(raw.ts ?? Date.now())
      return {
        gold: raw.gold,
        snapshotDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  return { gold: 149000, snapshotDate: 'Jun 2026' }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtValue(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} crore`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} lakh`
  return `₹${fmt(Math.round(v))}`
}

function marginRange(cv: number, lo = 0.05, hi = 0.085): string {
  const low  = Math.round(cv * lo / 1000) * 1000
  const high = Math.round(cv * hi / 1000) * 1000
  return `${fmtValue(low)} – ${fmtValue(high)}`
}

export const metadata = {
  title: 'MCX Gold Contracts 2026: Standard, Mini, Guinea & Petal Guide',
  description: 'Complete guide to all four MCX gold contracts in 2026 — Gold Standard (1 kg), Gold Mini (100g), Gold Guinea (8g), Gold Petal (1g). Lot sizes, live contract values, margin, expiry dates, and which contract to trade.',
  keywords: [
    'MCX gold mini lot size 2026',
    'MCX gold standard mini guinea petal',
    'MCX gold guinea contract India',
    'MCX gold petal contract',
    'MCX gold 100 gram contract',
    'gold mini vs gold standard MCX',
    'MCX gold expiry date 2026',
    'MCX gold physical delivery India',
    'MCX gold mini margin requirement',
    'MCX gold contracts explained India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-gold-contracts' },
  openGraph: {
    title: 'MCX Gold Contracts 2026 — Standard, Mini, Guinea & Petal | BhaavBrief',
    description: 'All four MCX gold contracts explained: lot sizes, live contract values, margin requirements, expiry dates, and which contract suits your capital.',
    url: 'https://bhaavbrief.in/learn/mcx-gold-contracts',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Gold+Contracts+2026&tags=Gold+Mini,Gold+Guinea,Gold+Petal', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Gold Contracts 2026 — Standard, Mini, Guinea, Petal | BhaavBrief', description: 'Every MCX gold contract explained with live contract values and margin requirements.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Gold+Contracts+2026&tags=Gold+Mini,Gold+Guinea,Gold+Petal'] },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Gold Contracts' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MCX Gold Mini lot size?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Mini lot size is 100 grams (0.1 kg), quoted in ₹ per 10 grams. It is one-tenth the size of the standard Gold contract (1 kg). At mid-2026 prices (~₹1,49,000/10g), one Gold Mini lot has a contract value of approximately ₹14.9 lakh, requiring a total margin of ₹75,000–₹1.27 lakh. Gold Mini is the most popular MCX gold contract for retail traders.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between MCX Gold Standard and Gold Mini?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Standard (1 kg) and Gold Mini (100g) track the same price and expire on the same date (5th of the contract month). The only difference is lot size: Standard = 1,000g (contract value ~₹1.49 crore, margin ~₹7.5–12.7 lakh); Mini = 100g (contract value ~₹14.9 lakh, margin ~₹75,000–₹1.27 lakh). For retail traders, Gold Mini is far more accessible. Gold Standard suits institutions and traders managing large gold inventories.' },
    },
    {
      '@type': 'Question',
      name: 'What is MCX Gold Guinea contract?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Guinea is a 8-gram gold futures contract, quoted in ₹ per 8 grams. It is designed for very small capital participants and jewellers hedging small customer orders. At current prices, one Gold Guinea lot has a contract value around ₹1.19 lakh and requires approximately ₹6,000–₹10,000 in margin. Unlike Gold Standard and Mini (which expire on the 5th of the month), Gold Guinea expires on the last day of the contract month.' },
    },
    {
      '@type': 'Question',
      name: 'What is MCX Gold Petal?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Petal is a 1-gram gold futures contract — the smallest MCX gold contract available. Quoted in ₹ per gram, one Petal lot at current prices has a contract value of approximately ₹14,900 and requires only ₹750–₹1,300 in margin. It is used almost exclusively by very small jewellers for micro-hedging specific customer orders. Its absolute P&L is tiny (₹0.10 per tick), making it impractical for active trading.' },
    },
    {
      '@type': 'Question',
      name: 'When does MCX Gold expire?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Standard and Gold Mini expire on the 5th day of the contract month (or the nearest preceding trading day if the 5th is a holiday). MCX Gold Guinea and Gold Petal expire on the last working day of the contract month. MCX typically lists three contract months simultaneously. The most liquid is always the nearest-expiry contract; the second month sees volume increase as the near month approaches expiry.' },
    },
    {
      '@type': 'Question',
      name: 'Is physical delivery available on MCX Gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes, physical delivery is available and compulsory if you hold an MCX Gold position to expiry without squaring off. Physical settlement is in 995 purity gold bars at MCX-accredited vaults in Ahmedabad, Mumbai, and Delhi. Most retail traders square off their positions 2–5 days before expiry to avoid the delivery process. Delivery requires additional KYC documentation with your broker and cannot be initiated at the last minute.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  const goldStd    = p.gold * 100
  const goldMini   = p.gold * 10
  const goldGuinea = p.gold * 0.8
  const goldPetal  = p.gold * 0.1

  const tickValueStd    = 100
  const tickValueMini   = 10
  const tickValueGuinea = 0.8
  const tickValuePetal  = 0.1

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 15, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-mono)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 36 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 10, marginTop: 28 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }

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
          <span style={{ color: '#18180F' }}>MCX Gold Contracts</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Gold Contracts 2026: Standard, Mini, Guinea &amp; Petal Guide
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          MCX Gold at <strong style={{ color: '#18180F' }}>₹{fmt(p.gold)}/10g</strong> · {p.snapshotDate} · Updated on every deploy
        </p>

        <p style={prose}>
          MCX offers four gold contracts — all tracking the same underlying price, differing only in lot size and who they suit. From the 1-gram Gold Petal to the 1-kg Gold Standard, each fills a different capital and use-case bracket. The table below compares all four at today&apos;s MCX Gold price of <strong>₹{fmt(p.gold)}/10g</strong>.
        </p>

        {/* Master comparison table */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L / tick', 'Contract Value*', 'Total Margin*', 'Best for'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Gold', bold: true,
                  size: '1 kg (1,000g)', quote: '₹/10g', tick: '₹1', tickVal: `₹${tickValueStd}/lot`,
                  cv: goldStd, bestFor: 'Institutions, large traders',
                },
                {
                  name: 'Gold Mini', bold: false,
                  size: '100 g', quote: '₹/10g', tick: '₹1', tickVal: `₹${tickValueMini}/lot`,
                  cv: goldMini, bestFor: 'Most retail traders ★',
                },
                {
                  name: 'Gold Guinea', bold: false,
                  size: '8 g', quote: '₹/8g', tick: '₹1', tickVal: `₹${tickValueGuinea}/lot`,
                  cv: goldGuinea, bestFor: 'Small capital, jewellers',
                },
                {
                  name: 'Gold Petal', bold: false,
                  size: '1 g', quote: '₹/g', tick: '₹1', tickVal: `₹${tickValuePetal}/lot`,
                  cv: goldPetal, bestFor: 'Micro hedging only',
                },
              ].map((c, i) => (
                <tr key={i}>
                  <td style={cell}>{c.bold ? <strong>{c.name}</strong> : c.name}</td>
                  <td style={cell}>{c.size}</td>
                  <td style={cell}>{c.quote}</td>
                  <td style={cell}>{c.tick}</td>
                  <td style={cell}>{c.tickVal}</td>
                  <td style={{ ...cell, ...accent }}>{fmtValue(c.cv)}</td>
                  <td style={cell}>{marginRange(c.cv)}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{c.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          * At {p.snapshotDate} MCX Gold price of ₹{fmt(p.gold)}/10g. Total margin indicative at 5–8.5% of contract value; actual set by MCX and your broker daily.
        </p>

        {/* Live callout */}
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Live — MCX Gold at ₹{fmt(p.gold)}/10g as of {p.snapshotDate}</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li>Gold Standard (1 kg) = <strong>{fmtValue(goldStd)}</strong> contract value · margin ≈ {marginRange(goldStd)}</li>
            <li>Gold Mini (100g) = <strong>{fmtValue(goldMini)}</strong> contract value · margin ≈ {marginRange(goldMini)}</li>
            <li>Gold Guinea (8g) = <strong>{fmtValue(goldGuinea)}</strong> contract value · margin ≈ {marginRange(goldGuinea)}</li>
            <li>Gold Petal (1g) = <strong>{fmtValue(goldPetal)}</strong> contract value · margin ≈ {marginRange(goldPetal)}</li>
          </ul>
        </div>

        {/* Individual contract sections */}
        <h2 style={h2}>MCX Gold Standard (1 kg)</h2>
        <p style={prose}>
          The Gold Standard is MCX&apos;s flagship contract and the benchmark for Indian gold price discovery. At ₹{fmt(p.gold)}/10g, one lot controls <strong>{fmtValue(goldStd)}</strong> of gold — equivalent to 1 kilogram of physical 995-purity gold. It accounts for the bulk of MCX gold&apos;s open interest and volume, driven by large traders, proprietary desks, and institutions.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Gold Standard — key numbers at ₹{fmt(p.gold)}/10g</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Contract value:</strong> {fmtValue(goldStd)}</li>
            <li><strong>Total margin:</strong> {marginRange(goldStd)}</li>
            <li><strong>P&amp;L per ₹1 move:</strong> ₹{tickValueStd} per lot (₹1/10g × 100 units)</li>
            <li><strong>P&amp;L per ₹1,000 move:</strong> ₹{fmt(tickValueStd * 1000)} per lot</li>
            <li><strong>Expiry:</strong> 5th of the contract month</li>
            <li><strong>Delivery:</strong> 995 purity, MCX-accredited vaults</li>
          </ul>
        </div>
        <p style={prose}>
          A ₹1,000/10g adverse move — not unusual in a single session when COMEX gold moves 0.7%+ — costs ₹{fmt(tickValueStd * 1000)} on a standard lot. Retail traders often underestimate how quickly losses compound at this size. Only use the Standard contract if you have at least 2× the minimum margin in available capital.
        </p>

        <h2 style={h2}>MCX Gold Mini (100g) — the retail standard</h2>
        <p style={prose}>
          Gold Mini is the most actively traded MCX gold contract by number of retail participants. Its 100-gram lot size means a contract value of <strong>{fmtValue(goldMini)}</strong> at current prices — one-tenth of the Standard, with proportionally lower margin and P&amp;L per move.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Gold Mini — key numbers at ₹{fmt(p.gold)}/10g</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Contract value:</strong> {fmtValue(goldMini)}</li>
            <li><strong>Total margin:</strong> {marginRange(goldMini)}</li>
            <li><strong>P&amp;L per ₹1 move:</strong> ₹{tickValueMini} per lot</li>
            <li><strong>P&amp;L per ₹1,000 move:</strong> ₹{fmt(tickValueMini * 1000)} per lot</li>
            <li><strong>Expiry:</strong> 5th of the contract month (same as Standard)</li>
            <li><strong>Liquidity:</strong> Very high — tighter spreads than Guinea/Petal</li>
          </ul>
        </div>
        <p style={prose}>
          Gold Mini and Gold Standard expire on the same date and track prices in lockstep. The only meaningful difference is size. A trader with ₹5 lakh in their commodity account can comfortably trade 3–4 Gold Mini lots while maintaining a 30% margin buffer — versus being limited to less than 1 Standard lot.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div style={{ background: '#F3F2EC', padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 15, lineHeight: 2, color: '#18180F', minWidth: 300 }}>
          Example: Buy 1 Gold Mini at ₹{fmt(p.gold)}/10g<br />
          Contract value = ₹{fmt(p.gold)} × 10 = <strong>{fmtValue(goldMini)}</strong><br />
          Margin (at ~7%) = <strong>₹{fmt(Math.round(goldMini * 0.07))}</strong><br />
          <br />
          Gold rises ₹2,000/10g → Profit = ₹2,000 × 10 = <strong>+₹20,000</strong><br />
          Gold falls ₹2,000/10g → Loss = ₹2,000 × 10 = <strong>−₹20,000</strong><br />
          (₹2,000 move = {((2000 / p.gold) * 100).toFixed(1)}% of current price)
        </div>
        </div>

        <h2 style={h2}>MCX Gold Guinea (8g)</h2>
        <p style={prose}>
          Gold Guinea is an 8-gram contract — a nod to the traditional gold coin denomination. At current prices, one lot controls <strong>{fmtValue(goldGuinea)}</strong> of gold and requires only approximately {marginRange(goldGuinea)} in total margin. It is primarily used by small jewellers hedging specific customer orders rather than by active traders.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Gold Guinea — key numbers at ₹{fmt(p.gold)}/10g</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Lot size:</strong> 8 grams (quoted in ₹ per 8g, not per 10g)</li>
            <li><strong>Contract value:</strong> {fmtValue(goldGuinea)}</li>
            <li><strong>Total margin:</strong> {marginRange(goldGuinea)}</li>
            <li><strong>P&amp;L per ₹1 move:</strong> ₹{tickValueGuinea} per lot</li>
            <li><strong>Expiry:</strong> <strong>Last working day of the month</strong> — different from Standard/Mini</li>
            <li><strong>Liquidity:</strong> Low — wider bid-ask spreads than Mini</li>
          </ul>
        </div>
        <p style={prose}>
          The Guinea&apos;s different expiry date (last day of month vs. 5th for Standard/Mini) is a critical operational detail. Traders who mix Standard and Guinea positions must track two separate expiry calendars. For this reason, Guinea is not recommended for active traders — its low liquidity also means wider spreads that eat into profits on every entry and exit.
        </p>

        <h2 style={h2}>MCX Gold Petal (1g)</h2>
        <p style={prose}>
          Gold Petal is MCX&apos;s micro contract — a single gram of gold. At ₹{fmt(p.gold)}/10g, the Petal&apos;s contract value is <strong>{fmtValue(goldPetal)}</strong> and margin is approximately {marginRange(goldPetal)}. Its P&amp;L is ₹{tickValuePetal} per tick — meaning even a ₹1,000/10g gold move earns or loses only ₹{fmt(tickValuePetal * 1000)}.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Gold Petal — use cases</div>
          <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            <strong>Jeweller micro-hedging:</strong> A jeweller with a 10g customer order can sell 10 Petal lots to hedge the exact quantity — without tying up capital in a full Mini lot (100g).
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            <strong>Not for trading:</strong> The Petal&apos;s absolute P&amp;L is too small for meaningful active trading. The bid-ask spread on the Petal is often ₹5–10/lot, which as a percentage of P&amp;L per move is disproportionately large. Use Gold Mini for trading; use Petal only when you need 1g precision hedging.
          </p>
        </div>

        {/* Expiry dates section */}
        <h2 style={h2}>MCX Gold expiry dates — what you need to know</h2>
        <p style={prose}>
          Expiry dates differ between the two groups of gold contracts. Missing these can result in forced delivery or missed rollovers.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Expiry rule', 'Typical example', 'What happens at expiry'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Gold Standard', '5th of month (or prior working day)', 'Aug contract: 5 Aug 2026', 'Physical delivery of 1 kg 995 purity gold, or auto square-off'],
                ['Gold Mini', '5th of month (or prior working day)', 'Aug contract: 5 Aug 2026', 'Physical delivery of 100g, or auto square-off'],
                ['Gold Guinea', 'Last working day of month', 'Jul contract: 31 Jul 2026', 'Physical delivery of 8g, or auto square-off'],
                ['Gold Petal', 'Last working day of month', 'Jul contract: 31 Jul 2026', 'Physical delivery of 1g, or auto square-off'],
              ].map(([contract, rule, example, happens], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{contract}</strong></td>
                  <td style={cell}>{rule}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{example}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{happens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          Most retail traders square off 3–5 days before expiry to avoid the delivery process and the widened spreads that appear as open interest unwinds. If you want to roll to the next month, do so 5–7 days before expiry when the next contract&apos;s liquidity is high enough for a clean entry.
        </p>

        {/* Which contract section */}
        <h2 style={h2}>Which MCX gold contract should you trade?</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Profile', 'Recommended contract', 'Why'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Capital under ₹2 lakh', 'Gold Mini (1 lot)', 'Margin ≈ ' + marginRange(goldMini) + '; good liquidity; same price as Standard'],
                ['Capital ₹2–10 lakh', 'Gold Mini (2–4 lots)', 'Scale with manageable margin; avoid overexposure'],
                ['Capital above ₹10 lakh', 'Gold Standard or Gold Mini', 'Standard reduces number of contracts to manage; Mini offers more granular sizing'],
                ['Jeweller hedging 100g+ orders', 'Gold Mini', 'Exact lot-size match; high liquidity for clean entry/exit'],
                ['Jeweller hedging sub-10g orders', 'Gold Guinea or Petal', 'Smaller lot sizes for precise exposure matching'],
                ['Beginners learning gold trading', 'Gold Mini (1 lot, paper first)', 'Start with simulator if your broker offers one; then 1 lot live with 2× margin buffer'],
              ].map(([profile, contract, why], i) => (
                <tr key={i}>
                  <td style={cell}>{profile}</td>
                  <td style={{ ...cell, color: '#C8720A', fontWeight: 500 }}>{contract}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Physical delivery */}
        <h2 style={h2}>Physical delivery on MCX Gold</h2>
        <p style={prose}>
          Physical delivery is available on all four gold contracts but is compulsory only if you hold an open position at expiry without squaring off. Here&apos;s how it works:
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Delivery process</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Intention to deliver:</strong> Both buyer and seller must file delivery intentions with MCX via their broker 2–3 days before expiry.</li>
            <li><strong>Delivery unit:</strong> 995 purity LBMA-approved gold bars in standard vault locations (Ahmedabad, Mumbai, Delhi).</li>
            <li><strong>Payment:</strong> Full contract value (not just margin) is required for physical settlement by the buyer.</li>
            <li><strong>Additional costs:</strong> Vault storage charges, assay fees, and GST on the physical gold value.</li>
            <li><strong>KYC requirement:</strong> Broker requires commodity-specific KYC for delivery — different from standard trading activation.</li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.75, color: '#48483A' }}>
            <strong>For retail traders:</strong> Almost no retail participant takes physical delivery. Square off your position at least 3 trading days before expiry — earlier if possible. If you accidentally hold to expiry, contact your broker immediately; penalties for non-delivery are significant.
          </p>
        </div>

        {/* MCX Gold vs NSE Gold quick note */}
        <h2 style={h2}>MCX Gold vs NSE Gold Futures — a quick note</h2>
        <p style={prose}>
          NSE launched gold futures in 2026, offering an alternative for traders with existing equity demat accounts. For now, <strong>MCX Gold is the more liquid choice for active trading</strong> — its decades-old market depth means tighter bid-ask spreads and easier large-lot execution. NSE Gold also trades only until 5 PM IST, missing the crucial evening session when US markets move. For most traders in 2026, MCX Gold remains the clear default.
        </p>

        {/* FAQ */}
        <h2 style={h2}>Frequently asked questions</h2>
        {FAQ_SCHEMA.mainEntity.map((faq, i) => (
          <div key={i} style={{ borderTop: '0.5px solid #DDDDD0', paddingTop: 20, paddingBottom: 8, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: '#18180F', margin: '0 0 8px' }}>{faq.name}</p>
            <p style={{ fontSize: 14, color: '#48483A', lineHeight: 1.75, margin: 0 }}>{faq.acceptedAnswer.text}</p>
          </div>
        ))}

        {/* Cross-links */}
        <div style={{ borderTop: '0.5px solid #DDDDD0', marginTop: 40, paddingTop: 28 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: 16 }}>Continue reading</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>
              ← Learn hub
            </Link>
            <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              All MCX lot sizes →
            </Link>
            <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX margin calculation →
            </Link>
            <Link href="/commodities/gold" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              Gold live price &amp; analysis →
            </Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-gold-contracts" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Data auto-updated with every site deploy from live MCX feed · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Prices are indicative. Verify live margins on your broker&apos;s SPAN calculator before trading. Trading commodity futures involves significant risk of loss.
        </p>
      </div>
    </>
  )
}

import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'

// ── Live data ──────────────────────────────────────────────────────────────
// Read market-snapshot.json (written by fetch-snapshot.mjs at deploy time).
// Falls back to mcx-last-prices.json, then to hardcoded mid-2026 estimates.
// This is the durable moat: every competitor shows 2023 prices; ours self-updates.

interface Prices {
  gold: number    // ₹/10g
  silver: number  // ₹/kg
  crude: number   // ₹/bbl
  copper: number  // ₹/kg
  natgas: number  // ₹/mmBtu
  snapshotDate: string
}

function loadPrices(): Prices {
  const cwd = process.cwd()

  // Try full snapshot first
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(cwd, 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_GOLD?.price && i?.MCX_SILVER?.price) {
      return {
        gold:         i.MCX_GOLD.price,
        silver:       i.MCX_SILVER.price,
        crude:        i.MCX_CRUDE?.price   ?? 8700,
        copper:       i.MCX_COPPER?.price  ?? 1320,
        natgas:       i.MCX_NATGAS?.price  ?? 300,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }

  // Fall back to mcx-last-prices.json
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, 'data/mcx-last-prices.json'), 'utf8'))
    if (raw?.gold) {
      const d = new Date(raw.ts ?? Date.now())
      return {
        gold:   raw.gold,
        silver: raw.silver,
        crude:  raw.crude,
        copper: raw.copper,
        natgas: raw.natgas,
        snapshotDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }

  // Static mid-2026 estimates — only used when no data file exists locally
  return {
    gold:         155000,
    silver:       247000,
    crude:         8700,
    copper:        1320,
    natgas:         299,
    snapshotDate: 'Jun 2026',
  }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtValue(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} crore`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} lakh`
  return `₹${fmt(Math.round(v))}`
}

function marginRange(contractValue: number, lo = 0.04, hi = 0.065): string {
  const low  = Math.round(contractValue * lo / 1000) * 1000
  const high = Math.round(contractValue * hi / 1000) * 1000
  return `${fmtValue(low)} – ${fmtValue(high)}`
}

// ── Metadata ───────────────────────────────────────────────────────────────
export const metadata = {
  title: 'MCX Lot Sizes 2026: Every Contract, Margin & Contract Value',
  description: 'Complete MCX lot size table for 2026 — Gold, Silver, Crude Oil, Copper, Natural Gas. Includes Gold Mini, Silver Mini, Crude Mini and all sub-contracts. Live contract values updated every deploy.',
  keywords: [
    'MCX lot size 2026',
    'MCX gold mini lot size',
    'MCX silver lot size',
    'MCX crude oil lot size',
    'MCX copper lot size',
    'MCX natural gas lot size',
    'MCX contract value margin',
    'MCX futures lot size table India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-lot-sizes' },
  openGraph: {
    title: 'MCX Lot Sizes 2026 — All Contracts, Values & Margins | BhaavBrief',
    description: 'Gold Mini, Silver Mini, Crude Mini and every other MCX contract — lot sizes, live contract values, SPAN margin ranges, tick size, and P&L per tick.',
    url: 'https://bhaavbrief.in/learn/mcx-lot-sizes',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Lot+Sizes+2026&tags=Gold+Mini,Silver+Mini,Crude+Mini', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Lot Sizes 2026 | BhaavBrief', description: 'Complete lot size table for every MCX futures contract — updated with live prices at each deploy.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Lot+Sizes+2026&tags=Gold+Mini,Silver+Mini,Crude+Mini'] },
}

// ── Structured data ────────────────────────────────────────────────────────
const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn',  item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Lot Sizes' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the lot size of MCX Gold Mini?',
      acceptedAnswer: { '@type': 'Answer', text: 'The MCX Gold Mini lot size is 100 grams, quoted in ₹ per 10 grams. It is one-tenth the size of the standard Gold contract (1 kg). Gold Mini is the most popular contract for retail gold traders because it requires a fraction of the margin — typically ₹60,000–₹1,00,000 — versus ₹6–10 lakh for the standard.' },
    },
    {
      '@type': 'Question',
      name: 'What is the MCX Crude Oil Mini lot size?',
      acceptedAnswer: { '@type': 'Answer', text: 'The MCX Crude Mini lot size is 10 barrels, quoted in ₹ per barrel. The standard Crude Oil lot is 100 barrels. At current prices, one Crude Mini lot has a contract value around ₹80,000–₹90,000 and requires approximately ₹4,000–₹6,000 in SPAN margin — making it the most accessible MCX energy contract for beginners.' },
    },
    {
      '@type': 'Question',
      name: 'How is MCX Gold lot size contract value calculated?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold is quoted in ₹ per 10 grams. The standard lot is 1 kg = 100 units of 10 grams. Contract value = price per 10g × 100. If gold is at ₹1,55,000 per 10g, one lot = ₹1,55,000 × 100 = ₹1.55 crore. Gold Mini (100g) = price × 10 ≈ ₹15.5 lakh. Margin is typically 4–7% of contract value.' },
    },
    {
      '@type': 'Question',
      name: 'What is the tick size for MCX contracts?',
      acceptedAnswer: { '@type': 'Answer', text: 'Tick size is the minimum price movement allowed. MCX Gold: ₹1 per 10g (P&L per tick = ₹100 for standard, ₹10 for Mini). MCX Silver: ₹1 per kg (P&L = ₹30/lot standard, ₹5/lot Mini). MCX Crude Oil: ₹1 per barrel (₹100/lot standard, ₹10/lot Mini). MCX Copper: ₹0.05/kg (₹125/lot). Natural Gas: ₹0.10/mmBtu (₹125/lot standard, ₹25/lot Mini).' },
    },
    {
      '@type': 'Question',
      name: 'Which MCX contract is best for beginners?',
      acceptedAnswer: { '@type': 'Answer', text: 'For beginners, MCX Gold Mini (100g, margin ₹60K–₹1L) and MCX Crude Mini (10 bbl, margin ₹4K–₹6K) are the most accessible. Gold Mini tracks global gold prices with lower capital requirement. Crude Mini lets you trade the most liquid energy contract with minimal margin. Natural Gas Mini (250 mmBtu) requires the least margin in absolute terms but has higher volatility relative to its size.' },
    },
  ],
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function Page() {
  const p = loadPrices()

  // Contract values at live prices
  const goldStd  = p.gold * 100         // 1 kg = 100 × 10g units
  const goldMini = p.gold * 10          // 100g = 10 × 10g units
  const goldGuinea = p.gold * 0.8       // 8g
  const goldPetal  = p.gold * 0.1       // 1g
  const silverStd  = p.silver * 30      // 30 kg
  const silverMini = p.silver * 5       // 5 kg
  const silverMicro = p.silver * 1      // 1 kg
  const crudeStd   = p.crude  * 100     // 100 bbl
  const crudeMini  = p.crude  * 10      // 10 bbl
  const copperStd  = p.copper * 2500    // 2500 kg
  const copperMini = p.copper * 250     // 250 kg
  const natgasStd  = p.natgas * 1250    // 1250 mmBtu
  const natgasMini = p.natgas * 250     // 250 mmBtu

  const cell: React.CSSProperties = {
    padding: '10px 14px',
    borderTop: '1px solid #DDDDD0',
    fontSize: 15,
    color: '#18180F',
    verticalAlign: 'top',
  }
  const hcell: React.CSSProperties = {
    padding: '10px 14px',
    textAlign: 'left' as const,
    fontSize: 10,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    color: '#8A8A7A',
    background: '#F3F2EC',
    fontFamily: 'var(--font-mono)',
  }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = {
    background: '#F8F7F2',
    borderLeft: '3px solid #C8720A',
    padding: '16px 20px',
    marginBottom: 24,
    borderRadius: '0 4px 4px 0',
  }
  const h2: React.CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: 20,
    fontWeight: 500,
    color: '#18180F',
    marginBottom: 12,
    marginTop: 36,
  }
  const prose: React.CSSProperties = {
    fontSize: 15,
    color: '#48483A',
    lineHeight: 1.8,
    marginBottom: 16,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Lot Sizes</span>
        </nav>

        {/* H1 */}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Lot Sizes 2026: Every Contract, Margin &amp; Contract Value
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          Live prices as of {p.snapshotDate} · Updated on every deploy
        </p>

        {/* ── Answer above the fold (first 120 words + table) ── */}
        <p style={prose}>
          MCX offers eight commodity groups with contracts of varying sizes. The table below shows
          every actively traded contract — lot size, tick size, P&amp;L per tick, and the{' '}
          <strong>live contract value at today&apos;s prices</strong>. SPAN margin is typically
          4–7% of contract value; your broker may add an exposure margin on top. Use the table to
          find the contract whose margin fits your capital before you trade.
        </p>

        {/* ── Complete lot sizes table ── */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Lot Size', 'Tick Size', 'P&L / tick', 'Contract Value*', 'SPAN Margin*'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* ── Precious Metals ── */}
              <tr><td colSpan={6} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Precious Metals</td></tr>
              <tr>
                <td style={cell}><strong>Gold</strong></td>
                <td style={cell}>1 kg</td>
                <td style={cell}>₹1 / 10g</td>
                <td style={cell}>₹100 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldStd)}</td>
                <td style={cell}>{marginRange(goldStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Mini</td>
                <td style={cell}>100 g</td>
                <td style={cell}>₹1 / 10g</td>
                <td style={cell}>₹10 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldMini)}</td>
                <td style={cell}>{marginRange(goldMini)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Guinea</td>
                <td style={cell}>8 g</td>
                <td style={cell}>₹1 / 10g</td>
                <td style={cell}>₹0.80 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldGuinea)}</td>
                <td style={cell}>{marginRange(goldGuinea)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Petal</td>
                <td style={cell}>1 g</td>
                <td style={cell}>₹1 / 10g</td>
                <td style={cell}>₹0.10 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldPetal)}</td>
                <td style={cell}>{marginRange(goldPetal)}</td>
              </tr>
              <tr>
                <td style={cell}><strong>Silver</strong></td>
                <td style={cell}>30 kg</td>
                <td style={cell}>₹1 / kg</td>
                <td style={cell}>₹30 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverStd)}</td>
                <td style={cell}>{marginRange(silverStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Silver Mini</td>
                <td style={cell}>5 kg</td>
                <td style={cell}>₹1 / kg</td>
                <td style={cell}>₹5 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverMini)}</td>
                <td style={cell}>{marginRange(silverMini)}</td>
              </tr>
              <tr>
                <td style={cell}>Silver Micro</td>
                <td style={cell}>1 kg</td>
                <td style={cell}>₹1 / kg</td>
                <td style={cell}>₹1 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverMicro)}</td>
                <td style={cell}>{marginRange(silverMicro)}</td>
              </tr>
              {/* ── Energy ── */}
              <tr><td colSpan={6} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Energy</td></tr>
              <tr>
                <td style={cell}><strong>Crude Oil</strong></td>
                <td style={cell}>100 bbl</td>
                <td style={cell}>₹1 / bbl</td>
                <td style={cell}>₹100 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(crudeStd)}</td>
                <td style={cell}>{marginRange(crudeStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Crude Mini</td>
                <td style={cell}>10 bbl</td>
                <td style={cell}>₹1 / bbl</td>
                <td style={cell}>₹10 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(crudeMini)}</td>
                <td style={cell}>{marginRange(crudeMini)}</td>
              </tr>
              <tr>
                <td style={cell}><strong>Natural Gas</strong></td>
                <td style={cell}>1,250 mmBtu</td>
                <td style={cell}>₹0.10 / mmBtu</td>
                <td style={cell}>₹125 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(natgasStd)}</td>
                <td style={cell}>{marginRange(natgasStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Nat Gas Mini</td>
                <td style={cell}>250 mmBtu</td>
                <td style={cell}>₹0.10 / mmBtu</td>
                <td style={cell}>₹25 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(natgasMini)}</td>
                <td style={cell}>{marginRange(natgasMini)}</td>
              </tr>
              {/* ── Base Metals ── */}
              <tr><td colSpan={6} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Base Metals</td></tr>
              <tr>
                <td style={cell}><strong>Copper</strong></td>
                <td style={cell}>2,500 kg</td>
                <td style={cell}>₹0.05 / kg</td>
                <td style={cell}>₹125 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(copperStd)}</td>
                <td style={cell}>{marginRange(copperStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Copper Mini</td>
                <td style={cell}>250 kg</td>
                <td style={cell}>₹0.05 / kg</td>
                <td style={cell}>₹12.50 / lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(copperMini)}</td>
                <td style={cell}>{marginRange(copperMini)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          * Contract values computed from MCX prices as of {p.snapshotDate}: Gold ₹{fmt(p.gold)}/10g, Silver ₹{fmt(p.silver)}/kg, Crude ₹{fmt(p.crude)}/bbl, Copper ₹{fmt(p.copper)}/kg, Nat Gas ₹{fmt(p.natgas, 1)}/mmBtu. SPAN margin indicative (4–6.5% of contract value); actual margin set by MCX daily — check your broker&apos;s SPAN calculator.
        </p>

        {/* ── Live-data edge callout ── */}
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Live data — as of {p.snapshotDate}</div>
          <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.7, color: '#18180F' }}>
            At today&apos;s MCX Gold price of <strong>₹{fmt(p.gold)}/10g</strong>:
          </p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 20, fontSize: 14, lineHeight: 1.8, color: '#18180F' }}>
            <li>1 Gold standard lot (1 kg) = <strong>{fmtValue(goldStd)}</strong> — margin ≈ {marginRange(goldStd)}</li>
            <li>1 Gold Mini lot (100g) = <strong>{fmtValue(goldMini)}</strong> — margin ≈ {marginRange(goldMini)}</li>
          </ul>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#18180F' }}>
            At Crude ₹{fmt(p.crude)}/bbl: one Crude Mini lot (10 bbl) = <strong>{fmtValue(crudeMini)}</strong>, margin ≈ {marginRange(crudeMini)}.
          </p>
        </div>

        {/* ── Worked example ── */}
        <h2 style={h2}>Worked example: Crude Mini margin calculation</h2>
        <p style={prose}>
          The Crude Mini is the most accessible entry point on MCX. Here is how to compute your
          required capital step by step.
        </p>
        <div style={infoBox}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#18180F' }}>
            Scenario: Buy 1 MCX Crude Mini at ₹{fmt(p.crude)}/bbl
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Lot size:</strong> 10 barrels</li>
            <li><strong>Contract value:</strong> ₹{fmt(p.crude)} × 10 = <strong>₹{fmt(p.crude * 10)}</strong></li>
            <li><strong>SPAN margin (≈5%):</strong> ₹{fmt(Math.round(p.crude * 10 * 0.05))}</li>
            <li><strong>Exposure margin (≈2%):</strong> ₹{fmt(Math.round(p.crude * 10 * 0.02))}</li>
            <li><strong>Total margin required:</strong> ≈ <strong>₹{fmt(Math.round(p.crude * 10 * 0.07))}</strong></li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.7, color: '#48483A' }}>
            If crude rises ₹100/bbl (about 1.1% at current prices), your profit = ₹100 × 10 bbl
            = <strong>₹1,000</strong> on a margin of ≈₹{fmt(Math.round(p.crude * 10 * 0.07))}.
            That is a {((1000 / (p.crude * 10 * 0.07)) * 100).toFixed(1)}% return on margin from
            a 1.1% price move — leverage cuts both ways, so maintain a 20–30% buffer above minimum
            margin at all times.
          </p>
        </div>

        {/* ── How contract value is calculated ── */}
        <h2 style={h2}>How MCX contract value is calculated</h2>
        <p style={prose}>
          MCX Gold is quoted in ₹ per 10 grams, not per gram or per kg. The standard lot is 1 kg
          = 100 units of 10g. So:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div style={{ background: '#F3F2EC', padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 15, lineHeight: 1.9, color: '#18180F', minWidth: 280 }}>
          Contract value = price per 10g × lot size in 10g units<br />
          = ₹{fmt(p.gold)} × 100 = <strong>{fmtValue(goldStd)}</strong><br />
          <br />
          Gold Mini = ₹{fmt(p.gold)} × 10 = <strong>{fmtValue(goldMini)}</strong><br />
          Gold Guinea = ₹{fmt(p.gold)} × 0.8 = <strong>{fmtValue(goldGuinea)}</strong>
        </div>
        </div>
        <p style={prose}>
          Silver, Crude, Copper, and Natural Gas use simpler math — they are quoted per unit of the
          underlying, and the lot size is just that many units. MCX Crude at ₹{fmt(p.crude)}/bbl
          × 100 bbl = {fmtValue(crudeStd)}.
        </p>

        {/* ── FAQ ── */}
        <h2 style={h2}>Frequently asked questions</h2>

        {FAQ_SCHEMA.mainEntity.map((faq, i) => (
          <div key={i} style={{ borderTop: '0.5px solid #DDDDD0', paddingTop: 20, paddingBottom: 8, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: '#18180F', margin: '0 0 8px' }}>{faq.name}</p>
            <p style={{ fontSize: 14, color: '#48483A', lineHeight: 1.75, margin: 0 }}>{faq.acceptedAnswer.text}</p>
          </div>
        ))}

        {/* ── Cross-links ── */}
        <div style={{ borderTop: '0.5px solid #DDDDD0', marginTop: 40, paddingTop: 28 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: 16 }}>Continue reading</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>
              ← Learn hub
            </Link>
            <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX margin calculation →
            </Link>
            <Link href="/learn/mcx-gold-contracts" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX Gold contracts in detail →
            </Link>
            <Link href="/commodities/gold" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              Gold live price & analysis →
            </Link>
          </div>
        </div>

        {/* ── Subscribe CTA ── */}
        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-lot-sizes" />
        </div>

        {/* ── Author / update stamp ── */}
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Data auto-updated with every site deploy from live MCX feed · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Prices are indicative. Verify live margins on your broker&apos;s SPAN calculator. Trading commodity futures involves significant risk of loss.
        </p>
      </div>
    </>
  )
}

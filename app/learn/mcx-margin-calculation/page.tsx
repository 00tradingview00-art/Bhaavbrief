import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'

interface Prices {
  gold: number
  silver: number
  crude: number
  copper: number
  natgas: number
  snapshotDate: string
}

function loadPrices(): Prices {
  const cwd = process.cwd()
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(cwd, 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_GOLD?.price && i?.MCX_SILVER?.price) {
      return {
        gold:         i.MCX_GOLD.price,
        silver:       i.MCX_SILVER.price,
        crude:        i.MCX_CRUDE?.price  ?? 8700,
        copper:       i.MCX_COPPER?.price ?? 1320,
        natgas:       i.MCX_NATGAS?.price ?? 300,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, 'data/mcx-last-prices.json'), 'utf8'))
    if (raw?.gold) {
      const d = new Date(raw.ts ?? Date.now())
      return {
        gold: raw.gold, silver: raw.silver, crude: raw.crude,
        copper: raw.copper, natgas: raw.natgas,
        snapshotDate: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  return { gold: 149000, silver: 240000, crude: 8300, copper: 1320, natgas: 295, snapshotDate: 'Jun 2026' }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtValue(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} crore`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} lakh`
  return `₹${fmt(Math.round(v))}`
}

function spanRange(cv: number, lo = 0.04, hi = 0.06): string {
  return `${fmtValue(Math.round(cv * lo / 1000) * 1000)} – ${fmtValue(Math.round(cv * hi / 1000) * 1000)}`
}

function totalRange(cv: number, lo = 0.06, hi = 0.085): string {
  return `${fmtValue(Math.round(cv * lo / 1000) * 1000)} – ${fmtValue(Math.round(cv * hi / 1000) * 1000)}`
}

export const metadata = {
  title: 'MCX Margin Calculation 2026: SPAN, Exposure & Total Margin Explained',
  description: 'How to calculate MCX futures margin in 2026. Understand SPAN margin vs exposure margin, worked examples for Gold Mini, Crude Mini, Silver and Copper, and how MCX margin calls work.',
  keywords: [
    'MCX margin calculation 2026',
    'MCX SPAN margin explained India',
    'MCX exposure margin',
    'MCX gold mini margin requirement',
    'MCX crude oil margin',
    'how to calculate MCX futures margin',
    'MCX margin call explained',
    'SPAN margin vs exposure margin MCX',
    'MCX commodity margin calculator India',
    'MCX silver margin 2026',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-margin-calculation' },
  openGraph: {
    title: 'MCX Margin Calculation 2026 — SPAN, Exposure & Margin Calls | BhaavBrief',
    description: 'Step-by-step MCX margin calculation with live prices. SPAN vs exposure margin, worked examples for every contract, and how margin calls work.',
    url: 'https://bhaavbrief.in/learn/mcx-margin-calculation',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Margin+Calculation+2026&tags=SPAN+Margin,Exposure+Margin,Margin+Call', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Margin Calculation 2026 | BhaavBrief', description: 'SPAN margin, exposure margin, margin calls — MCX futures margin explained with live price examples.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Margin+Calculation+2026&tags=SPAN+Margin,Exposure+Margin,Margin+Call'] },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Margin Calculation' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is MCX margin calculated?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX margin has two components: SPAN margin (set by MCX based on statistical worst-case price scenarios, typically 4–6% of contract value) and Exposure margin (set by your broker, typically 1–3%). Total initial margin = SPAN + Exposure, usually 6–9% of contract value. Example: MCX Gold Mini (100g) at ₹1,49,000/10g has a contract value of ₹14.9 lakh. SPAN at 5% = ₹74,500; total with exposure margin at 7% ≈ ₹1,04,300.' },
    },
    {
      '@type': 'Question',
      name: 'What is SPAN margin on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'SPAN (Standard Portfolio Analysis of Risk) margin is the minimum margin required by MCX to hold a futures position overnight. It is calculated using a risk model that simulates extreme price scenarios over a one-day horizon. SPAN margin is updated twice daily by MCX — it rises when volatility increases (such as during OPEC decisions or geopolitical events) and falls in calm markets. Your broker cannot reduce SPAN margin below the MCX-mandated level.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between SPAN and exposure margin on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'SPAN margin is the regulatory minimum set by MCX; exposure margin is an additional buffer required by your broker. SPAN covers the statistical worst-case daily loss; exposure margin covers the tail risk beyond SPAN. While SPAN is identical across all MCX-regulated brokers, exposure margin varies — Zerodha typically charges 1–3%, while full-service brokers may charge 2–5% extra. Always check your specific broker\'s margin schedule before trading.' },
    },
    {
      '@type': 'Question',
      name: 'What happens during an MCX margin call?',
      acceptedAnswer: { '@type': 'Answer', text: 'An MCX margin call is triggered when your account balance falls below the maintenance margin (typically 75% of the initial margin). Your broker will alert you to deposit additional funds immediately — usually within a few hours. If you do not top up, the broker will square off (close) your position at the prevailing market price, which may be at a loss. Always maintain 20–30% buffer above the minimum margin to avoid forced square-offs during intraday volatility.' },
    },
    {
      '@type': 'Question',
      name: 'How much margin is required for MCX Gold Mini in 2026?',
      acceptedAnswer: { '@type': 'Answer', text: 'At mid-2026 price levels (around ₹1,49,000/10g), the MCX Gold Mini (100g lot) has a contract value of approximately ₹14.9 lakh. SPAN margin (4–6%) = ₹59,600–₹89,400. With broker exposure margin added (total 6–8.5%), the total initial margin is approximately ₹89,400–₹1,26,650. The exact amount changes daily — check your broker\'s SPAN calculator for the current requirement before trading.' },
    },
    {
      '@type': 'Question',
      name: 'What is MTM (mark-to-market) in MCX trading?',
      acceptedAnswer: { '@type': 'Answer', text: 'MTM (mark-to-market) is MCX\'s daily settlement process. At the end of each trading session, all open positions are valued at the official closing price. If the price moved in your favour, the profit is credited to your account overnight. If it moved against you, the loss is debited immediately. This happens every day you hold a position — you cannot defer MTM losses by simply holding. If MTM losses reduce your balance below the maintenance margin, a margin call follows the next morning.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  const goldStd    = p.gold * 100
  const goldMini   = p.gold * 10
  const goldGuinea = p.gold * 0.8
  const goldPetal  = p.gold * 0.1
  const silverStd  = p.silver * 30
  const silverMini = p.silver * 5
  const silverMicro = p.silver * 1
  const crudeStd   = p.crude * 100
  const crudeMini  = p.crude * 10
  const copperStd  = p.copper * 2500
  const copperMini = p.copper * 250
  const natgasStd  = p.natgas * 1250
  const natgasMini = p.natgas * 250

  const spanPct  = 0.05
  const totalPct = 0.07
  const maintPct = 0.75

  const crudeWorkedCV  = p.crude * 10
  const crudeSpan      = Math.round(crudeWorkedCV * spanPct)
  const crudeExposure  = Math.round(crudeWorkedCV * 0.02)
  const crudeTotal     = Math.round(crudeWorkedCV * totalPct)
  const crudeMaint     = Math.round(crudeTotal * maintPct)
  const crudeCallLoss  = crudeTotal - crudeMaint

  const goldWorkedCV   = p.gold * 10
  const goldSpan       = Math.round(goldWorkedCV * spanPct)
  const goldExposure   = Math.round(goldWorkedCV * 0.02)
  const goldTotal      = Math.round(goldWorkedCV * totalPct)
  const goldMaint      = Math.round(goldTotal * maintPct)
  const goldCallLoss   = goldTotal - goldMaint

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 13, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-mono)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 36 }
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
          <span style={{ color: '#18180F' }}>MCX Margin Calculation</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Margin Calculation 2026: SPAN, Exposure &amp; Total Margin Explained
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          Live prices as of {p.snapshotDate} · Updated on every deploy
        </p>

        <p style={prose}>
          Every MCX futures position requires two types of margin upfront: <strong>SPAN margin</strong> (set by MCX) and <strong>exposure margin</strong> (set by your broker). Together they form your total initial margin — typically 6–9% of the contract value. The table below shows the current margin requirement for every actively traded MCX contract, calculated from today&apos;s live prices.
        </p>

        {/* Live margin table */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Lot Size', 'Contract Value*', 'SPAN Margin* (4–6%)', 'Total Margin* (6–8.5%)'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={5} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Precious Metals</td></tr>
              <tr>
                <td style={cell}><strong>Gold</strong></td>
                <td style={cell}>1 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldStd)}</td>
                <td style={cell}>{spanRange(goldStd)}</td>
                <td style={cell}>{totalRange(goldStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Mini</td>
                <td style={cell}>100 g</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldMini)}</td>
                <td style={cell}>{spanRange(goldMini)}</td>
                <td style={cell}>{totalRange(goldMini)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Guinea</td>
                <td style={cell}>8 g</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldGuinea)}</td>
                <td style={cell}>{spanRange(goldGuinea)}</td>
                <td style={cell}>{totalRange(goldGuinea)}</td>
              </tr>
              <tr>
                <td style={cell}>Gold Petal</td>
                <td style={cell}>1 g</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(goldPetal)}</td>
                <td style={cell}>{spanRange(goldPetal)}</td>
                <td style={cell}>{totalRange(goldPetal)}</td>
              </tr>
              <tr>
                <td style={cell}><strong>Silver</strong></td>
                <td style={cell}>30 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverStd)}</td>
                <td style={cell}>{spanRange(silverStd)}</td>
                <td style={cell}>{totalRange(silverStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Silver Mini</td>
                <td style={cell}>5 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverMini)}</td>
                <td style={cell}>{spanRange(silverMini)}</td>
                <td style={cell}>{totalRange(silverMini)}</td>
              </tr>
              <tr>
                <td style={cell}>Silver Micro</td>
                <td style={cell}>1 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(silverMicro)}</td>
                <td style={cell}>{spanRange(silverMicro)}</td>
                <td style={cell}>{totalRange(silverMicro)}</td>
              </tr>
              <tr><td colSpan={5} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Energy</td></tr>
              <tr>
                <td style={cell}><strong>Crude Oil</strong></td>
                <td style={cell}>100 bbl</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(crudeStd)}</td>
                <td style={cell}>{spanRange(crudeStd)}</td>
                <td style={cell}>{totalRange(crudeStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Crude Mini</td>
                <td style={cell}>10 bbl</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(crudeMini)}</td>
                <td style={cell}>{spanRange(crudeMini)}</td>
                <td style={cell}>{totalRange(crudeMini)}</td>
              </tr>
              <tr>
                <td style={cell}><strong>Natural Gas</strong></td>
                <td style={cell}>1,250 mmBtu</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(natgasStd)}</td>
                <td style={cell}>{spanRange(natgasStd)}</td>
                <td style={cell}>{totalRange(natgasStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Nat Gas Mini</td>
                <td style={cell}>250 mmBtu</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(natgasMini)}</td>
                <td style={cell}>{spanRange(natgasMini)}</td>
                <td style={cell}>{totalRange(natgasMini)}</td>
              </tr>
              <tr><td colSpan={5} style={{ ...cell, background: '#F3F2EC', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600, fontFamily: 'var(--font-mono)', padding: '6px 14px' }}>Base Metals</td></tr>
              <tr>
                <td style={cell}><strong>Copper</strong></td>
                <td style={cell}>2,500 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(copperStd)}</td>
                <td style={cell}>{spanRange(copperStd)}</td>
                <td style={cell}>{totalRange(copperStd)}</td>
              </tr>
              <tr>
                <td style={cell}>Copper Mini</td>
                <td style={cell}>250 kg</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(copperMini)}</td>
                <td style={cell}>{spanRange(copperMini)}</td>
                <td style={cell}>{totalRange(copperMini)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          * Contract values at {p.snapshotDate}: Gold ₹{fmt(p.gold)}/10g · Silver ₹{fmt(p.silver)}/kg · Crude ₹{fmt(p.crude)}/bbl · Copper ₹{fmt(p.copper)}/kg · NatGas ₹{fmt(p.natgas, 1)}/mmBtu. SPAN and total margin are indicative ranges — MCX updates SPAN twice daily; actual requirement varies by broker. Always verify on your broker&apos;s SPAN calculator before trading.
        </p>

        {/* SPAN explained */}
        <h2 style={h2}>What is SPAN margin?</h2>
        <p style={prose}>
          SPAN (Standard Portfolio Analysis of Risk) is the risk model MCX uses to set minimum margin requirements. It simulates 16 extreme price-and-volatility scenarios and requires enough margin to cover the worst case over a single trading day. MCX recalculates SPAN twice daily — once at market open and once intraday — so your required margin can change while you hold a position.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Key property of SPAN</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            SPAN is portfolio-aware. If you hold both a long Gold position and a short Gold Mini, SPAN recognises the hedge and may reduce your total margin. This is why traders holding offsetting positions often see lower-than-expected margin requirements on their statements.
          </p>
        </div>
        <p style={prose}>
          During high-volatility events — OPEC announcements, Fed rate decisions, geopolitical shocks — MCX may invoke an <strong>ad-hoc SPAN revision</strong> mid-session, raising margins immediately. If your account has insufficient balance to meet the revised SPAN, your broker can square off your position without notice. Always maintain a buffer.
        </p>

        {/* Exposure margin */}
        <h2 style={h2}>What is exposure margin?</h2>
        <p style={prose}>
          Exposure margin is an additional margin levied by your broker (not MCX) on top of SPAN. It acts as a second buffer for extreme tail-risk scenarios. Unlike SPAN, exposure margin rates vary by broker:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Broker', 'Exposure Margin (approx)', 'Notes'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Zerodha', '1–2% of contract value', 'Among the lowest — published in Kite margin calculator'],
                ['Angel One', '1–3% of contract value', 'Varies by commodity and volatility regime'],
                ['ICICI Direct', '2–5% of contract value', 'Higher advisory-service buffer'],
                ['HDFC Securities', '2–4% of contract value', 'Check HDFC Sky margin schedule for current rates'],
              ].map(([broker, rate, note], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{broker}</strong></td>
                  <td style={cell}>{rate}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>Rates are indicative. Brokers revise exposure margin during high-volatility periods. Always verify on your broker&apos;s margin calculator before placing a trade.</p>

        {/* Worked example — Crude Mini */}
        <h2 style={h2}>Worked example: Crude Mini margin calculation</h2>
        <p style={prose}>
          MCX Crude Mini (10 barrels) is the most accessible entry point for energy traders. Here is the full margin calculation at today&apos;s price of <strong>₹{fmt(p.crude)}/bbl</strong>.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>MCX Crude Mini · 1 lot = 10 barrels</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2.1, color: '#18180F' }}>
            <li><strong>Current price:</strong> ₹{fmt(p.crude)}/barrel</li>
            <li><strong>Contract value:</strong> ₹{fmt(p.crude)} × 10 = <strong>₹{fmt(crudeWorkedCV)}</strong></li>
            <li><strong>SPAN margin (≈5%):</strong> ₹{fmt(crudeSpan)}</li>
            <li><strong>Exposure margin (≈2%):</strong> ₹{fmt(crudeExposure)}</li>
            <li><strong>Total initial margin (≈7%):</strong> ₹{fmt(crudeTotal)}</li>
            <li><strong>Maintenance margin (75% of total):</strong> ₹{fmt(crudeMaint)}</li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.75, color: '#48483A' }}>
            Margin call triggers when your account falls below <strong>₹{fmt(crudeMaint)}</strong>. That means a loss of just <strong>₹{fmt(crudeCallLoss)}</strong> from your initial deposit can trigger a call — equivalent to a ₹{fmt(Math.round(crudeCallLoss / 10))}/bbl adverse move (about {((crudeCallLoss / 10 / p.crude) * 100).toFixed(1)}% of price).
          </p>
        </div>

        {/* Worked example — Gold Mini */}
        <h2 style={h2}>Worked example: Gold Mini margin calculation</h2>
        <p style={prose}>
          MCX Gold Mini (100 grams) at today&apos;s price of <strong>₹{fmt(p.gold)}/10g</strong>:
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>MCX Gold Mini · 1 lot = 100g = 10 units of 10g</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2.1, color: '#18180F' }}>
            <li><strong>Current price:</strong> ₹{fmt(p.gold)}/10g</li>
            <li><strong>Contract value:</strong> ₹{fmt(p.gold)} × 10 = <strong>₹{fmt(goldWorkedCV)}</strong></li>
            <li><strong>SPAN margin (≈5%):</strong> ₹{fmt(goldSpan)}</li>
            <li><strong>Exposure margin (≈2%):</strong> ₹{fmt(goldExposure)}</li>
            <li><strong>Total initial margin (≈7%):</strong> ₹{fmt(goldTotal)}</li>
            <li><strong>Maintenance margin (75% of total):</strong> ₹{fmt(goldMaint)}</li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.75, color: '#48483A' }}>
            A ₹{fmt(Math.round(goldCallLoss / 10))}/10g adverse move (about {((goldCallLoss / 10 / p.gold) * 100).toFixed(1)}% of price) exhausts the margin buffer and triggers a call. A single intraday move of this size is not unusual during COMEX gold trading hours (10:30 PM – 2:30 AM IST).
          </p>
        </div>

        {/* MTM explained */}
        <h2 style={h2}>How MCX mark-to-market (MTM) settlement works</h2>
        <p style={prose}>
          MTM is the daily profit/loss settlement that happens every evening after MCX closes. It is the mechanism that makes your margin requirement dynamic rather than fixed.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div style={{ background: '#F3F2EC', padding: '16px 20px', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2, color: '#18180F', minWidth: 320 }}>
          Day 1: You buy 1 MCX Gold Mini at ₹{fmt(p.gold)}/10g.<br />
          Day 1 closing price: ₹{fmt(p.gold + 800)}/10g.<br />
          MTM profit: ₹800 × 10 units = <strong>+₹8,000</strong> credited to account.<br />
          <br />
          Day 2 opens: your margin base resets to Day 1 closing price (₹{fmt(p.gold + 800)}).<br />
          Day 2 closing price: ₹{fmt(p.gold - 1200)}/10g.<br />
          MTM loss: ₹{fmt(p.gold + 800 - (p.gold - 1200))} × 10 = <strong>−₹20,000</strong> debited from account.<br />
          <br />
          Net P&amp;L over 2 days: −₹12,000. Account debited ₹12,000 total.
        </div>
        </div>
        <p style={prose}>
          The critical lesson: you cannot &quot;ride out&quot; an adverse position by simply holding. Every day of adverse price movement withdraws cash from your account. If you run out of margin buffer, you are squared off — whether you wanted to be or not.
        </p>

        {/* Margin call box */}
        <h2 style={h2}>What triggers an MCX margin call?</h2>
        <div style={warnBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Margin call sequence</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li>Your account balance drops below <strong>maintenance margin</strong> (typically 75% of initial margin) due to MTM losses.</li>
            <li>Broker sends a margin call notice — usually via SMS and email — before market open the next morning.</li>
            <li>You have until approximately 9:30–10:00 AM IST to deposit the shortfall, restoring balance to the initial margin level.</li>
            <li>If you do not deposit in time, the broker squares off enough positions to bring your account above maintenance margin.</li>
            <li>Square-off happens at market price — which may be at a loss compared to what you would have chosen.</li>
          </ol>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.75, color: '#48483A' }}>
            <strong>Practical advice:</strong> Always maintain at least 30% buffer above the minimum margin — i.e., if your Gold Mini requires ₹{fmt(goldTotal)}, keep ₹{fmt(Math.round(goldTotal * 1.3))} in your account. Events like OPEC announcements or surprise Fed decisions can move MCX contracts 3–5% overnight.
          </p>
        </div>

        {/* Margin spike during events */}
        <h2 style={h2}>When does MCX raise SPAN margin?</h2>
        <p style={prose}>
          MCX raises SPAN margin pre-emptively before known high-volatility events and reactively after surprise moves. Knowing when margin spikes lets you plan capital deployment:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Event', 'Contracts affected', 'Typical SPAN increase', 'Timing'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['OPEC production decision', 'Crude Oil, Nat Gas', '20–50% above normal', '1–2 days before scheduled meeting'],
                ['US Fed rate decision (FOMC)', 'Gold, Silver', '15–30% above normal', 'Day before decision; 8 meetings/year'],
                ['US CPI data release', 'Gold, Silver', '10–20% above normal', 'Morning of data release (6 PM IST)'],
                ['Union Budget India', 'Gold, Silver, Crude', '10–25% above normal', '1–2 days before Budget day'],
                ['MCX circuit filter hit', 'Any contract', 'Immediate ad-hoc revision', 'Intraday, without advance notice'],
              ].map(([event, contracts, spike, timing], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{event}</strong></td>
                  <td style={cell}>{contracts}</td>
                  <td style={{ ...cell, color: '#C8720A', fontWeight: 500 }}>{spike}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{timing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
            <Link href="/learn" style={{ fontSize: 13, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>
              ← Learn hub
            </Link>
            <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX lot sizes →
            </Link>
            <Link href="/learn/mcx-gold-contracts" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX gold contracts →
            </Link>
            <Link href="/commodities/gold" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              Gold live price →
            </Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-margin-calculation" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Data auto-updated with every site deploy from live MCX feed · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Margin figures are indicative. Actual SPAN and exposure margin set daily by MCX and your broker. Verify on your broker&apos;s SPAN calculator before trading. Commodity futures trading involves significant risk of loss.
        </p>
      </div>
    </>
  )
}

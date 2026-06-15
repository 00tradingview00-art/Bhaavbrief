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
    if (i?.MCX_GOLD?.price) {
      return {
        gold:         i.MCX_GOLD.price,
        silver:       i.MCX_SILVER?.price  ?? 241000,
        crude:        i.MCX_CRUDE?.price   ?? 8300,
        copper:       i.MCX_COPPER?.price  ?? 1320,
        natgas:       i.MCX_NATGAS?.price  ?? 295,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  return { gold: 149000, silver: 241000, crude: 8300, copper: 1320, natgas: 295, snapshotDate: 'Jun 2026' }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtValue(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} crore`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} lakh`
  return `₹${fmt(Math.round(v))}`
}

export const metadata = {
  title: 'MCX Futures Rollover Guide 2026: When, How & Cost Explained',
  description: 'How to rollover MCX futures contracts in 2026. Rollover timing, cost calculation, worked examples for Crude Oil and Gold, step-by-step execution on Zerodha and Angel One, and common mistakes to avoid.',
  keywords: [
    'MCX futures rollover 2026',
    'how to rollover MCX futures India',
    'MCX rollover cost calculation',
    'MCX crude oil rollover',
    'MCX gold rollover date',
    'MCX rollover timing',
    'MCX contract expiry rollover',
    'MCX rollover contango cost India',
    'MCX futures rollover Zerodha',
    'MCX rollover vs square off',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-rollover' },
  openGraph: {
    title: 'MCX Futures Rollover Guide 2026 — Cost, Timing & Execution | BhaavBrief',
    description: 'Complete MCX rollover guide: when to roll, how to calculate rollover cost, worked examples with live prices, and step-by-step execution.',
    url: 'https://bhaavbrief.in/learn/mcx-rollover',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Rollover+Guide+2026&tags=Rollover+Cost,Contango,Backwardation', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Rollover Guide 2026 | BhaavBrief', description: 'When to rollover, rollover cost calculation, Crude and Gold examples — complete MCX rollover guide.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Rollover+Guide+2026&tags=Rollover+Cost,Contango,Backwardation'] },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Rollover Guide' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is rollover in MCX futures trading?',
      acceptedAnswer: { '@type': 'Answer', text: 'Rollover in MCX futures means closing (selling) your current near-month contract before it expires and simultaneously opening (buying) the same contract for the next expiry month — so you maintain continuous exposure without taking physical delivery. For example, if you hold a long MCX Crude Oil June contract, you sell June and buy July on the same day, keeping your crude oil position alive through the expiry.' },
    },
    {
      '@type': 'Question',
      name: 'When should I rollover my MCX futures position?',
      acceptedAnswer: { '@type': 'Answer', text: 'The optimal window to rollover is 5–7 trading days before the contract expiry date. During this window, the next-month contract has sufficient liquidity (tight bid-ask spreads) while the near-month contract still has enough volume for a clean exit. Avoid rolling in the last 2–3 days before expiry — open interest collapses, spreads widen dramatically, and you may face poor execution prices. For MCX Crude, roll by the 16th–17th of the month. For Gold, roll by the 2nd–3rd.' },
    },
    {
      '@type': 'Question',
      name: 'How is MCX rollover cost calculated?',
      acceptedAnswer: { '@type': 'Answer', text: 'Rollover cost = (Next month price – Near month price) × lot size. If MCX Crude July is ₹8,360/bbl and June is ₹8,328/bbl, the rollover costs ₹32/bbl × 100 barrels = ₹3,200 per lot. This is the contango cost — the market is pricing in carrying costs (storage, financing). In backwardation (next month cheaper), rolling actually earns you money. The rollover cost is paid as a worse execution price when you simultaneously sell near-month and buy next-month.' },
    },
    {
      '@type': 'Question',
      name: 'What happens if I do not rollover before MCX expiry?',
      acceptedAnswer: { '@type': 'Answer', text: 'If you hold an MCX futures position to expiry without rolling or squaring off, the exchange initiates physical delivery settlement. For buyers this means you must pay the full contract value and take delivery of the physical commodity (e.g., 100 barrels of crude oil, 1 kg of gold). For sellers, you must deliver the physical commodity to an MCX-approved vault. Physical delivery requires special KYC documentation and attracts additional costs. Most retail traders should square off or rollover at least 3 trading days before expiry.' },
    },
    {
      '@type': 'Question',
      name: 'Is rollover cost tax deductible in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'The rollover cost (the price differential between near-month and next-month contracts) is automatically reflected in your P&L and not separately deductible — it is embedded in the execution prices of the two trades. However, the transaction costs incurred during the rollover (brokerage, CTT on the sell leg, exchange charges) are all deductible as business expenses in ITR-3, exactly like any other MCX trade.' },
    },
    {
      '@type': 'Question',
      name: 'How do I rollover an MCX position on Zerodha Kite?',
      acceptedAnswer: { '@type': 'Answer', text: 'On Zerodha Kite: (1) Place a sell order for your near-month contract at market or limit price. (2) Immediately place a buy order for the next-month contract at current market price. Both can be done from the same watchlist — simply select the appropriate expiry month. There is no dedicated "rollover" button; it is two separate orders placed simultaneously. Ensure you have sufficient margin in your account for the next-month contract before placing the buy order, as margin requirements may differ slightly between expiry months.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  // Illustrative rollover costs — near/next month spread approximations
  const crudeContango   = 32    // typical ₹/bbl spread
  const goldContango    = 300   // typical ₹/10g spread
  const silverContango  = 800   // typical ₹/kg spread
  const copperContango  = 2     // typical ₹/kg spread (low)
  const natgasContango  = 5     // typical ₹/mmBtu spread (can be negative in winter)

  const crudeRollCost   = crudeContango * 100      // per standard lot
  const crudeMiniRoll   = crudeContango * 10       // per mini lot
  const goldRollCost    = goldContango  * 100      // per standard lot (100 units of 10g)
  const goldMiniRoll    = goldContango  * 10       // per mini lot

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 13, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-mono)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #E05C00', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
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
          <span style={{ color: '#18180F' }}>MCX Rollover Guide</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Futures Rollover Guide 2026: When, How &amp; Cost
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          Prices as of {p.snapshotDate} · Rollover costs are illustrative spread estimates
        </p>

        <p style={prose}>
          Rollover is the process of closing your expiring MCX futures contract and reopening the position in the next month — keeping exposure alive without taking physical delivery. Every MCX trader who holds positions beyond a single expiry month needs to understand rollover timing, cost, and execution. Done well, it is routine. Done poorly — too late, or without understanding the spread — it erodes returns every month.
        </p>

        {/* What is rollover */}
        <h2 style={h2}>What is MCX rollover?</h2>
        <p style={prose}>
          Every MCX futures contract has an expiry date. When expiry approaches, you have three choices: square off (close the position entirely), take physical delivery (almost never done by retail traders), or <strong>rollover</strong> — sell the expiring contract and simultaneously buy the next month&apos;s contract.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Rollover in one sentence</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            You sell June Crude Oil and buy July Crude Oil on the same day — your directional view stays intact, but the delivery obligation resets to July. The net cost (or gain) is the price difference between the two contracts.
          </p>
        </div>
        <p style={prose}>
          The two legs of a rollover are always executed as separate market orders — there is no single &quot;rollover&quot; button on Indian broker platforms. You sell near-month at market/limit, then immediately buy the next-month contract. The price difference between the two is your rollover cost (in contango) or rollover gain (in backwardation).
        </p>

        {/* Rollover calendar */}
        <h2 style={h2}>MCX rollover dates — when each contract expires</h2>
        <p style={prose}>
          The optimal rollover window is <strong>5–7 trading days before expiry</strong>. Earlier than this, next-month liquidity is thin. Later than this, near-month spreads widen and execution suffers.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Expiry rule', 'Optimal rollover window', 'Danger zone (avoid)'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Gold (Standard & Mini)', '5th of month', '28th–2nd of prior month', 'Last 2 days before 5th'],
                ['Gold Guinea & Petal',    'Last working day', '24th–27th of month', 'Last 2 working days'],
                ['Silver (all contracts)', '5th of month',     '28th–2nd of prior month', 'Last 2 days before 5th'],
                ['Crude Oil (Standard & Mini)', '19th–20th of month', '12th–16th of month', '17th–19th (wide spreads)'],
                ['Natural Gas (Standard & Mini)', '25th of month', '18th–22nd of month', '23rd–25th'],
                ['Copper, Zinc, Lead, Aluminium', 'Last working day of month', '24th–27th of month', 'Last 2 working days'],
                ['Nickel', 'Last working day of month', '24th–27th of month', 'Last 2 working days'],
              ].map(([contract, expiry, window, danger], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{contract}</strong></td>
                  <td style={{ ...cell, fontSize: 12 }}>{expiry}</td>
                  <td style={{ ...cell, color: '#1A7A1A', fontWeight: 500, fontSize: 12 }}>{window}</td>
                  <td style={{ ...cell, color: '#C83030', fontSize: 12 }}>{danger}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>Expiry dates subject to change if exchange holidays fall near these dates. Always verify on the MCX official website before rolling.</p>

        {/* How to calculate rollover cost */}
        <h2 style={h2}>How to calculate MCX rollover cost</h2>
        <p style={prose}>
          Rollover cost is simply the price spread between the next-month and near-month contract. When next month is more expensive (contango), rolling costs money. When next month is cheaper (backwardation), rolling earns money.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Typical contango spread', 'Rollover cost per lot', 'Annual drag (12 rolls)'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Gold (1 kg)',      `~₹${fmt(goldContango)}/10g`,  `₹${fmt(goldRollCost)}`,    `₹${fmt(goldRollCost * 12)}`],
                ['Gold Mini (100g)', `~₹${fmt(goldContango)}/10g`,  `₹${fmt(goldMiniRoll)}`,    `₹${fmt(goldMiniRoll * 12)}`],
                ['Silver (30 kg)',   `~₹${fmt(silverContango)}/kg`, `₹${fmt(silverContango * 30)}`, `₹${fmt(silverContango * 30 * 12)}`],
                ['Silver Mini (5 kg)', `~₹${fmt(silverContango)}/kg`, `₹${fmt(silverContango * 5)}`, `₹${fmt(silverContango * 5 * 12)}`],
                ['Crude Oil (100 bbl)', `~₹${fmt(crudeContango)}/bbl`, `₹${fmt(crudeRollCost)}`, `₹${fmt(crudeRollCost * 12)}`],
                ['Crude Mini (10 bbl)', `~₹${fmt(crudeContango)}/bbl`, `₹${fmt(crudeMiniRoll)}`, `₹${fmt(crudeMiniRoll * 12)}`],
                ['Copper (2,500 kg)',   `~₹${fmt(copperContango)}/kg`, `₹${fmt(copperContango * 2500)}`, `₹${fmt(copperContango * 2500 * 12)}`],
                ['Nat Gas (1,250 mmBtu)', '~₹5–15/mmBtu (seasonal)', '~₹6,250–18,750', 'Varies — can be negative in winter'],
              ].map(([contract, spread, cost, annual], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{contract}</strong></td>
                  <td style={cell}>{spread}</td>
                  <td style={{ ...cell, ...accent }}>{cost}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{annual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>
          Spreads are typical illustrative values — actual rollover cost varies daily based on market conditions, time to expiry, and carry rates. Check live next-month vs near-month prices on your broker platform before rolling.
        </p>

        {/* Worked example — Crude */}
        <h2 style={h2}>Worked example: MCX Crude Oil rollover</h2>
        <p style={prose}>
          At current MCX Crude price of <strong>₹{fmt(p.crude)}/bbl</strong>, here is a complete rollover calculation for a 1-lot long position:
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Crude Oil (100 bbl) — long rollover, contango market</div>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2.1, color: '#18180F', minWidth: 320 }}>
            Near-month (Jun) price:    ₹{fmt(p.crude)}/bbl<br />
            Next-month (Jul) price:    ₹{fmt(p.crude + crudeContango)}/bbl<br />
            Spread (contango):         ₹{crudeContango}/bbl<br />
            ─────────────────────────────────────<br />
            Step 1: Sell Jun at        ₹{fmt(p.crude)}/bbl → receive ₹{fmt(p.crude * 100)}<br />
            Step 2: Buy Jul at         ₹{fmt(p.crude + crudeContango)}/bbl → pay ₹{fmt((p.crude + crudeContango) * 100)}<br />
            ─────────────────────────────────────<br />
            Net rollover cost:         <strong>₹{fmt(crudeRollCost)} per lot</strong><br />
            (= ₹{crudeContango}/bbl × 100 bbl)<br />
            <br />
            As % of contract value:    {((crudeRollCost / (p.crude * 100)) * 100).toFixed(2)}%<br />
            Annual drag (12 rolls):    ₹{fmt(crudeRollCost * 12)} per lot
          </div>
          </div>
        </div>
        <p style={prose}>
          Notice that the rollover cost is implicit — it&apos;s not a fee you pay, it&apos;s the price difference you accept. If you roll a long position in contango, you buy the next month at a higher price than you sold the near month. Your break-even on the new position is automatically higher by the spread amount.
        </p>

        {/* Worked example — Gold */}
        <h2 style={h2}>Worked example: MCX Gold Mini rollover</h2>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Gold Mini (100g) — long rollover</div>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2.1, color: '#18180F', minWidth: 320 }}>
            Near-month price:          ₹{fmt(p.gold)}/10g<br />
            Next-month price:          ₹{fmt(p.gold + goldContango)}/10g<br />
            Spread (contango):         ₹{goldContango}/10g<br />
            ─────────────────────────────────────<br />
            Rollover cost:             ₹{goldContango}/10g × 10 units<br />
            {'                         '}<strong>= ₹{fmt(goldMiniRoll)} per Mini lot</strong><br />
            <br />
            As % of contract value:    {((goldMiniRoll / (p.gold * 10)) * 100).toFixed(2)}%<br />
            Annual drag (12 rolls):    ₹{fmt(goldMiniRoll * 12)} per lot
          </div>
          </div>
        </div>
        <p style={prose}>
          Gold is almost always in contango because it has low storage costs and high above-ground supply — the market always prices in carrying costs. Unlike crude oil, gold rarely enters meaningful backwardation. Expect to pay a rollover cost of approximately ₹200–₹500 per Gold Mini lot in normal market conditions.
        </p>

        {/* Contango vs backwardation */}
        <h2 style={h2}>Contango vs backwardation — how they affect rollover</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['', 'Contango (normal)', 'Backwardation (supply squeeze)'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Next month vs near month', 'More expensive', 'Cheaper'],
                ['Rolling a long position', 'Costs money (buy higher)', 'Earns money (buy lower)'],
                ['Rolling a short position', 'Earns money (sell higher)', 'Costs money (sell lower)'],
                ['Typical MCX Gold', '✓ Almost always contango', 'Rare'],
                ['Typical MCX Silver', '✓ Usually contango', 'Occasional during supply squeezes'],
                ['Typical MCX Crude', '✓ Usually contango', 'During OPEC cuts or Middle East crisis'],
                ['Typical MCX Nat Gas', 'Variable', 'Common in winter (demand spike)'],
              ].map(([label, contango, backw], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 500 }}>{label}</td>
                  <td style={{ ...cell, color: i > 0 && i < 3 ? '#C83030' : '#18180F', fontSize: 13 }}>{contango}</td>
                  <td style={{ ...cell, color: i > 0 && i < 3 ? '#1A7A1A' : '#18180F', fontSize: 13 }}>{backw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          When crude oil enters backwardation (far months cheaper than near month), rolling a long crude position actually <em>earns</em> money — you sell near-month at a higher price and buy next-month at a lower price. This happened repeatedly during OPEC supply cuts in 2023–2024. Nat Gas enters backwardation frequently in winter as immediate demand spikes.
        </p>

        {/* Step-by-step execution */}
        <h2 style={h2}>How to rollover on Zerodha Kite — step by step</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Step', 'Action', 'Detail'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['1', 'Check margin for next month', 'Go to Zerodha Margin Calculator → select next-month contract → confirm SPAN margin. Next-month margin may differ slightly from near-month.'],
                ['2', 'Add next-month contract to watchlist', 'Search e.g. "CRUDEOIL26JUL" in the Kite search bar. Add it alongside your current "CRUDEOIL26JUN" position.'],
                ['3', 'Note the live spread', 'Check both prices simultaneously. Decide if the contango cost is acceptable or wait for a tighter spread.'],
                ['4', 'Place sell order on near-month', 'Sell your near-month contract at market or limit. Use limit order during low-liquidity periods (early morning, late evening).'],
                ['5', 'Immediately place buy on next-month', 'Buy the next-month contract right after the near-month sell executes. Price slippage risk is highest if there is delay between the two legs.'],
                ['6', 'Verify position', 'Check your Positions tab — you should see the near-month position closed and next-month position open.'],
              ].map(([step, action, detail], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 600, color: '#C8720A', textAlign: 'center' }}>{step}</td>
                  <td style={{ ...cell, fontWeight: 500 }}>{action}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Angel One & other brokers</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            The process is identical on Angel One SmartAPI / SmartWeb, ICICI Direct, HDFC Sky, and other MCX-enabled platforms. All require the same two separate orders — there is no combined rollover ticket on any Indian retail platform. Some platforms display a &quot;Rollover&quot; label in the Positions section as a reminder that expiry is approaching; this is informational only, not a clickable action.
          </p>
        </div>

        {/* Common mistakes */}
        <h2 style={h2}>Common rollover mistakes</h2>
        <div style={warnBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E05C00', marginBottom: 8 }}>Avoid these</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2.1, color: '#18180F' }}>
            <li><strong>Rolling too late:</strong> In the final 2–3 days before expiry, open interest collapses and bid-ask spreads widen to 2–5× normal. You pay extra on both legs. Roll 5–7 days early.</li>
            <li><strong>Rolling without checking margin:</strong> Next-month contracts may have different SPAN margin due to higher volatility expectations. Rolling without enough margin in your account can trigger an immediate margin shortfall.</li>
            <li><strong>Delay between the two legs:</strong> Selling near-month and waiting before buying next-month exposes you to an unhedged gap. If crude oil moves ₹50/bbl during your 10-minute gap, you pay the new, worse price.</li>
            <li><strong>Rolling short positions in strong backwardation:</strong> If you are short a contract and the market is in backwardation, you pay to roll (you sell next-month at a lower price than you bought back near-month). Know your position direction before rolling.</li>
            <li><strong>Ignoring liquidity in next-month contracts:</strong> Some contracts (Nickel Mini, Gold Guinea) have thin next-month liquidity. Check the next-month order book depth before placing a large rollover order — a market order on a thin book can cause significant slippage.</li>
            <li><strong>Forgetting different expiry dates for different contracts:</strong> Gold Standard expires on the 5th; Gold Guinea on the last day of the month. Rolling Gold and Gold Guinea on the same schedule can result in an early (costly) rollover on one and a late (risky) rollover on the other.</li>
          </ul>
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
            <Link href="/learn" style={{ fontSize: 13, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>← Learn hub</Link>
            <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>MCX lot sizes →</Link>
            <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>Margin calculation →</Link>
            <Link href="/commodities/crude-oil" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>Crude live price →</Link>
            <Link href="/commodities/gold" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>Gold live price →</Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-rollover" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          Rollover spread figures are illustrative estimates. Actual spreads vary daily — check live next-month vs near-month prices before rolling. Trading commodity futures involves significant risk of loss.
        </p>
      </div>
    </>
  )
}

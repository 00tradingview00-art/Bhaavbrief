import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'
import { safeJsonLd } from '@/lib/seo'

interface Prices {
  gold: number
  snapshotDate: string
}

function loadPrices(): Prices {
  const cwd = process.cwd()
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(cwd, 'data/market-snapshot.json'), 'utf8'))
    if (snap.instruments?.MCX_GOLD?.price) {
      return {
        gold:         snap.instruments.MCX_GOLD.price,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
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

export const metadata = {
  title: 'MCX Gold vs Gold ETF India 2026: Which Is Better For You?',
  description: 'MCX gold futures vs gold ETF — detailed comparison for Indian investors in 2026. Tax treatment, capital requirements, leverage, liquidity, SIP options, Budget 2024 LTCG change, and who should choose which.',
  keywords: [
    'MCX gold vs gold ETF India 2026',
    'gold ETF vs MCX gold futures India',
    'should I buy gold ETF or MCX gold',
    'gold ETF vs gold futures tax India',
    'MCX gold vs GOLDBEES India',
    'gold investment India 2026',
    'MCX gold vs SGB India',
    'gold ETF LTCG tax India 2026',
    'MCX gold mini vs gold ETF',
    'best way to invest in gold India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/gold-etf-vs-mcx-gold' },
  openGraph: {
    title: 'MCX Gold vs Gold ETF India 2026 — Complete Comparison | BhaavBrief',
    description: 'Tax, leverage, capital, liquidity, SIP — every factor compared. Who should use MCX gold futures vs gold ETF in India.',
    url: 'https://bhaavbrief.in/learn/gold-etf-vs-mcx-gold',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Gold+vs+Gold+ETF+India+2026&tags=LTCG+Tax,Leverage,SIP', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Gold vs Gold ETF India 2026 | BhaavBrief', description: 'Tax, leverage, capital, expiry — MCX gold vs gold ETF fully compared for Indian investors.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Gold+vs+Gold+ETF+India+2026&tags=LTCG+Tax,Leverage,SIP'] },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Gold vs Gold ETF' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Which is better — MCX gold or gold ETF in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'It depends on your purpose. MCX gold is better for active traders who want leverage (up to 16x), trade during evening hours (when US markets move), or need precise hedging of physical gold exposure. Gold ETF is better for long-term investors who want gold price exposure without leverage, expiry management, or the need to monitor daily. Gold ETF also offers 12.5% LTCG tax after 12 months (post Budget 2024), while MCX gold profits are always taxed at your income slab rate. For most retail investors without active trading bandwidth, Gold ETF is more practical.' },
    },
    {
      '@type': 'Question',
      name: 'How is MCX gold taxed vs gold ETF in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold futures profits are taxed as non-speculative business income at your income slab rate (up to 30%) regardless of holding period — there is no LTCG benefit. Gold ETF held for more than 12 months is taxed at 12.5% LTCG (post Budget 2024 change). Gold ETF held under 12 months is taxed at your slab rate. For a trader in the 30% slab holding gold for more than 12 months, Gold ETF is significantly more tax efficient than MCX gold.' },
    },
    {
      '@type': 'Question',
      name: 'What is the minimum investment for MCX gold vs gold ETF?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold Mini (100g lot) requires approximately ₹75,000–₹1.25 lakh in margin at current prices (~₹1,49,000/10g). The standard 1 kg Gold contract requires ₹7.5–12.5 lakh. Gold ETFs (e.g. GOLDBEES, Nippon Gold ETF) can be bought for as little as ₹50–100 per unit on NSE, or via Gold Fund of Funds SIP from ₹500/month without a demat account. Gold ETF has essentially no minimum investment barrier; MCX Gold Mini requires meaningful capital.' },
    },
    {
      '@type': 'Question',
      name: 'Can I do SIP in gold ETF but not MCX gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. Gold ETFs can be bought regularly through a demat account or via Gold Fund of Funds (FoF) through any MF platform (Kuvera, Groww, MF Central) with a SIP from ₹500/month — no demat account required for the FoF route. MCX gold has no SIP mechanism — each trade requires manual execution, margin management, and expiry monitoring. For disciplined long-term gold accumulation, Gold ETF FoF is far more suitable.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between Gold ETF and Gold Fund of Funds (FoF)?',
      acceptedAnswer: { '@type': 'Answer', text: 'Gold ETF trades on NSE like a stock — you need a demat and trading account to buy it. Each unit represents approximately 1 gram of gold. Gold Fund of Funds (FoF) is a mutual fund that invests in gold ETFs — you can buy it through any MF platform without a demat account, with SIP from ₹500. FoF has a slightly higher expense ratio than buying the ETF directly (typically 0.1–0.15% extra). Both track the same gold price; choose FoF if you don\'t have a demat account or prefer SIP automation.' },
    },
    {
      '@type': 'Question',
      name: 'Is SGB (Sovereign Gold Bond) better than MCX gold and Gold ETF?',
      acceptedAnswer: { '@type': 'Answer', text: 'SGB offers 2.5% p.a. interest (paid semi-annually) on top of gold price appreciation, and if held to maturity (8 years), redemption is completely tax-free — making it the most tax-efficient gold investment in India. However, SGBs have a very illiquid secondary market and a 5-year lock-in before early redemption. New SGB tranches are only issued periodically. For long-term investors (8+ year horizon) who can commit capital, SGB beats both Gold ETF and MCX gold on a tax-adjusted basis. For traders or those needing liquidity, Gold ETF or MCX gold are more suitable.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  const goldMiniCV  = p.gold * 10   // 100g mini lot contract value
  const goldStdCV   = p.gold * 100  // 1kg standard lot contract value
  const goldMiniMarginLo = Math.round(goldMiniCV * 0.05 / 1000) * 1000
  const goldMiniMarginHi = Math.round(goldMiniCV * 0.085 / 1000) * 1000
  const goldStdMarginLo  = Math.round(goldStdCV * 0.05 / 1000) * 1000
  const goldStdMarginHi  = Math.round(goldStdCV * 0.085 / 1000) * 1000

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 15, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-mono)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const greenText: React.CSSProperties = { color: '#1A7A1A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 36 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Gold vs Gold ETF</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Gold vs Gold ETF India 2026: Which Is Better For You?
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          MCX Gold at <strong style={{ color: '#18180F' }}>₹{fmt(p.gold)}/10g</strong> · {p.snapshotDate} · Covers Budget 2024 LTCG change
        </p>

        <p style={prose}>
          MCX gold futures and gold ETFs both track India&apos;s gold price — but they serve completely different purposes. MCX gold is a leveraged trading instrument with monthly expiry, margin calls, and slab-rate taxation. Gold ETF is a long-term investment product with no expiry, no leverage, SIP capability, and a favourable 12.5% LTCG tax after 12 months. Choosing the wrong one costs either opportunity or money — this guide maps every factor so you can decide.
        </p>

        {/* Master comparison table */}
        <h2 style={h2}>Side-by-side comparison</h2>
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Factor', 'MCX Gold Futures', 'Gold ETF / Gold FoF'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Purpose',              'Active trading, hedging physical gold',      'Long-term wealth accumulation'],
                ['Leverage',             '~14–20x (6–7% margin on contract value)',    'None (1x — price exposure only)'],
                ['Minimum capital',      `₹${fmt(goldMiniMarginLo)}–₹${fmt(goldMiniMarginHi)} (Gold Mini margin)`, '₹50–100 per unit; SIP from ₹500/month'],
                ['Expiry',               'Monthly — must roll or square off',          'None — hold indefinitely'],
                ['Tax (profit)',         'Income slab rate (up to 30%)',               '12.5% LTCG if held >12 months'],
                ['Tax (loss)',           'Carry forward 8 years (business loss)',      'Carry forward 8 years (capital loss)'],
                ['Account needed',       'MCX commodity trading account',              'Demat (ETF) or none (Gold FoF via MF)'],
                ['SIP possible',         'No',                                         'Yes — Gold FoF from ₹500/month'],
                ['Trading hours',        '9 AM – 11:30 PM IST (US market hours)',      '9:15 AM – 3:30 PM IST (NSE hours)'],
                ['Daily monitoring',     'Required (margin calls, MTM settlement)',    'Not required'],
                ['Physical delivery',    'Possible at expiry (compulsory if held)',    'Not available (paper gold)'],
                ['Dividend / interest',  'None',                                       'None (SGB gives 2.5% p.a. — see below)'],
                ['Expense ratio',        'Brokerage + CTT + exchange charges',         '0.05–0.20% p.a. (ETF); +0.1% for FoF'],
                ['Price vs gold parity', 'Near-perfect (tracks MCX spot)',             'Near-perfect (tracks MCX/LBMA gold)'],
              ].map(([factor, mcx, etf], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 500, color: '#48483A', fontSize: 12 }}>{factor}</td>
                  <td style={cell}>{mcx}</td>
                  <td style={cell}>{etf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          Gold ETF examples: GOLDBEES (Nippon), HDFCGOLD, ICICIGOLD (all on NSE). Gold FoF examples: Nippon India Gold Savings Fund, HDFC Gold Fund, SBI Gold Fund. At MCX Gold ₹{fmt(p.gold)}/10g as of {p.snapshotDate}.
        </p>

        {/* Live capital comparison */}
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Capital required — live numbers at ₹{fmt(p.gold)}/10g</div>
          <div style={{ overflowX: 'auto' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, lineHeight: 2.2, color: '#18180F', minWidth: 300 }}>
            MCX Gold Standard (1 kg):<br />
            {'  '}Contract value: {fmtValue(goldStdCV)}<br />
            {'  '}Margin needed:  ₹{fmt(goldStdMarginLo)} – ₹{fmt(goldStdMarginHi)}<br />
            <br />
            MCX Gold Mini (100g):<br />
            {'  '}Contract value: {fmtValue(goldMiniCV)}<br />
            {'  '}Margin needed:  ₹{fmt(goldMiniMarginLo)} – ₹{fmt(goldMiniMarginHi)}<br />
            <br />
            Gold ETF (GOLDBEES ~₹{fmt(Math.round(p.gold * 0.1))} per unit ≈ 1g gold):<br />
            {'  '}To own 1g gold: ~₹{fmt(Math.round(p.gold * 0.1))}<br />
            {'  '}To own 10g gold: ~₹{fmt(Math.round(p.gold))}<br />
            {'  '}SIP: from ₹500/month via Gold FoF
          </div>
          </div>
        </div>

        {/* Tax — the key differentiator */}
        <h2 style={h2}>Tax — the biggest real difference</h2>
        <p style={prose}>
          For most investors comparing MCX gold and Gold ETF, tax treatment is the deciding factor. The difference is significant and was made more favourable for Gold ETF investors by Budget 2024.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Scenario', 'MCX Gold', 'Gold ETF'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Profit, held <12 months',  'Slab rate (up to 30%)',   'Slab rate (up to 30%)'],
                ['Profit, held 12–36 months','Slab rate (up to 30%)',   '12.5% LTCG (post Budget 2024)'],
                ['Profit, held >36 months',  'Slab rate (up to 30%)',   '12.5% LTCG (no indexation)'],
                ['Loss carry forward',       '8 years (business loss)', '8 years (capital loss)'],
                ['Loss offsets salary',      'No',                       'No'],
                ['ITR form',                 'ITR-3 (business income)',  'ITR-2 or ITR-3 (capital gains)'],
              ].map(([scenario, mcx, etf], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 500, fontSize: 12 }}>{scenario}</td>
                  <td style={{ ...cell, color: i < 3 ? '#C83030' : '#18180F' }}>{mcx}</td>
                  <td style={{ ...cell, color: i < 3 ? '#1A7A1A' : '#18180F', fontWeight: i < 3 ? 500 : 400 }}>{etf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Budget 2024 Gold ETF change — what changed</div>
          <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            <strong>Before Budget 2024 (pre July 2024):</strong> Gold ETF had a 3-year LTCG holding period at 20% with indexation benefit.<br /><br />
            <strong>After Budget 2024 (from July 23, 2024):</strong> Gold ETF now qualifies for LTCG at <strong>12.5% after just 12 months</strong> — no indexation. The shorter holding period and lower rate make Gold ETF significantly more tax-efficient for medium-term investors.
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            <strong>Practical impact:</strong> A trader in the 30% slab who makes ₹5 lakh profit on gold pays ₹1.5 lakh tax via MCX. The same ₹5 lakh profit via Gold ETF held 12+ months pays only ₹62,500 — a saving of ₹87,500 on the same return.
          </p>
        </div>

        {/* Leverage comparison */}
        <h2 style={h2}>Leverage — where MCX gold changes the equation</h2>
        <p style={prose}>
          The fundamental difference between MCX gold and Gold ETF is leverage. With Gold ETF, a 1% rise in gold price gives you exactly 1% return on your investment. With MCX Gold Mini (at ~7% margin), the same 1% move gives a ~14% return on margin — but an adverse 1% move also costs ~14% of margin.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Gold moves', 'Gold ETF return', 'MCX Gold Mini return on margin', 'MCX Gold Mini P&L'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['+1%',  '+1%',   `+~${(1/0.07).toFixed(0)}%`, `+₹${fmt(Math.round(p.gold * 10 * 0.01))}`],
                ['+3%',  '+3%',   `+~${(3/0.07).toFixed(0)}%`, `+₹${fmt(Math.round(p.gold * 10 * 0.03))}`],
                ['+5%',  '+5%',   `+~${(5/0.07).toFixed(0)}%`, `+₹${fmt(Math.round(p.gold * 10 * 0.05))}`],
                ['−1%',  '−1%',   `−~${(1/0.07).toFixed(0)}%`, `−₹${fmt(Math.round(p.gold * 10 * 0.01))}`],
                ['−3%',  '−3%',   `−~${(3/0.07).toFixed(0)}%`, `−₹${fmt(Math.round(p.gold * 10 * 0.03))}`],
                ['−5%',  '−5%',   `−~${(5/0.07).toFixed(0)}% (margin call risk)`, `−₹${fmt(Math.round(p.gold * 10 * 0.05))}`],
              ].map(([move, etf, mcxPct, mcxPnl], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 600, color: i < 3 ? '#1A7A1A' : '#C83030' }}>{move}</td>
                  <td style={{ ...cell, color: i < 3 ? '#1A7A1A' : '#C83030' }}>{etf}</td>
                  <td style={{ ...cell, color: i < 3 ? '#1A7A1A' : '#C83030', fontWeight: 500 }}>{mcxPct}</td>
                  <td style={{ ...cell, color: i < 3 ? '#1A7A1A' : '#C83030' }}>{mcxPnl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>Based on Gold Mini (100g) at ₹{fmt(p.gold)}/10g, margin ≈ 7% of contract value = ₹{fmt(Math.round(p.gold * 10 * 0.07))}.</p>
        <p style={prose}>
          Leverage amplifies both gains and losses identically. A 5% adverse move on MCX Gold Mini wipes out 70%+ of your margin in a single session. In Gold ETF, a 5% fall simply reduces your NAV by 5% — painful, but not catastrophic, and no margin call forces you to sell at the worst time.
        </p>

        {/* Who should use which */}
        <h2 style={h2}>Who should use MCX gold vs Gold ETF</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Profile', 'Recommended', 'Reason'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Active trader, daily monitoring, risk capital available',         'MCX Gold Mini',       'Leverage, evening session (US markets), precise hedging'],
                ['Jeweller hedging gold purchase exposure',                          'MCX Gold Mini',       'Exact lot-size matching, professional hedging instrument'],
                ['Long-term investor (3–10 year horizon)',                           'Gold ETF or SGB',     '12.5% LTCG tax; no expiry management; SIP available'],
                ['Salaried investor, ₹1,000–₹10,000/month to allocate to gold',    'Gold FoF (SIP)',      'Auto-invest, no demat needed, fully liquid'],
                ['Investor with 8+ year horizon, can lock in capital',              'SGB',                 'Tax-free at maturity + 2.5% p.a. interest'],
                ['Beginner learning gold markets',                                   'Gold ETF, then MCX', 'Understand gold price drivers first; add MCX later'],
                ['Capital under ₹50,000',                                           'Gold ETF or Gold FoF','Insufficient for MCX Gold Mini margin at current prices'],
              ].map(([profile, rec, reason], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontSize: 12, color: '#48483A' }}>{profile}</td>
                  <td style={{ ...cell, ...accent }}>{rec}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SGB comparison */}
        <h2 style={h2}>Where does SGB (Sovereign Gold Bond) fit in?</h2>
        <p style={prose}>
          Sovereign Gold Bonds occupy a third category — neither trading instrument nor standard ETF. They are government securities that track gold price and pay 2.5% p.a. interest (taxed as income), with the redemption at maturity (8 years) being completely tax-free on the capital gain component.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['', 'MCX Gold', 'Gold ETF', 'SGB'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Tax at maturity (if held full term)', 'Slab rate', '12.5% LTCG', 'Tax-free'],
                ['Interest earned', 'None', 'None', '2.5% p.a.'],
                ['Liquidity', 'Very high (daily trading)', 'High (NSE daily)', 'Low (secondary market thin)'],
                ['Lock-in', 'None', 'None', '5 years (early redemption), 8 years (full maturity)'],
                ['Availability', 'Always (MCX listing)', 'Always (NSE listing)', 'Periodic RBI issuances only'],
                ['Minimum investment', `~₹${fmt(Math.round(p.gold * 10 * 0.07))} margin`, '~₹100 per unit', '1 gram minimum (~₹{fmt(Math.round(p.gold * 0.1))})'],
              ].map(([label, mcx, etf, sgb], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 500, fontSize: 12 }}>{label}</td>
                  <td style={cell}>{mcx}</td>
                  <td style={cell}>{etf}</td>
                  <td style={{ ...cell, ...greenText }}>{sgb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          SGB is the most tax-efficient gold investment for an investor with an 8-year horizon — but it requires capital to be locked in and new issuances are periodic (not always available). Check the RBI calendar for upcoming SGB tranches. Secondary market SGB prices on NSE often trade at a premium to face value near issuance and at a discount during quiet periods.
        </p>

        {/* Operating costs */}
        <h2 style={h2}>Operating costs: MCX gold vs Gold ETF</h2>
        <p style={prose}>
          Beyond the price exposure, the annual drag from operating costs differs significantly:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Cost type', 'MCX Gold Mini (active trader)', 'Gold ETF (buy and hold)'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['CTT', '0.01% on every sell trade', 'Not applicable'],
                ['Brokerage', '₹20–50/trade or 0.03% (varies)', 'Negligible (standard equity brokerage)'],
                ['Rollover cost (contango)', '~₹{fmt(goldMiniRoll * 12)}/year per lot', 'None'],
                ['Annual management fee', 'None (no fund manager)', '0.05–0.20% p.a. expense ratio'],
                ['Bid-ask spread', 'Tight (MCX liquid)', 'Very tight (GOLDBEES ~0.01%)'],
                ['Total annual drag estimate', '~0.5–2.5% depending on trading frequency', '~0.05–0.20% for ETF; +0.10% for FoF'],
              ].map(([cost, mcx, etf], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 500, fontSize: 12 }}>{cost}</td>
                  <td style={cell}>{mcx}</td>
                  <td style={{ ...cell, ...greenText }}>{etf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          For a pure long-term gold investor, Gold ETF has a dramatically lower cost structure. MCX gold costs are justified only when leverage, precise hedging, or evening-session price discovery is needed — not for passive exposure.
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
            <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>← Learn hub</Link>
            <Link href="/learn/mcx-gold-contracts" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>MCX Gold contracts →</Link>
            <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>Margin calculation →</Link>
            <Link href="/learn/mcx-commodity-tax-india" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>MCX tax guide →</Link>
            <Link href="/commodities/gold" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>Gold live price →</Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_gold-etf-vs-mcx-gold" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Last updated {p.snapshotDate}
        </p>
      </div>
    </>
  )
}

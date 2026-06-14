import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'

interface Prices {
  gold: number
  crude: number
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
        crude:        i.MCX_CRUDE?.price ?? 8300,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
      }
    }
  } catch { /* fall through */ }
  return { gold: 149000, crude: 8300, snapshotDate: 'Jun 2026' }
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
  title: 'MCX Commodity Trading Tax in India 2026: Complete Guide (ITR-3, CTT, Audit)',
  description: 'How MCX commodity futures trading is taxed in India in 2026. Non-speculative business income, ITR-3 filing, CTT, deductible expenses, turnover calculation, audit threshold, loss carry forward — explained clearly.',
  keywords: [
    'MCX commodity trading tax India 2026',
    'MCX futures income tax India',
    'CTT commodity transaction tax India',
    'commodity trading ITR-3 filing India',
    'MCX trading profit tax rate India',
    'non-speculative business income MCX',
    'commodity futures tax audit India',
    'MCX trading loss carry forward India',
    'deductible expenses commodity trading India',
    'advance tax commodity trading India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-commodity-tax-india' },
  openGraph: {
    title: 'MCX Commodity Trading Tax India 2026 — ITR-3, CTT & Audit Guide | BhaavBrief',
    description: 'Complete MCX tax guide: how futures profits are taxed, ITR-3 filing, CTT deduction, turnover calculation, audit threshold, and loss carry forward rules.',
    url: 'https://bhaavbrief.in/learn/mcx-commodity-tax-india',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'MCX Commodity Tax India 2026 | BhaavBrief', description: 'ITR-3, CTT, audit threshold, loss carry forward — complete MCX trading tax guide for Indian traders.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Commodity Tax India' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is MCX commodity trading taxed in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX commodity futures profits are taxed as non-speculative business income under the head "Profits and Gains from Business or Profession" at your applicable income slab rate. There is no LTCG (long-term capital gains) treatment regardless of how long you held the position. You must file ITR-3 and maintain books of accounts. Losses can be carried forward for 8 years and offset against future non-speculative business income.' },
    },
    {
      '@type': 'Question',
      name: 'What is CTT in commodity trading India?',
      acceptedAnswer: { '@type': 'Answer', text: 'CTT (Commodity Transaction Tax) is a statutory tax levied at 0.01% on the sell value of non-agricultural commodity futures on MCX — gold, silver, crude oil, copper, and natural gas. It is deducted automatically by your broker on every sell trade and appears in your contract note. CTT is fully deductible as a business expense when computing taxable income from commodity trading. Agricultural commodities on NCDEX are exempt from CTT.' },
    },
    {
      '@type': 'Question',
      name: 'Which ITR form should commodity traders file?',
      acceptedAnswer: { '@type': 'Answer', text: 'Commodity futures traders must file ITR-3 (not ITR-1, ITR-2, or ITR-4). ITR-3 is mandatory because commodity futures gains are classified as business income. You cannot use ITR-4 (Sugam/presumptive tax) for commodity futures. You need to report under Schedule BP (Business and Profession), Schedule CFL (Carry Forward of Losses), and disclose trading account details. Most commodity traders should use a CA familiar with F&O taxation.' },
    },
    {
      '@type': 'Question',
      name: 'How is commodity trading turnover calculated for tax audit?',
      acceptedAnswer: { '@type': 'Answer', text: 'For commodity futures, turnover for tax audit purposes = the absolute sum of all profits and losses on all trades during the financial year. Example: you made ₹8 lakh profit on some trades and ₹5 lakh loss on others — your turnover is ₹13 lakh (₹8L + ₹5L), not ₹3L net. If this turnover exceeds ₹10 crore, a tax audit under Section 44AB is mandatory. Below ₹10 crore, an audit is required only if you declare a loss or profit below 6% of turnover.' },
    },
    {
      '@type': 'Question',
      name: 'Can I set off MCX commodity trading losses against salary income?',
      acceptedAnswer: { '@type': 'Answer', text: 'No. MCX commodity futures losses (classified as non-speculative business losses) cannot be set off against salary income in the same year. They can only be set off against other non-speculative business income in the current year. Unutilised losses can be carried forward for 8 years and set off against non-speculative business income in those future years. To carry forward losses, you must file ITR-3 before the due date (typically 31 July, or 31 October with audit).' },
    },
    {
      '@type': 'Question',
      name: 'What expenses can commodity traders deduct in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'Commodity traders can deduct: CTT (auto-deducted by broker), brokerage and exchange transaction charges, GST paid on brokerage, SEBI turnover fees, stamp duty, internet and data subscription costs used for trading, a portion of electricity bills if trading from home, Bloomberg/Reuters/trading platform subscriptions, professional fees (CA, tax advisor), and depreciation on trading hardware/software. Keep receipts and contract notes — the deductibility of some items (home office, equipment) requires proper documentation.' },
    },
    {
      '@type': 'Question',
      name: 'Is advance tax applicable on commodity trading profits?',
      acceptedAnswer: { '@type': 'Answer', text: 'Yes. If your estimated tax liability (after TDS) exceeds ₹10,000 in a financial year, you must pay advance tax in instalments: 15% by 15 June, 45% by 15 September, 75% by 15 December, and 100% by 15 March. Failure to pay advance tax results in interest charges under Section 234B (1% per month on shortfall) and Section 234C (1% per month on each instalment shortfall). Commodity traders with profitable mid-year results should estimate their tax liability and pay advance tax quarterly.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  const goldMiniCV   = p.gold * 10
  const goldCTT      = Math.round(goldMiniCV * 0.0001)
  const crudeStdCV   = p.crude * 100
  const crudeCTT     = Math.round(crudeStdCV * 0.0001)

  // worked example trader
  const traderProfits  = 850000
  const traderLosses   = 380000
  const traderNet      = traderProfits - traderLosses
  const traderTurnover = traderProfits + traderLosses
  const traderExpenses = 42000
  const traderTaxable  = traderNet - traderExpenses
  const traderTax30    = Math.round(traderTaxable * 0.30)

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 13, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-mono)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #E05C00', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
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
          <span style={{ color: '#18180F' }}>MCX Commodity Tax India</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Commodity Trading Tax in India 2026: Complete Guide
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginBottom: 24 }}>
          Covers ITR-3 filing · CTT deduction · Turnover calculation · Audit threshold · Loss carry forward
        </p>

        <p style={prose}>
          MCX commodity futures profits are taxed as <strong>non-speculative business income</strong> — at your income slab rate, with no LTCG benefit, and mandatory ITR-3 filing. This guide covers every aspect of MCX taxation: how profits and losses are treated, what you can deduct, when a tax audit is required, how to pay advance tax, and the correct ITR-3 schedule to file.
        </p>

        {/* Quick reference table */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Instrument', 'Tax head', 'Tax rate', 'Loss offset', 'Carry forward', 'ITR form'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['MCX Commodity Futures', 'Non-speculative business income', 'Slab rate', 'Non-speculative business income only', '8 years', 'ITR-3'],
                ['Equity F&O (NSE/BSE)', 'Non-speculative business income', 'Slab rate', 'Non-speculative business income only', '8 years', 'ITR-3'],
                ['Intraday equity', 'Speculative business income', 'Slab rate', 'Speculative income only', '4 years', 'ITR-3'],
                ['Gold ETF (held >12 months)', 'Long-term capital gains', '12.5% (no indexation)', 'LTCG from other assets', '8 years', 'ITR-2 or ITR-3'],
                ['NCDEX agri futures', 'Non-speculative business income', 'Slab rate', 'Non-speculative business income', '8 years', 'ITR-3'],
              ].map(([inst, head, rate, offset, cf, itr], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#C8720A' : '#18180F' }}>{inst}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{head}</td>
                  <td style={cell}>{rate}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{offset}</td>
                  <td style={cell}>{cf}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{itr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          Tax rates applicable for FY 2025-26 / AY 2026-27. Consult a CA for your specific situation — slab rates depend on total income including all sources.
        </p>

        {/* Tax classification */}
        <h2 style={h2}>How MCX futures profits are classified for tax</h2>
        <p style={prose}>
          Section 43(5) of the Income Tax Act governs the classification of trading activity. MCX commodity futures are explicitly carved out as <strong>non-speculative transactions</strong> — which means they are treated as business income, not capital gains and not speculative income.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Why &quot;non-speculative&quot; matters</div>
          <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            The non-speculative classification is more favourable than speculative (which would limit loss offsets to speculative income only for 4 years). Non-speculative business losses can be set off against any other non-speculative business income in the current year, and carried forward for 8 years.
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            However, <strong>non-speculative losses cannot be set off against salary income</strong>. A salaried employee who trades MCX and makes a loss cannot reduce their salary tax liability with those trading losses — in the current year.
          </p>
        </div>
        <p style={prose}>
          The tax rate is your marginal income slab rate — 0%, 5%, 20%, or 30% depending on your total income from all sources. A trader in the 30% slab pays 30% on net commodity trading profits (after deducting all eligible expenses). There is no reduced rate for holding periods, no LTCG exemption limit, and no indexation benefit.
        </p>

        {/* ITR-3 filing */}
        <h2 style={h2}>Filing ITR-3: what commodity traders must do</h2>
        <p style={prose}>
          All commodity futures traders — whether profitable or not — must file <strong>ITR-3</strong>. This applies even if commodity trading is a side activity alongside salaried employment. Filing ITR-1 or ITR-2 when you have commodity futures income is technically incorrect and can attract scrutiny.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['ITR-3 schedule', 'What to report', 'Source documents'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Schedule BP', 'Net profit/loss from commodity trading — income minus all eligible deductions', 'Broker P&L statement, contract notes'],
                ['Schedule CFL', 'Carry forward of losses to next year (if net loss this year)', 'Prior year ITR acknowledgment'],
                ['Schedule BFLA', 'Set off of brought forward losses from prior years', 'Prior year CFL details'],
                ['Schedule OTH', 'Other income: salary, interest, rental — all sources combined', 'Form 16, bank statements'],
                ['Balance Sheet & P&L', 'Mandatory if turnover > ₹25 lakh or audit applicable', 'Annual account statements from broker'],
                ['Tax Audit Report (3CA/3CB + 3CD)', 'Required if audit triggered — filed by CA', 'All trading and bank records'],
              ].map(([sched, what, docs], i) => (
                <tr key={i}>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#C8720A' }}>{sched}</td>
                  <td style={{ ...cell, fontSize: 13 }}>{what}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{docs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={warnBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E05C00', marginBottom: 8 }}>Deadline — do not miss</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            <strong>31 July</strong> — ITR-3 due date for traders not requiring a tax audit.<br />
            <strong>31 October</strong> — Extended due date for traders requiring a tax audit (audit report must be filed by 30 September).<br /><br />
            Missing the deadline means you <strong>cannot carry forward losses</strong> — one of the most valuable benefits for loss-making commodity traders. File on time even if you have a loss.
          </p>
        </div>

        {/* Turnover calculation */}
        <h2 style={h2}>Turnover calculation for commodity futures</h2>
        <p style={prose}>
          Turnover for MCX trading — as per ICAI guidance — is the <strong>absolute sum of all profits and all losses</strong> across every trade during the financial year. It is not gross receipts (sell value), and it is not net profit.
        </p>
        <div style={{ background: '#F3F2EC', padding: '16px 20px', marginBottom: 24, fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2, color: '#18180F' }}>
          Trade 1: +₹45,000 profit<br />
          Trade 2: −₹28,000 loss<br />
          Trade 3: +₹12,000 profit<br />
          Trade 4: −₹8,000 loss<br />
          ─────────────────────────<br />
          Net profit: +₹21,000<br />
          <strong>Turnover: ₹45,000 + ₹28,000 + ₹12,000 + ₹8,000 = ₹93,000</strong><br />
          <br />
          Note: turnover is ₹93,000, not ₹21,000 (net) or any sell-side figure.
        </div>
        <p style={prose}>
          For most retail traders who trade Gold Mini and Crude Mini in moderate quantities, annual turnover will be far below ₹10 crore. A trader making 100 round trips on Gold Mini per year generates turnover of approximately ₹50–₹80 lakh in absolute P&L — still well under the audit threshold.
        </p>

        {/* Tax audit threshold */}
        <h2 style={h2}>Tax audit threshold — Section 44AB</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Turnover', 'Net profit declared', 'Audit required?'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Below ₹10 crore', '≥ 6% of turnover', 'No audit required'],
                ['Below ₹10 crore', 'Loss (any amount)', 'Audit required under Section 44AB'],
                ['Below ₹10 crore', 'Profit but < 6% of turnover', 'Audit required under Section 44AB'],
                ['₹10 crore or above', 'Any result', 'Audit mandatory — Section 44AB'],
              ].map(([turnover, profit, audit], i) => (
                <tr key={i}>
                  <td style={cell}>{turnover}</td>
                  <td style={cell}>{profit}</td>
                  <td style={{ ...cell, color: audit.includes('No') ? '#1A7A1A' : '#C8720A', fontWeight: 500 }}>{audit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          The 6% rule catches many traders off guard. If your turnover is ₹50 lakh and you declare a net profit of ₹2 lakh (4% of turnover), a tax audit is required even though your turnover is modest. The 6% presumptive profit threshold was originally designed for businesses, and its application to commodity traders is a common source of unexpected audit obligations.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Practical implication</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            If you have a loss year, file ITR-3 with the loss declared <em>and</em> arrange a tax audit. The cost of a CA for an audit (typically ₹5,000–₹20,000 for small traders) is worth it to preserve the 8-year loss carry forward — which can offset future profitable years&apos; income.
          </p>
        </div>

        {/* Loss carry forward */}
        <h2 style={h2}>MCX trading losses — carry forward rules</h2>
        <p style={prose}>
          Commodity futures losses are non-speculative business losses and can be carried forward for <strong>8 assessment years</strong>. Here is exactly what can and cannot be done with them:
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Income type', 'Can MCX loss offset it?', 'Current year', 'Future years (carry forward)'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Salary / pension',              'No', 'No', 'No'],
                ['Other MCX / F&O profits',       'Yes', 'Yes', 'Yes (8 years)'],
                ['Freelancing / consulting income','Yes', 'Yes', 'Yes (8 years)'],
                ['Business income (other)',        'Yes', 'Yes', 'Yes (8 years)'],
                ['Speculative income (intraday)',  'No', 'No', 'No'],
                ['Capital gains (equity/ETF)',     'No', 'No', 'No'],
                ['Interest / dividend income',     'No', 'No', 'No'],
              ].map(([income, can, curr, future], i) => (
                <tr key={i}>
                  <td style={cell}>{income}</td>
                  <td style={{ ...cell, color: can === 'Yes' ? '#1A7A1A' : '#C83030', fontWeight: 500 }}>{can}</td>
                  <td style={{ ...cell, color: curr === 'Yes' ? '#1A7A1A' : '#C83030' }}>{curr}</td>
                  <td style={{ ...cell, color: future.startsWith('Yes') ? '#1A7A1A' : '#C83030' }}>{future}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          A salaried employee who trades MCX on the side and incurs losses cannot use those losses to reduce their salary tax in the current year. However, if in a future year they earn consulting income or their MCX trading becomes profitable, the carried-forward losses can then be offset — saving significant tax.
        </p>

        {/* CTT */}
        <h2 style={h2}>CTT (Commodity Transaction Tax) — rates, calculation & deduction</h2>
        <p style={prose}>
          CTT is levied at <strong>0.01% on the sell value</strong> of every non-agricultural commodity futures trade on MCX. It is collected by your broker at the time of the sell trade and appears on every contract note.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Sell value (1 lot)', 'CTT (0.01%)', 'Round-trip CTT', 'Monthly cost (100 round trips)'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Gold Mini (100g)',
                  sellVal: fmtValue(goldMiniCV),
                  ctt: `₹${fmt(goldCTT)}`,
                  rtCTT: `₹${fmt(goldCTT)}`,
                  monthly: `₹${fmt(goldCTT * 100)}`,
                },
                {
                  name: 'Gold Standard (1 kg)',
                  sellVal: fmtValue(goldMiniCV * 10),
                  ctt: `₹${fmt(goldCTT * 10)}`,
                  rtCTT: `₹${fmt(goldCTT * 10)}`,
                  monthly: `₹${fmt(goldCTT * 10 * 100)}`,
                },
                {
                  name: 'Crude Oil (100 bbl)',
                  sellVal: fmtValue(crudeStdCV),
                  ctt: `₹${fmt(crudeCTT)}`,
                  rtCTT: `₹${fmt(crudeCTT)}`,
                  monthly: `₹${fmt(crudeCTT * 100)}`,
                },
                {
                  name: 'Crude Mini (10 bbl)',
                  sellVal: fmtValue(crudeStdCV / 10),
                  ctt: `₹${fmt(Math.round(crudeCTT / 10))}`,
                  rtCTT: `₹${fmt(Math.round(crudeCTT / 10))}`,
                  monthly: `₹${fmt(Math.round(crudeCTT / 10) * 100)}`,
                },
              ].map(({ name, sellVal, ctt, rtCTT, monthly }, i) => (
                <tr key={i}>
                  <td style={cell}>{name}</td>
                  <td style={{ ...cell, ...accent }}>{sellVal}</td>
                  <td style={cell}>{ctt}</td>
                  <td style={cell}>{rtCTT}</td>
                  <td style={{ ...cell, color: '#C8720A' }}>{monthly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>
          CTT at current prices: Gold ₹{fmt(p.gold)}/10g · Crude ₹{fmt(p.crude)}/bbl as of {p.snapshotDate}. CTT is only on sell trades, not buys — one round trip = one CTT payment.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>CTT deductibility — how to claim it</div>
          <p style={{ margin: '0 0 10px', fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            CTT is deductible as a business expense under Section 36(1)(xv) of the Income Tax Act — just like STT is deductible for equity traders. Your broker&apos;s annual contract note summary or P&L statement shows total CTT paid for the year.
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            In ITR-3 Schedule BP, CTT goes under &quot;Other deductions&quot; — not under &quot;taxes paid.&quot; Confirm placement with your CA; incorrect reporting is a common error in self-filed returns.
          </p>
        </div>

        {/* All transaction charges */}
        <h2 style={h2}>Complete MCX transaction charges table</h2>
        <p style={prose}>
          Beyond CTT, every MCX trade incurs several other statutory and exchange charges. All are deductible as business expenses.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Charge', 'Rate', 'Applied on', 'Deductible in ITR-3'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['CTT',                            '0.01%',     'Sell value — non-agri MCX futures only',   'Yes — Section 36(1)(xv)'],
                ['MCX Exchange Transaction Charge', '~0.0026%',  'Buy + Sell value (both legs)',             'Yes — business expense'],
                ['SEBI Turnover Fee',               '0.0001%',   'Buy + Sell value (both legs)',             'Yes — business expense'],
                ['GST on brokerage & charges',      '18%',       'On brokerage and exchange charges',        'Yes — business expense'],
                ['Stamp Duty',                      '0.002%',    'Buy side only',                            'Yes — business expense'],
                ['STT',                             'Nil',       'Not applicable to commodity futures',      'N/A'],
                ['Brokerage',                       'Varies',    'Per trade — broker-specific',              'Yes — business expense'],
              ].map(([charge, rate, on, ded], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{charge}</strong></td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{rate}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{on}</td>
                  <td style={{ ...cell, color: ded.startsWith('Yes') ? '#1A7A1A' : '#8A8A7A', fontWeight: ded.startsWith('Yes') ? 500 : 400 }}>{ded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>Exchange charges are approximate and subject to MCX revision. Check MCX website or your broker&apos;s charge schedule for current rates.</p>

        {/* Deductible expenses */}
        <h2 style={h2}>Deductible expenses checklist for MCX traders</h2>
        <p style={prose}>
          Beyond statutory charges, commodity traders can deduct all ordinary and necessary business expenses incurred to carry on the trading activity. Keep receipts — the burden of proof is on the taxpayer.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Expense', 'Deductible?', 'Notes'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Brokerage, CTT, exchange charges', 'Yes — fully', 'Directly stated in contract notes; include all statutory charges'],
                ['Internet / broadband subscription', 'Yes — proportionate', 'If used for trading; full deduction if dedicated line, else proportionate'],
                ['Bloomberg / Reuters terminal', 'Yes — fully', 'Professional data subscriptions used for trading decisions'],
                ['BhaavBrief or other MCX data subscriptions', 'Yes — fully', 'Commodity research and data tools are deductible'],
                ['Trading platform / charting software', 'Yes — fully', 'Annual subscriptions to TradingView, Kite premium, etc.'],
                ['CA / tax professional fees', 'Yes — fully', 'Fees paid for ITR-3 preparation and tax audit'],
                ['Mobile phone bill', 'Yes — proportionate', 'Proportion used for trading; estimate and maintain documentation'],
                ['Laptop / desktop depreciation', 'Yes — under Section 32', 'Depreciation at 40% on WDV; proportionate if also used personally'],
                ['Home office electricity', 'Yes — proportionate', 'If you trade from a dedicated home office space'],
                ['Books, courses, research on commodity trading', 'Yes — fully', 'Professional development expenses directly related to trading activity'],
                ['Interest on loan taken for margin money', 'Yes — fully', 'If you borrowed funds specifically to fund margin requirements'],
              ].map(([expense, ded, notes], i) => (
                <tr key={i}>
                  <td style={cell}>{expense}</td>
                  <td style={{ ...cell, color: '#1A7A1A', fontWeight: 500 }}>{ded}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Advance tax */}
        <h2 style={h2}>Advance tax for commodity traders</h2>
        <p style={prose}>
          If your estimated annual tax liability exceeds ₹10,000, you must pay advance tax in four instalments. Failure to do so results in interest under Sections 234B and 234C — even if you pay the full tax before the July filing deadline.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Instalment', 'Due date', 'Cumulative % of estimated tax', 'Interest for shortfall'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['1st instalment', '15 June', '15%',  'Section 234C: 1%/month on shortfall'],
                ['2nd instalment', '15 September', '45%', 'Section 234C: 1%/month on shortfall'],
                ['3rd instalment', '15 December', '75%', 'Section 234C: 1%/month on shortfall'],
                ['4th instalment', '15 March', '100%',  'Section 234C: 1%/month on shortfall'],
                ['Final (if any)', '31 July (with ITR)', '—', 'Section 234B: 1%/month from April 1'],
              ].map(([inst, due, pct, interest], i) => (
                <tr key={i}>
                  <td style={cell}>{inst}</td>
                  <td style={{ ...cell, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{due}</td>
                  <td style={{ ...cell, ...accent }}>{pct}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{interest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>Commodity trading advance tax challenge</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#18180F' }}>
            Commodity trading income is inherently lumpy and unpredictable. A trader who earns ₹10 lakh in Q1 but breaks even for the rest of the year may have over-paid advance tax. You can revise your advance tax estimate each quarter — pay what you realistically expect to owe, not a fixed proportion of early profits. Any excess advance tax is refunded (with interest at 6% p.a. under Section 244A).
          </p>
        </div>

        {/* Worked example */}
        <h2 style={h2}>Worked example: full-year MCX tax calculation</h2>
        <p style={prose}>
          Here is a complete tax calculation for a typical retail MCX trader in FY 2025-26.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <div style={{ background: '#F3F2EC', padding: '20px 24px', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2.1, color: '#18180F', minWidth: 360 }}>
          <div style={{ marginBottom: 12, fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A7A', fontWeight: 600 }}>Trader profile: Salaried (₹18L/year) + MCX trading on the side</div>
          <strong>Gross trading profits (all winning trades):</strong>  ₹{fmt(traderProfits)}<br />
          <strong>Gross trading losses (all losing trades):</strong>    ₹{fmt(traderLosses)}<br />
          ─────────────────────────────────────────────────────<br />
          <strong>Net trading P&amp;L:</strong>                         ₹{fmt(traderNet)}<br />
          <strong>Turnover (₹{fmt(traderProfits)} + ₹{fmt(traderLosses)}):</strong>  ₹{fmt(traderTurnover)}<br />
          <br />
          <strong>Deductible expenses:</strong><br />
          &nbsp;&nbsp;CTT + exchange charges:   ₹18,000<br />
          &nbsp;&nbsp;Brokerage + GST:          ₹14,000<br />
          &nbsp;&nbsp;Data + platform subs:     ₹10,000<br />
          &nbsp;&nbsp;Total expenses:           ₹{fmt(traderExpenses)}<br />
          ─────────────────────────────────────────────────────<br />
          <strong>Taxable trading income:</strong>                       ₹{fmt(traderTaxable)}<br />
          <br />
          <strong>Salary income:</strong>                               ₹18,00,000<br />
          <strong>Total taxable income (salary + MCX):</strong>         ₹{fmt(1800000 + traderTaxable)}<br />
          <br />
          Income above ₹15L is taxed at 30% (new regime):<br />
          <strong>Marginal tax on MCX income (at 30%):</strong>         ₹{fmt(traderTax30)}<br />
          <br />
          <strong>Audit required?</strong> Turnover ₹{fmt(traderTurnover)} &lt; ₹10Cr; profit {((traderNet/traderTurnover)*100).toFixed(1)}% of turnover &gt; 6% → <strong>No audit needed.</strong>
        </div>
        </div>
        <p style={{ ...sub, marginBottom: 24 }}>
          This is illustrative. Actual tax depends on your slab, deductions under Chapter VIA, and other income. Consult a CA for your specific filing.
        </p>

        {/* Agricultural vs non-agricultural */}
        <h2 style={h2}>MCX vs NCDEX: the CTT difference</h2>
        <p style={prose}>
          Agricultural commodity futures — traded primarily on NCDEX (chana, turmeric, soybean, wheat, jeera) — are <strong>exempt from CTT</strong>. This is a deliberate policy choice to keep costs low for agricultural hedgers.
        </p>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Category', 'Examples', 'Exchange', 'CTT applicable?', 'Tax treatment'].map(h => <th key={h} style={hcell}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[
                ['Non-agricultural (metals, energy)', 'Gold, Silver, Crude, Copper, NatGas', 'MCX', 'Yes — 0.01% on sell', 'Non-speculative business income'],
                ['Agricultural commodities', 'Chana, Turmeric, Jeera, Soybean, Wheat', 'NCDEX', 'No — exempt', 'Non-speculative business income'],
              ].map(([cat, ex, exch, ctt, tax], i) => (
                <tr key={i}>
                  <td style={cell}><strong>{cat}</strong></td>
                  <td style={{ ...cell, fontSize: 12 }}>{ex}</td>
                  <td style={cell}>{exch}</td>
                  <td style={{ ...cell, color: i === 0 ? '#C8720A' : '#1A7A1A', fontWeight: 500 }}>{ctt}</td>
                  <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>{tax}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={prose}>
          Both non-agricultural MCX and agricultural NCDEX futures are treated identically under income tax — non-speculative business income taxed at slab rate with 8-year loss carry forward. The CTT difference affects only your transaction costs, not the income tax treatment.
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
            <Link href="/learn" style={{ fontSize: 13, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>
              ← Learn hub
            </Link>
            <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX lot sizes →
            </Link>
            <Link href="/learn/mcx-margin-calculation" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              MCX margin calculation →
            </Link>
            <Link href="/markets" style={{ fontSize: 13, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              Live MCX prices →
            </Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-commodity-tax-india" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
          This guide is for informational purposes only and does not constitute tax advice. Tax laws change — consult a CA familiar with F&amp;O and commodity taxation for your specific filing.
        </p>
      </div>
    </>
  )
}

'use client'
import { useState } from 'react'

interface Article {
  id: number
  section: string
  title: string
  label: string
  content: React.ReactNode
}

const ARTICLES: Article[] = [
  {
    id: 0,
    section: 'MCX Basics',
    title: 'What is MCX?',
    label: 'MCX Basics · Article 1 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Multi Commodity Exchange of India (MCX) is India&apos;s largest commodity derivatives exchange. Launched in 2003 and regulated by SEBI, it allows traders, hedgers, and investors to trade standardised contracts on commodities ranging from gold and crude oil to pepper and cardamom.
        </p>
        <InfoBox title="Key fact">
          MCX handles over 98% of India&apos;s commodity futures trading volume. It operates from 9 AM to 11:30 PM IST, giving Indian traders access to global commodity movements in near-real time.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 24 }}>
          Unlike equity markets where you buy a share of a company, on MCX you trade a <em>contract</em> — an agreement to buy or sell a fixed quantity of a commodity at a set price on a future date. Most retail traders never take physical delivery; they square off their position before expiry.
        </p>
        <ArticleTable
          headers={['Commodity', 'Lot Size', 'Approx Margin', 'Expiry']}
          rows={[
            ['Gold', '1 kg', '₹1.5–2L', 'Last day of month'],
            ['Gold Mini', '100 g', '₹15–20K', 'Last day of month'],
            ['Silver', '30 kg', '₹2.8–3.5L', 'Last day of month'],
            ['Crude Oil', '100 bbl', '₹45–60K', '19th of month'],
            ['Crude Mini', '10 bbl', '₹4.5–6K', '19th of month'],
            ['Copper', '2.5 MT', '₹25–35K', 'Last day of month'],
            ['Nat Gas', '1250 mmBtu', '₹15–22K', '25th of month'],
          ]}
        />
      </>
    ),
  },
  {
    id: 1,
    section: 'MCX Basics',
    title: 'How futures work',
    label: 'MCX Basics · Article 2 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          A futures contract is a legally binding agreement to buy or sell a specific quantity of a commodity at a predetermined price on a future date. On MCX, these contracts are standardised — the exchange defines the quantity, quality, and delivery terms.
        </p>
        <InfoBox title="Simple example">
          You buy 1 lot of MCX Gold (1 kg) at ₹1,59,000. If price rises to ₹1,61,000, you make ₹2,000. If it falls to ₹1,57,000, you lose ₹2,000. You can exit anytime before expiry — no physical gold changes hands.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          The key mechanics: you pay only a margin (5–8% of contract value) to control the full contract. This leverage amplifies both gains and losses. Mark-to-market (MTM) settlement happens daily — profits credited, losses debited from your account every evening at the end of the trading session.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Two participants drive every trade: <strong>hedgers</strong> (jewellers, oil companies, farmers protecting against price risk) and <strong>speculators</strong> (traders seeking profit from price movements). This interplay creates liquidity and price discovery.
        </p>
      </>
    ),
  },
  {
    id: 2,
    section: 'MCX Basics',
    title: 'Lot sizes & expiry',
    label: 'MCX Basics · Article 3 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Every MCX contract has a fixed lot size — the minimum quantity you must trade. You cannot trade half a lot. Understanding lot sizes is critical for position sizing and risk management.
        </p>
        <InfoBox title="Rollover explained">
          When a contract nears expiry, traders &quot;roll over&quot; to the next month&apos;s contract — selling the near month and buying the far month simultaneously. Watch for rollover costs (the spread between months) as they affect your effective trade price.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Expiry dates vary by commodity. Crude oil expires on the 19th of each month (or the prior trading day). Gold and silver expire on the last trading day of the month. Natural gas expires on the 25th. Always check MCX&apos;s official calendar before holding positions close to expiry — the last 2-3 days see extreme volatility.
        </p>
      </>
    ),
  },
  {
    id: 3,
    section: 'Trading',
    title: 'Margin & leverage',
    label: 'Trading · Article 1 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Margin is the collateral you deposit with your broker to hold an open futures position. MCX sets initial margin requirements (typically 4–8% of contract value). Your broker may add their own exposure margin on top.
        </p>
        <InfoBox title="Margin call risk">
          If your account balance falls below the maintenance margin level, you receive a margin call — you must add funds immediately or your broker will square off your position at a loss. Always keep buffer capital beyond the minimum margin.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Leverage is a double-edged sword. A 5% margin means 20x leverage — a 1% move in commodity price equals a 20% gain or loss on your margin. Professional traders never risk more than 1–2% of capital on a single trade regardless of conviction.
        </p>
        <ArticleTable
          headers={['Contract', 'Contract Value', 'Margin ~5%', 'Impact of 1% move']}
          rows={[
            ['Gold (1 kg)', '₹1,59,000', '₹7,950', '₹1,590 gain/loss'],
            ['Silver (30 kg)', '₹28,24,500', '₹1,41,225', '₹28,245 gain/loss'],
            ['Crude (100 bbl)', '₹6,28,400', '₹31,420', '₹6,284 gain/loss'],
          ]}
        />
      </>
    ),
  },
  {
    id: 4,
    section: 'Trading',
    title: 'Reading MCX prices',
    label: 'Trading · Article 2 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          MCX prices are quoted in Indian Rupees per unit — but the unit varies by commodity. Gold is ₹ per 10 grams, silver is ₹ per kilogram, crude is ₹ per barrel, copper is ₹ per kilogram, and natural gas is ₹ per mmBtu.
        </p>
        <InfoBox title="The basis — understanding MCX vs COMEX">
          MCX Gold price ≠ COMEX Gold converted directly. The MCX price includes the COMEX spot price + import duty + GST + local demand premium. Formula: MCX Gold ≈ (COMEX ÷ 31.1035) × 10 × USD/INR × (1 + duty + GST). When the actual MCX price deviates significantly from this theoretical value, it signals strong local buying or selling pressure.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Similarly for silver: MCX Silver (₹/kg) = (COMEX/31.1035) × 1000 × USD/INR. For crude: MCX Crude ≈ WTI × USD/INR. Natural gas: MCX NatGas ≈ Henry Hub × USD/INR. Tracking these formulas daily helps you spot arbitrage opportunities and understand price drivers.
        </p>
      </>
    ),
  },
  {
    id: 5,
    section: 'Trading',
    title: 'Contango & backwardation',
    label: 'Trading · Article 3 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Contango is when future prices are higher than the current spot price — the normal state for most commodities. It reflects storage costs, financing costs, and insurance. When you roll over a contango contract, you typically sell low and buy high, creating a &quot;roll cost.&quot;
        </p>
        <InfoBox title="What it means for your P&L">
          If MCX Crude June contract is at ₹6,284 and July is at ₹6,310, the market is in contango. Rolling from June to July costs you ₹26 per barrel × 100 = ₹2,600 per lot. Over time, these costs erode long-only commodity returns — which is why commodity ETFs underperform spot prices.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Backwardation — where near-month prices exceed far-month prices — signals immediate supply tightness or high present demand. It benefits long futures holders during rollover. Crude oil often slips into backwardation during geopolitical supply shocks (OPEC cuts, Middle East tensions). Gold rarely enters backwardation except in extreme crisis.
        </p>
      </>
    ),
  },
  {
    id: 6,
    section: 'Investing',
    title: 'Gold ETF vs MCX Gold',
    label: 'Investing · Article 1 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Both instruments track gold prices but serve very different purposes. MCX gold futures are for trading — leveraged, time-bound, requiring active management. Gold ETFs are for investing — unleveraged, long-term, as easy as buying a stock.
        </p>
        <ArticleTable
          headers={['Factor', 'MCX Gold Futures', 'Gold ETF (GOLDBEES)']}
          rows={[
            ['Purpose', 'Trading / Hedging', 'Long-term investing'],
            ['Leverage', 'Yes (15–20x)', 'No (1x)'],
            ['Expiry', 'Monthly', 'None'],
            ['Min investment', '~₹1.5L (1 lot)', '~₹63 (1 unit)'],
            ['Demat needed', 'Trading account', 'Demat account'],
            ['Tax (STCG)', 'Slab rate', '20% if <3 years'],
            ['Tax (LTCG)', 'N/A', '20% with indexation'],
            ['SIP possible', 'No', 'Yes (via MF FoF)'],
          ]}
        />
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginTop: 16 }}>
          For most retail investors without active trading bandwidth, the <strong>Gold ETF FoF route</strong> (e.g. HDFC Gold Fund) is most practical — no demat account needed, SIP possible from ₹500/month, fully liquid. For active traders with risk capital, MCX offers superior price discovery and leverage.
        </p>
      </>
    ),
  },
  {
    id: 7,
    section: 'Investing',
    title: 'How to buy from India',
    label: 'Investing · Article 2 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          India-based investors have multiple pathways to commodity exposure depending on their risk appetite, capital, and time horizon.
        </p>
        <ArticleTable
          headers={['Platform', 'What you can buy', 'Best for']}
          rows={[
            ['Zerodha / Groww', 'Indian ETFs, MFs, MCX futures', 'Everything Indian'],
            ['Vested Finance', 'US ETFs (GLD, GDX, COPX), US stocks', 'Global exposure'],
            ['INDmoney', 'US ETFs, US stocks', 'Global exposure'],
            ['Kuvera / MF Central', 'Commodity MFs (no demat needed)', 'SIP in commodity MFs'],
            ['Angel One / ICICI Direct', 'MCX, Indian ETFs, MFs', 'Full-service'],
          ]}
        />
        <InfoBox title="RBI LRS for global investments">
          Investing in US-listed ETFs or stocks via Vested or INDmoney uses the RBI&apos;s Liberalised Remittance Scheme (LRS) — up to $250,000 per year per individual. Tax is payable in India on foreign asset gains per your income slab. TCS of 20% is collected upfront on remittances above ₹7L and adjusted at year-end filing.
        </InfoBox>
      </>
    ),
  },
  {
    id: 8,
    section: 'Taxation',
    title: 'Tax on commodity trading',
    label: 'Taxation · Article 1 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Commodity futures trading gains are treated as <strong>non-speculative business income</strong> in India — taxed at your income tax slab rate, regardless of holding period. There is no LTCG benefit for futures trading unlike equity.
        </p>
        <InfoBox title="Business income treatment">
          MCX trading P&amp;L must be reported under &quot;profits and gains from business or profession&quot; in your ITR. Losses can be carried forward for 8 years and set off against other business income — but NOT against salary income.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Keep detailed records of every trade — entry, exit, P&amp;L, brokerage, and STT/CTT paid. Most brokers provide an annual P&amp;L statement and tax P&amp;L report. Consider a CA familiar with derivative taxation for filing, as errors attract ITD scrutiny.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          If your turnover (absolute sum of all profits + losses) exceeds ₹10 crore, a tax audit under Section 44AB is mandatory. For turnover below ₹10 crore with declared profit above 6%, no audit is required.
        </p>
      </>
    ),
  },
  {
    id: 9,
    section: 'Taxation',
    title: 'STT, CTT explained',
    label: 'Taxation · Article 2 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Securities Transaction Tax (STT) applies to equity. For commodity futures, the government levies Commodity Transaction Tax (CTT) — introduced in Budget 2013. CTT is charged only on the sell side of non-agricultural commodity futures.
        </p>
        <ArticleTable
          headers={['Levy', 'Rate', 'Applies to', 'Deductible?']}
          rows={[
            ['CTT', '0.01% on sell side', 'Gold, Silver, Crude, Copper, NatGas', 'Yes, as business expense'],
            ['STT', 'Not applicable', 'Commodity futures', 'N/A'],
            ['GST on brokerage', '18%', 'Brokerage charges', 'Yes, as business expense'],
            ['Exchange levy', '~0.0026%', 'Both buy and sell sides', 'Yes'],
            ['SEBI turnover fee', '0.0001%', 'Both sides', 'Yes'],
          ]}
        />
        <InfoBox title="Good news on CTT">
          CTT paid is deductible as a business expense when computing taxable income from commodity trading. Unlike STT (which is not deductible for non-business investors), CTT reduces your effective tax cost. Always confirm with your CA that CTT is claimed correctly in ITR-3.
        </InfoBox>
      </>
    ),
  },
]

// Group articles by section
const SECTIONS = Array.from(new Set(ARTICLES.map(a => a.section)))

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--gold-pale)',
      borderLeft: '3px solid var(--gold)',
      borderRadius: '0 8px 8px 0',
      padding: '16px 20px',
      marginBottom: 24,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 7, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

function ArticleTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: 'auto', marginBottom: 24 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-3)' }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '11px 14px',
                  borderTop: '1px solid var(--border)',
                  color: 'var(--ink-2)',
                  background: i % 2 === 1 ? 'var(--surface-2)' : 'transparent',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LearnPage() {
  const [activeId, setActiveId] = useState(0)
  const active = ARTICLES[activeId]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          Learn
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          MCX basics, trading mechanics, investing strategies, and taxation — explained clearly.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>

        {/* Sidebar nav */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          position: 'sticky',
          top: 80,
        }}>
          {SECTIONS.map(section => (
            <div key={section}>
              <div style={{
                padding: '11px 16px',
                borderBottom: '1px solid var(--border)',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.8px',
                textTransform: 'uppercase', color: 'var(--ink-4)',
                background: 'var(--surface-2)',
              }}>
                {section}
              </div>
              {ARTICLES.filter(a => a.section === section).map(article => (
                <button
                  key={article.id}
                  onClick={() => setActiveId(article.id)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 13,
                    color: activeId === article.id ? 'var(--gold)' : 'var(--ink-3)',
                    fontWeight: activeId === article.id ? 500 : 400,
                    background: activeId === article.id ? 'var(--gold-pale)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'all .15s',
                  }}
                >
                  {article.title}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Article content */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 36,
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
            {active.label}
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: 'var(--ink)', margin: '0 0 24px' }}>
            {active.title} — {ARTICLES[activeId].section}
          </h2>

          {active.content}

          {/* Article navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            {activeId > 0 ? (
              <button onClick={() => setActiveId(activeId - 1)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 6, border: '1px solid var(--border-2)',
                background: 'none', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                ← {ARTICLES[activeId - 1].title}
              </button>
            ) : <span />}
            {activeId < ARTICLES.length - 1 ? (
              <button onClick={() => setActiveId(activeId + 1)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 18px', borderRadius: 6, border: '1px solid var(--border-2)',
                background: 'none', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
                Next: {ARTICLES[activeId + 1].title} →
              </button>
            ) : <span />}
          </div>
        </div>
      </div>
    </div>
  )
}

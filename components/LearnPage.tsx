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
          Multi Commodity Exchange of India (MCX) is India&apos;s largest commodity derivatives exchange. Founded in 2003 and regulated by SEBI since 2015, it lets traders, hedgers, and investors trade standardised futures contracts on commodities — from gold and crude oil to copper and natural gas.
        </p>
        <InfoBox title="Scale">
          MCX handles over 98% of India&apos;s commodity futures volume, with daily turnover routinely crossing ₹50,000 crore. It runs from 9 AM to 11:30 PM IST — giving Indian traders access to US and European commodity market moves in real time.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Unlike buying shares of a company, on MCX you trade a <em>futures contract</em> — a legally binding agreement to buy or sell a fixed quantity of a commodity at a pre-agreed price on a future date. The quantity per contract is called the <strong>lot size</strong>. Most retail traders never take physical delivery; they square off their position before expiry.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Below are MCX&apos;s key contracts with approximate contract values and margin requirements. Both change daily based on price volatility — the numbers below are illustrative.
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Quoted in', 'Contract Value*', 'SPAN Margin*']}
          rows={[
            ['Gold',         '1 kg',       '₹ per 10g',    '~₹1 crore',   '~₹5–7L'],
            ['Gold Mini',    '100 g',      '₹ per 10g',    '~₹10L',       '~₹55–75K'],
            ['Silver',       '30 kg',      '₹ per kg',     '~₹30L',       '~₹1.5–2.5L'],
            ['Silver Mini',  '5 kg',       '₹ per kg',     '~₹5L',        '~₹25–40K'],
            ['Crude Oil',    '100 barrels','₹ per barrel', '~₹6.5L',      '~₹30–45K'],
            ['Crude Mini',   '10 barrels', '₹ per barrel', '~₹65K',       '~₹3–5K'],
            ['Copper',       '2,500 kg',   '₹ per kg',     '~₹24L',       '~₹1.2–1.8L'],
            ['Nat Gas',      '1,250 mmBtu','₹ per mmBtu',  '~₹4L',        '~₹20–30K'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Illustrative, based on mid-2026 price levels. Actual contract values and margins change daily.
          Use your broker's SPAN calculator for live margin requirements.
        </p>
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
          A futures contract is an agreement to buy or sell a commodity at a fixed price on a future date. You pay only a margin — a fraction of the contract value — to control the full contract. This is leverage.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          The critical thing to understand: <strong>your profit or loss is calculated on the full contract value, not just the margin you paid</strong>.
        </p>
        <InfoBox title="Worked example — MCX Gold">
          MCX Gold is quoted at ₹1,00,000 per 10 grams. One lot = 1 kg = 100 units of 10g.
          <br /><br />
          <strong>Contract value</strong> = 100 × ₹1,00,000 = <strong>₹1,00,00,000 (₹1 crore)</strong><br />
          <strong>Margin required</strong> (at ~6%) = <strong>₹6,00,000</strong>
          <br /><br />
          You buy 1 lot at ₹1,00,000/10g. The price rises to ₹1,01,000/10g — a ₹1,000 move per 10g unit.<br />
          <strong>Your profit</strong> = ₹1,000 × 100 units = <strong>₹1,00,000</strong><br />
          <strong>Return on margin</strong> = ₹1,00,000 ÷ ₹6,00,000 = <strong>16.7%</strong> on a 1% price move.<br /><br />
          The reverse is equally true — a 1% fall means a ₹1,00,000 loss on your ₹6L margin.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          <strong>Mark-to-Market (MTM) settlement</strong> is how MCX manages daily risk. Every evening after the session closes, your position is revalued at the day&apos;s settlement price. Profits are credited to your account and losses debited — immediately. You cannot &quot;ride out&quot; a loss by simply holding; if your account balance drops below the maintenance margin, your broker will call for more funds or square off the position.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Two types of participants drive every trade: <strong>hedgers</strong> (jewellers buying gold futures to lock in purchase prices; oil companies selling crude futures to protect against price drops) and <strong>speculators</strong> (traders seeking profit from price movements). Hedgers bring genuine supply/demand information to the market; speculators provide liquidity.
        </p>
      </>
    ),
  },
  {
    id: 2,
    section: 'MCX Basics',
    title: 'Lot sizes, expiry & tick size',
    label: 'MCX Basics · Article 3 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Three numbers define every MCX trade: the lot size (how much you&apos;re trading), the tick size (the minimum price move), and the expiry date (when the contract ceases to exist).
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Tick Size', 'P&L per tick', 'Expiry']}
          rows={[
            ['Gold',      '1 kg',       '₹1/10g',      '₹100/lot',  'Month-end'],
            ['Silver',    '30 kg',      '₹1/kg',        '₹30/lot',   'Month-end'],
            ['Crude Oil', '100 bbl',    '₹1/bbl',       '₹100/lot',  '~19th of month'],
            ['Copper',    '2,500 kg',   '₹0.05/kg',     '₹125/lot',  'Month-end'],
            ['Nat Gas',   '1,250 mmBtu','₹0.10/mmBtu',  '₹125/lot',  '~25th of month'],
          ]}
        />
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          The tick size matters for execution. If MCX Crude is at ₹6,500/bbl and moves to ₹6,501, you make or lose exactly ₹100 (1 tick × 100 barrels). For Gold, a ₹500/10g move = ₹500 × 100 units = ₹50,000 per lot.
        </p>
        <InfoBox title="Rollover — what happens at expiry">
          When a contract&apos;s expiry approaches, traders who want to maintain exposure &quot;roll over&quot; — they sell the near-month contract and buy the next month simultaneously. The difference in price between the two months is called the <strong>roll cost</strong> (or roll benefit in backwardation).
          <br /><br />
          If MCX Crude June is at ₹6,500 and July is at ₹6,530, rolling costs ₹30/bbl × 100 = <strong>₹3,000 per lot</strong>. Do this 12 times a year and roll costs alone eat ₹36,000.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Always check MCX&apos;s official contract calendar before holding positions close to expiry. Crude oil and natural gas expire mid-month; gold and silver expire near month-end. The last 2–3 days before expiry see sharp volatility and widened spreads as open interest rapidly falls.
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
          Margin is the collateral you deposit to hold an open futures position. MCX (via SEBI) mandates a minimum <strong>SPAN margin</strong> based on statistical worst-case price scenarios. Your broker adds an <strong>exposure margin</strong> on top — typically 2–5% extra — giving a total margin requirement of roughly 5–10% of contract value.
        </p>
        <InfoBox title="Margin call — how it works">
          If your account balance falls below the <strong>maintenance margin</strong> (usually 75% of the initial margin), your broker issues a margin call: deposit more funds within hours or they will square off your position at the prevailing market price — which could be at a loss. Always maintain 20–30% buffer above the minimum margin.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Leverage is the ratio of contract value to margin paid. At 6% margin, you control ₹1 crore of gold with ₹6 lakh — that&apos;s ~16x leverage. Every 1% move in the commodity price moves your margin by 16%. This cuts both ways.
        </p>
        <ArticleTable
          headers={['Contract', 'Contract Value*', 'Margin ~6%*', '1% price move']}
          rows={[
            ['Gold (1 kg)',       '₹1,00,00,000', '₹6,00,000', '₹1,00,000 gain/loss'],
            ['Silver (30 kg)',    '₹30,00,000',   '₹1,80,000', '₹30,000 gain/loss'],
            ['Crude (100 bbl)',   '₹6,50,000',    '₹39,000',   '₹6,500 gain/loss'],
            ['Copper (2,500 kg)', '₹24,00,000',   '₹1,44,000', '₹24,000 gain/loss'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Illustrative based on approximate mid-2026 prices (Gold ₹1,00,000/10g; Silver ₹1,00,000/kg; Crude ₹6,500/bbl; Copper ₹960/kg). Actual values change daily.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginTop: 16 }}>
          Professional commodity traders typically risk no more than 1–2% of total capital per trade, regardless of conviction. On a ₹25 lakh trading account, that means a maximum loss of ₹25,000–50,000 per trade before cutting the position.
        </p>
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
          MCX prices are quoted in Indian Rupees, but the unit differs by commodity. Knowing the unit is essential — confusing ₹/10g with ₹/kg is a costly mistake.
        </p>
        <ArticleTable
          headers={['Commodity', 'MCX Quote Unit', 'Example Price', 'What that means']}
          rows={[
            ['Gold',        '₹ per 10 grams', '₹1,00,000/10g', '₹10,00,000 per 100g (₹10L)'],
            ['Silver',      '₹ per kilogram', '₹1,00,000/kg',  '₹30,00,000 per 30 kg lot'],
            ['Crude Oil',   '₹ per barrel',   '₹6,500/bbl',    '₹6,50,000 per 100 bbl lot'],
            ['Copper',      '₹ per kilogram', '₹960/kg',       '₹24,00,000 per 2,500 kg lot'],
            ['Nat Gas',     '₹ per mmBtu',    '₹350/mmBtu',    '₹4,37,500 per 1,250 mmBtu lot'],
          ]}
        />
        <InfoBox title="Understanding the MCX–COMEX basis">
          MCX gold is not simply COMEX gold converted to rupees. The Indian price includes import duty, GST, and a local supply/demand premium. The theoretical MCX fair value is:
          <br /><br />
          <strong>MCX Gold (₹/10g) = (COMEX $/oz ÷ 31.1035) × 10 × USD/INR × (1 + duty + GST)</strong>
          <br /><br />
          Example: COMEX at $3,000/oz, USD/INR at ₹85, effective duty + GST ≈ 15%:<br />
          = ($3,000 ÷ 31.1035) × 10 × 85 × 1.15 = $964.5 × 85 × 1.15 = <strong>₹94,095/10g</strong>
          <br /><br />
          When actual MCX price is significantly <em>above</em> this theoretical level, it signals strong local demand or import tightness. When below, it signals weak local demand or excess supply.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          For crude: <strong>MCX Crude ≈ WTI ($/bbl) × USD/INR</strong>. India primarily imports Brent-linked crude, but MCX is settled against an Indian import price reference. For silver: same formula as gold but substitute silver COMEX price. For natural gas: <strong>MCX NatGas ≈ Henry Hub × USD/INR</strong>, though India&apos;s domestic gas pricing introduces a basis differential.
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
          Every commodity trades multiple contract months simultaneously — June, July, August, etc. The relationship between these prices tells you something important about supply, demand, and the cost of holding inventory.
        </p>
        <InfoBox title="Contango — the normal state">
          <strong>Contango</strong>: far-month price &gt; near-month price. This is the default condition for most commodities, because holding physical commodity has a cost — storage, insurance, financing. The futures curve &quot;prices in&quot; these carrying costs.
          <br /><br />
          Example: MCX Crude June at ₹6,500, July at ₹6,535, August at ₹6,568.<br />
          Rolling from June to July <strong>costs</strong> ₹35/bbl × 100 = <strong>₹3,500/lot</strong>.<br />
          This is why long-only commodity ETFs consistently underperform the spot commodity over time — they pay roll costs every month.
        </InfoBox>
        <InfoBox title="Backwardation — the supply alarm">
          <strong>Backwardation</strong>: near-month price &gt; far-month price. This signals that <em>immediate physical supply is tight</em> — buyers are paying a premium to get the commodity now.
          <br /><br />
          Example: MCX Crude June at ₹6,800, July at ₹6,760.<br />
          Rolling from June to July <strong>earns</strong> ₹40/bbl × 100 = <strong>₹4,000/lot</strong>.<br />
          Crude frequently enters backwardation during OPEC production cuts or Middle East supply shocks. Gold almost never enters backwardation — being a monetary asset, it has very low storage costs and high above-ground supply.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          For Indian traders, the practical takeaway: before entering a long position you plan to hold for several weeks, check whether the market is in contango or backwardation. In deep contango, you are paying a hidden cost with every rollover. In backwardation, roll positions actually add to your return.
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
          Both instruments give you exposure to gold price moves in India — but they serve completely different purposes and suit different types of participants.
        </p>
        <ArticleTable
          headers={['Factor', 'MCX Gold Futures', 'Gold ETF (e.g. GOLDBEES)']}
          rows={[
            ['Purpose',           'Active trading / hedging',  'Long-term wealth accumulation'],
            ['Leverage',          'Yes — ~16x at 6% margin',   'No (1x)'],
            ['Expiry',            'Monthly — must manage',     'None — hold indefinitely'],
            ['Min capital',       '₹5–8L (SPAN + exposure)',   '~₹50–100 per unit (any amount)'],
            ['Account needed',    'Commodity trading account', 'Demat account'],
            ['LTCG tax',          'N/A (business income)',     '12.5% after 12 months holding'],
            ['STCG tax',          'Slab rate (business)',      'Slab rate under 12 months'],
            ['SIP possible',      'No',                        'Yes, via Gold FoF (no demat)'],
            ['Physical delivery', 'Yes, at expiry (rare)',     'No (paper gold)'],
          ]}
        />
        <InfoBox title="Gold ETF taxation — Budget 2024 change">
          Before July 23, 2024: Gold ETFs were taxed at 20% with indexation after 3 years (LTCG), slab rate before that.
          <br /><br />
          After Budget 2024: Gold ETFs held for <strong>12 months or more</strong> now attract <strong>12.5% LTCG without indexation</strong>. Under 12 months is taxed at your income slab rate (STCG). The shorter holding period for LTCG makes Gold ETFs more tax-efficient for medium-term investors.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginTop: 4 }}>
          For most retail investors without active trading bandwidth, <strong>Gold ETF FoF</strong> (e.g. Nippon India Gold Savings Fund, HDFC Gold Fund) is the most accessible route — no demat account needed, SIP from ₹500/month, fully liquid. For active traders with dedicated risk capital and daily monitoring capability, MCX Gold offers superior leverage and price discovery.
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
          Indian investors have multiple pathways to commodity exposure depending on risk appetite, capital, and how actively they want to manage positions.
        </p>
        <ArticleTable
          headers={['Platform', 'What you can access', 'Best for']}
          rows={[
            ['Zerodha / Angel One', 'MCX futures, Indian ETFs, Gold ETFs, MFs', 'All-in-one — trading + investing'],
            ['ICICI Direct / HDFC Sky', 'MCX futures, equity, ETFs, MFs', 'Full-service with advisory'],
            ['Vested Finance', 'US ETFs (GLD, GDX, COPX, USO), US stocks', 'Global commodity ETF exposure'],
            ['INDmoney', 'US ETFs, US stocks', 'US market exposure via LRS'],
            ['Kuvera / MF Central', 'Commodity MFs, Gold FoF — no demat required', 'SIP in gold/commodity funds'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, marginBottom: 20, lineHeight: 1.6 }}>
          Note: Groww, Upstox (basic plan), and most newer discount brokers support equity and MFs but <strong>do not offer MCX commodity futures</strong>. Verify MCX access before opening an account specifically for commodity trading.
        </p>
        <InfoBox title="Investing abroad via RBI LRS">
          US-listed commodity ETFs (GLD for gold, USO for crude, COPX for copper miners) are accessible via the RBI&apos;s Liberalised Remittance Scheme — up to $250,000 per individual per financial year.
          <br /><br />
          Key costs: TCS of 20% is collected upfront on LRS remittances above ₹7 lakh (adjusted at ITR filing). Foreign asset gains are taxed in India per your applicable income slab for STCG, or at 12.5% for LTCG held over 24 months. PFIC rules don&apos;t apply to Indian tax residents — but do consult a CA for accurate filing.
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
          Commodity futures trading gains are classified as <strong>non-speculative business income</strong> under Indian tax law — taxed at your applicable income slab rate, regardless of how long you held the position. There is no LTCG benefit or short-term/long-term distinction for futures, unlike equity.
        </p>
        <InfoBox title="Business income treatment — what this means practically">
          MCX trading profits and losses go into &quot;Profits and Gains from Business or Profession&quot; in your ITR-3.
          <br /><br />
          <strong>The upside</strong>: losses can be <strong>carried forward for 8 years</strong> and set off against other non-speculative business income in future years. Brokerage, CTT, internet/data charges, and a proportionate share of your trading setup costs are deductible.
          <br /><br />
          <strong>The catch</strong>: losses cannot be set off against salary income. And you must file ITR-3 (not ITR-1 or ITR-2), which requires more detail.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          <strong>Turnover calculation</strong> matters for tax audit applicability. For commodity futures, turnover = the absolute sum of all profits and losses (not gross receipts). A trader who made ₹5L and lost ₹3L on different trades has a turnover of ₹8L, not ₹5L net.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          If turnover exceeds ₹10 crore, a tax audit under Section 44AB is mandatory. Below ₹10 crore, no audit is required <em>if</em> you declare net profit ≥ 6% of turnover. If you declare a loss (or profit below 6%), an audit is needed even at lower turnover. Most active commodity traders should work with a CA familiar with F&O/commodity taxation.
        </p>
      </>
    ),
  },
  {
    id: 9,
    section: 'Taxation',
    title: 'STT, CTT & transaction costs',
    label: 'Taxation · Article 2 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Every MCX trade incurs several statutory and exchange charges on top of brokerage. Understanding these is important — they compound significantly on high-turnover trading.
        </p>
        <ArticleTable
          headers={['Charge', 'Rate', 'Levied on', 'Deductible?']}
          rows={[
            ['CTT (Commodity Transaction Tax)', '0.01%', 'Sell side only — non-agri futures (Gold, Silver, Crude, Copper, NatGas)', 'Yes — as business expense'],
            ['MCX Exchange Transaction Charge', '~0.0026%', 'Both sides (buy + sell)', 'Yes — as business expense'],
            ['SEBI Turnover Fee', '0.0001%', 'Both sides', 'Yes'],
            ['GST on brokerage', '18%', 'On brokerage and exchange charges', 'Yes'],
            ['Stamp Duty', '0.002% on buy side', 'Buy side only (MCX futures)', 'Yes'],
            ['STT', 'Nil', 'Does not apply to commodity futures', 'N/A'],
          ]}
        />
        <InfoBox title="CTT — how it adds up">
          CTT is 0.01% on the sell value. On a ₹1 crore gold contract sold: CTT = ₹100. That sounds trivial — but a day trader who turns over ₹10 crore in gold contracts in a month pays ₹10,000 in CTT alone, every month.
          <br /><br />
          The good news: <strong>CTT is deductible as a business expense</strong> against commodity trading income. Keep your contract notes — brokers provide annual CTT summaries for ITR filing. Always confirm with your CA that CTT is correctly claimed under &quot;expenses&quot; in ITR-3.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Agricultural commodities traded on NCDEX (e.g. turmeric, chana, soybean) are exempt from CTT — one reason agri commodity trading remains more active on NCDEX than MCX. Non-agricultural commodities on MCX (gold, silver, crude, copper, natgas) are subject to CTT on every sell trade.
        </p>
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
            {active.title}
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

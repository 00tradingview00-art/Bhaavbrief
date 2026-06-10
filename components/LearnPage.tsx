'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export interface ContractSpec {
  name: string
  tradingsymbol: string
  expiry: string
  contractSize: number
  contractSizeStr: string
  priceQuote: string
  tickSize: number | null
  tickValuePerLot: number | null
  quotedUnit: string
  exchange: string
}

export interface ContractSpecs {
  gold?: ContractSpec
  silver?: ContractSpec
  crude?: ContractSpec
  copper?: ContractSpec
  natgas?: ContractSpec
}

interface Article {
  id: number
  section: string
  title: string
  label: string
  href?: string  // if set, sidebar renders a link to a dedicated page
  content: React.ReactNode
}

function fmtExpiry(spec?: ContractSpec): string {
  if (!spec?.expiry) return '—'
  const d = new Date(spec.expiry + 'T12:00:00Z')
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTick(spec?: ContractSpec): string {
  if (!spec?.tickSize) return '—'
  const unit = spec.quotedUnit.replace('₹/', '')
  return `₹${spec.tickSize}/${unit}`
}

function fmtTickValue(spec?: ContractSpec): string {
  if (spec?.tickValuePerLot == null) return '—'
  return `₹${spec.tickValuePerLot}/lot`
}

function fmtLot(spec?: ContractSpec, fallback = '—'): string {
  return spec?.contractSizeStr ?? fallback
}

function buildArticles(specs: ContractSpecs | null): Article[] {
  const s = specs ?? {}
  return [
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
            ['Gold',         fmtLot(s.gold,   '1 kg'),         '₹ per 10g',    '~₹1 crore',   '~₹5–7L'],
            ['Gold Mini',    '100 g',                           '₹ per 10g',    '~₹10L',       '~₹55–75K'],
            ['Silver',       fmtLot(s.silver, '30 kg'),        '₹ per kg',     '~₹30L',       '~₹1.5–2.5L'],
            ['Silver Mini',  '5 kg',                            '₹ per kg',     '~₹5L',        '~₹25–40K'],
            ['Crude Oil',    fmtLot(s.crude,  '100 barrels'),  '₹ per barrel', '~₹6.5L',      '~₹30–45K'],
            ['Crude Mini',   '10 barrels',                      '₹ per barrel', '~₹65K',       '~₹3–5K'],
            ['Copper',       fmtLot(s.copper, '2,500 kg'),     '₹ per kg',     '~₹24L',       '~₹1.2–1.8L'],
            ['Nat Gas',      fmtLot(s.natgas, '1,250 mmBtu'),  '₹ per mmBtu',  '~₹4L',        '~₹20–30K'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Illustrative, based on mid-2026 price levels. Actual contract values and margins change daily.
          Use your broker&apos;s SPAN calculator for live margin requirements.
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
    href: '/learn/mcx-lot-sizes',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Three numbers define every MCX trade: the lot size (how much you&apos;re trading), the tick size (the minimum price move), and the expiry date (when the contract ceases to exist).
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Tick Size', 'P&L per tick', 'Active Expiry']}
          rows={[
            ['Gold',      fmtLot(s.gold,   '1 kg'),         fmtTick(s.gold),   fmtTickValue(s.gold),   fmtExpiry(s.gold)],
            ['Silver',    fmtLot(s.silver, '30 kg'),        fmtTick(s.silver), fmtTickValue(s.silver), fmtExpiry(s.silver)],
            ['Crude Oil', fmtLot(s.crude,  '100 bbl'),      fmtTick(s.crude),  fmtTickValue(s.crude),  fmtExpiry(s.crude)],
            ['Copper',    fmtLot(s.copper, '2,500 kg'),     fmtTick(s.copper), fmtTickValue(s.copper), fmtExpiry(s.copper)],
            ['Nat Gas',   fmtLot(s.natgas, '1,250 mmBtu'),  fmtTick(s.natgas), fmtTickValue(s.natgas), fmtExpiry(s.natgas)],
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
  {
    id: 10,
    section: 'Market Drivers',
    title: 'Why commodity prices move',
    label: 'Market Drivers · Article 1 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          MCX commodity prices don&apos;t move randomly. Every significant move has a driver — and most drivers fall into five categories. Understanding them lets you interpret a price chart the same way a professional trader does.
        </p>
        <ArticleTable
          headers={['Driver', 'Affects most', 'How it works']}
          rows={[
            ['USD/INR exchange rate',  'Gold, Silver, Crude, Copper', 'MCX prices are INR-denominated. Rupee weakens → MCX price rises even if global price is flat. Rupee strengthens → MCX falls.'],
            ['Global benchmark price', 'All commodities',            'MCX gold tracks COMEX gold (NY). MCX crude tracks WTI/Brent. A $10/bbl rise in WTI adds ~₹830 to MCX Crude (at USD/INR 83).'],
            ['Import duty & GST',      'Gold, Silver',               'Government changes to import duty directly set the floor for MCX gold pricing. A 2% duty cut = ~₹2,000/10g fall in MCX gold.'],
            ['Geopolitical events',    'Crude, Gold',                'Wars, sanctions, and supply disruptions hit crude first, then gold (safe-haven demand). Iran-related events move MCX crude within minutes.'],
            ['Domestic demand/supply', 'Silver, Copper',             'Festival season, industrial activity, and monsoon affect local demand. Silver surges before Diwali and during solar panel procurement cycles.'],
          ]}
        />
        <InfoBox title="The rupee multiplier — a worked example">
          COMEX Gold at $3,000/oz. USD/INR at ₹84.<br /><br />
          MCX theoretical = (3000 ÷ 31.1035) × 10 × 84 × 1.15 = <strong>~₹93,000/10g</strong><br /><br />
          Now rupee weakens to ₹86 with COMEX unchanged:<br />
          MCX theoretical = (3000 ÷ 31.1035) × 10 × 86 × 1.15 = <strong>~₹95,200/10g</strong><br /><br />
          A 2% rupee depreciation alone adds ~₹2,200 to MCX gold — even if international gold didn&apos;t move. This is why MCX gold in India often makes new highs even when COMEX is flat.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          Most retail traders fixate on the commodity price while ignoring the rupee. Professional Indian commodity traders watch both simultaneously — because on some days, the rupee is the entire story.
        </p>
      </>
    ),
  },
  {
    id: 11,
    section: 'Market Drivers',
    title: 'OPEC, Fed & geopolitics',
    label: 'Market Drivers · Article 2 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Three external forces move MCX commodities more than any Indian domestic factor. Knowing when each is in play helps you avoid being caught on the wrong side.
        </p>
        <InfoBox title="OPEC — the crude oil throttle">
          OPEC+ (the 23-nation cartel including Saudi Arabia and Russia) controls roughly 40% of global oil supply. When they announce production cuts, crude prices rise — typically within minutes of the decision. When they raise output, prices fall.<br /><br />
          For MCX crude traders: OPEC meetings (usually every 2–3 months) are high-risk events. Positions held over a scheduled OPEC meeting should have defined stop-losses. The 2022 surprise cut sent MCX Crude up ₹800/bbl in a single session.<br /><br />
          Watch for: unofficial signals from Saudi energy ministry statements before formal OPEC meetings — these often move markets before the official announcement.
        </InfoBox>
        <InfoBox title="US Federal Reserve — the gold multiplier">
          Gold and the US dollar have an inverse relationship. When the Fed raises interest rates, the dollar strengthens → gold falls globally → MCX gold falls (amplified if rupee also strengthens). When the Fed cuts rates or signals easy policy → dollar weakens → gold rises globally → MCX gold rises (amplified if rupee weakens).<br /><br />
          Key Fed events that move MCX gold: FOMC rate decisions (8 per year), Fed Chair press conferences, US CPI data (monthly), US Non-Farm Payrolls (first Friday of each month). These are scheduled — mark your calendar.
        </InfoBox>
        <InfoBox title="Geopolitics — crude and gold safe-haven">
          Middle East conflicts raise crude prices (supply disruption risk) and gold prices (safe-haven demand) simultaneously. The Iran-Strait of Hormuz risk is the most persistent — roughly 20% of global oil passes through the strait.<br /><br />
          Russia-Ukraine conflict affected both crude (Russian supply) and wheat, which is less relevant for MCX but affects agri-linked commodities. China slowdown signals hit MCX Copper hardest — China consumes ~55% of global copper.
        </InfoBox>
        <ArticleTable
          headers={['Event', 'Primary MCX impact', 'Secondary impact', 'Typical timing']}
          rows={[
            ['OPEC production decision', 'Crude ↑↓ sharply', 'NatGas, indirect', 'Within minutes of announcement'],
            ['US Fed rate decision',     'Gold ↑↓',          'Rupee, Crude',     'FOMC day — 11:30 PM IST'],
            ['US CPI data release',      'Gold ↑↓',          'Rupee, Crude',     '6:00 PM IST (monthly)'],
            ['Iran-US escalation',       'Crude ↑, Gold ↑',  'Silver ↑',         'Immediate — any time'],
            ['China PMI data',           'Copper ↑↓',        'Silver ↑↓',        'Monthly — early morning IST'],
          ]}
        />
      </>
    ),
  },
  {
    id: 12,
    section: 'Market Drivers',
    title: 'NSE Gold Futures vs MCX Gold',
    label: 'Market Drivers · Article 3 of 3',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          In 2026, NSE launched its own gold futures contract, giving Indian traders a second exchange option for the first time. Here&apos;s how it compares to MCX — and when to use which.
        </p>
        <ArticleTable
          headers={['Factor', 'MCX Gold', 'NSE Gold Futures']}
          rows={[
            ['Exchange',          'Multi Commodity Exchange',        'National Stock Exchange'],
            ['Regulator',         'SEBI',                            'SEBI'],
            ['Market share',      '~98% of Indian commodity volume', 'New — building liquidity'],
            ['Lot size',          '1 kg (Gold), 100g (Gold Mini)',   '1 kg (standard)'],
            ['Trading hours',     '9 AM – 11:30 PM IST',            '9 AM – 5 PM IST (equity hours)'],
            ['Margin',            'Higher (MCX SPAN framework)',     'Lower — competitive launch pricing'],
            ['Settlement',        'INR cash or physical delivery',   'INR cash settlement'],
            ['Existing account',  'Need separate commodity account', 'Works with existing equity demat'],
            ['Liquidity',         'Deep — decades of volume',        'Early stage — wider bid-ask spreads'],
          ]}
        />
        <InfoBox title="Which should you use?">
          For most active traders: <strong>MCX Gold</strong> remains the better choice in 2026. Its depth means tighter spreads and easier entry/exit on large positions. The evening session (post 5 PM) captures US market moves — absent on NSE Gold.<br /><br />
          For existing equity traders who don&apos;t have a commodity account: <strong>NSE Gold Futures</strong> removes the friction of opening a new account. Lower margin requirements may suit smaller capital.<br /><br />
          Watch the spread: if NSE Gold trades at a significantly different price than MCX Gold during common hours, an arbitrage exists — sophisticated traders are already closing this gap, but retail traders should trade the more liquid MCX unless they have a specific account-convenience reason to use NSE.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          The longer-term question is whether NSE&apos;s lower margins and equity account integration will shift significant volume away from MCX. MCX&apos;s stock price fell 5% on NSE Gold&apos;s launch day — signalling real competitive concern. For traders, more competition between exchanges means tighter margins and lower costs over time.
        </p>
      </>
    ),
  },
  {
    id: 13,
    section: 'Hedging',
    title: 'How jewellers & merchants hedge',
    label: 'Hedging · Article 1 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Commodity futures weren&apos;t designed for speculators — they were designed for merchants and producers who need to lock in prices. This is called <strong>hedging</strong>: using futures to remove price risk from your business.
        </p>
        <InfoBox title="The jeweller's problem — and the solution">
          A jeweller in Mumbai receives a ₹50 lakh order for gold jewellery to be delivered in 45 days. Today&apos;s MCX Gold price is ₹1,00,000/10g. The jeweller hasn&apos;t bought the gold yet.<br /><br />
          <strong>Risk</strong>: If gold rises to ₹1,05,000/10g by the time they buy it, their cost increases by ₹5L — wiping out the profit margin.<br /><br />
          <strong>Hedge</strong>: The jeweller buys MCX Gold futures today at ₹1,00,000/10g (locking in the purchase price). When they buy physical gold 30 days later at ₹1,05,000, they simultaneously sell the futures. The ₹5L gain on futures offsets the higher physical purchase cost. Net cost: ₹1,00,000/10g — exactly what they planned.
        </InfoBox>
        <ArticleTable
          headers={['Business type', 'Risk', 'Hedge action', 'MCX contract used']}
          rows={[
            ['Jeweller (gold buyer)',       'Gold rises before purchase',   'Buy gold futures today',          'MCX Gold / Gold Mini'],
            ['Jeweller (gold seller)',      'Gold falls before delivery',   'Sell gold futures today',         'MCX Gold / Gold Mini'],
            ['Oil importer / transporter',  'Crude rises before import',    'Buy crude futures today',         'MCX Crude Oil'],
            ['Cable manufacturer',          'Copper rises before purchase', 'Buy copper futures today',        'MCX Copper'],
            ['Solar panel installer',       'Silver rises before purchase', 'Buy silver futures today',        'MCX Silver Mini'],
          ]}
        />
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          <strong>Basis risk</strong> is the one imperfection in hedging: the MCX futures price and the actual physical purchase price may not move in perfect lockstep. Local factors (GST changes, import disruptions, local demand) create a basis — a difference between MCX and physical price. A jeweller hedging with MCX is protected from the global and rupee-driven moves, but not from local basis shifts.
        </p>
        <InfoBox title="Practical setup for a small merchant">
          You don&apos;t need a large capital base to hedge. MCX Gold Mini (100g lot, ~₹60,000–₹80,000 margin) is accessible for small jewellers. Open a commodity account with Zerodha or Angel One, maintain 2–3 lot worth of margin buffer, and hedge only the quantity you&apos;ve committed to customers — not speculative inventory.
        </InfoBox>
      </>
    ),
  },
  {
    id: 14,
    section: 'Hedging',
    title: 'Practical hedging for small businesses',
    label: 'Hedging · Article 2 of 2',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Theory is straightforward — execution is where most small business owners stop. Here&apos;s a practical step-by-step for a jeweller or merchant looking to hedge for the first time.
        </p>
        <ArticleTable
          headers={['Step', 'Action', 'Detail']}
          rows={[
            ['1', 'Open a commodity trading account',     'Zerodha Kite, Angel One, or ICICI Direct. Takes 1–2 days. Requires PAN, Aadhaar, bank account, and commodity trading activation.'],
            ['2', 'Calculate your exposure',              'How many grams of gold are you committed to buying/selling in the next 30–60 days? Convert to MCX lot equivalents (1 lot = 1 kg = 1,000g; Mini = 100g).'],
            ['3', 'Choose the right contract month',      'Pick the MCX contract month closest to your physical transaction date. If buying gold in 40 days, use the contract expiring nearest to that date.'],
            ['4', 'Place the hedge trade',                'Buy futures if you fear rising prices (you\'re a buyer). Sell futures if you fear falling prices (you\'re a seller holding inventory).'],
            ['5', 'Monitor and adjust',                   'If your physical transaction date shifts, roll the futures contract to a later month. Rollover cost is typically ₹1,000–₹3,000 per lot.'],
            ['6', 'Close the hedge on transaction day',   'When you complete the physical purchase or sale, square off the futures position. The net cost = physical price ± futures P&L.'],
          ]}
        />
        <InfoBox title="Common mistakes in commodity hedging">
          <strong>Over-hedging</strong>: Hedging more futures than your physical exposure turns your hedge into speculation. Hedge only what you have a real business obligation for.<br /><br />
          <strong>Ignoring margin calls</strong>: If gold moves against your futures position before you buy physically, your broker may issue a margin call. Maintain a 30% buffer above minimum margin — or your hedge gets squared off at the worst time.<br /><br />
          <strong>Hedging too early</strong>: Price discovery improves closer to expiry. A 90-day hedge has more basis risk than a 30-day hedge. Match the futures horizon to your physical commitment as closely as possible.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          For most small merchants, even a partial hedge — covering 50–70% of your committed exposure — is far better than no hedge. You don&apos;t need to hedge perfectly; you need to avoid a single catastrophic price move that wipes out a month&apos;s margin.
        </p>
      </>
    ),
  },
  {
    id: 15,
    section: 'Contracts',
    title: 'Gold contracts — Standard, Mini, Guinea, Petal',
    label: 'Contracts · Article 1 of 4',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          MCX offers four gold contracts — each designed for a different capital level and use case. All four track the same underlying price; what differs is lot size, ticket size, and how much capital you need.
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L per tick', 'Approx margin*', 'Best for']}
          rows={[
            ['Gold',         '1 kg (1,000g)',  '₹/10g', '₹1',   '₹100/lot',  '~₹5–7 lakh',    'Large traders, institutions'],
            ['Gold Mini',    '100 g',           '₹/10g', '₹1',   '₹10/lot',   '~₹55–75K',      'Active retail traders'],
            ['Gold Guinea',  '8 g',             '₹/8g',  '₹1',   '₹1/lot',    '~₹5–8K',        'Very small capital, beginners'],
            ['Gold Petal',   '1 g',             '₹/g',   '₹1',   '₹1/lot',    '~₹700–1,200',   'Micro-hedging, jewellers'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Approximate SPAN margins based on mid-2026 price levels (~₹1,00,000/10g). Actual margins change daily with volatility. Always verify on your broker&apos;s SPAN calculator before placing a trade.
        </p>
        <InfoBox title="Gold Mini vs Gold Standard — which to use?">
          For most retail traders, <strong>Gold Mini (100g)</strong> is the right entry point. At ~₹60,000–75,000 margin per lot, it&apos;s accessible without overexposing capital. The standard 1 kg contract requires ₹5–7 lakh in margin — appropriate only if you have sufficient capital to hold multiple lots without margin call risk.<br /><br />
          Gold Guinea and Gold Petal are primarily used by small jewellers for physical-equivalent hedging. Their very small lot sizes mean low absolute P&L — useful for hedging specific customer orders but not practical for active trading.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          <strong>Expiry dates differ</strong>: Gold Standard and Gold Mini expire on the 5th of the contract month. Gold Guinea and Gold Petal expire on the last day of the month. Always check the specific expiry when rolling positions — mixing up dates is a common beginner error.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          All MCX gold contracts settle against 995 purity LBMA-approved gold. Physical delivery is available (and compulsory if you hold to expiry without squaring off) at MCX accredited vaults in Ahmedabad, Mumbai, and Delhi.
        </p>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/commodities/gold" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
            MCX Gold live price & analysis →
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
          <Link href="/markets" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
            All live prices
          </Link>
        </div>
      </>
    ),
  },
  {
    id: 16,
    section: 'Contracts',
    title: 'Silver contracts — Standard, Mini, Micro',
    label: 'Contracts · Article 2 of 4',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          Silver on MCX trades in three contract sizes. Unlike gold, silver is both a monetary metal and a heavily industrial one — solar panels, electronics, and EV batteries all need silver. This dual demand makes silver more volatile than gold and creates distinct trading opportunities.
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L per tick', 'Approx margin*', 'Best for']}
          rows={[
            ['Silver',       '30 kg',  '₹/kg', '₹1',  '₹30/lot',  '~₹1.5–2.5 lakh', 'Active traders, large hedgers'],
            ['Silver Mini',  '5 kg',   '₹/kg', '₹1',  '₹5/lot',   '~₹25–40K',       'Retail traders — most popular'],
            ['Silver Micro', '1 kg',   '₹/kg', '₹1',  '₹1/lot',   '~₹5–8K',         'Beginners, small capital'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Based on ~₹1,00,000/kg silver price levels. Verify live margins on your broker&apos;s SPAN calculator — silver margins are higher relative to gold due to greater volatility.
        </p>
        <InfoBox title="Silver Mini — the most practical silver contract">
          <strong>Silver Mini (5 kg)</strong> is the most actively traded silver contract for retail participants in India. At ~₹30,000–40,000 margin per lot, it offers meaningful exposure without the ₹1.5 lakh+ required for the standard 30 kg contract.<br /><br />
          Silver Micro (1 kg) suits traders with under ₹50,000 in capital who want to learn silver trading mechanics before scaling up. The absolute P&L is small (₹1 per tick), but the percentage exposure and price dynamics are identical to the larger contracts.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          <strong>Silver vs gold volatility</strong>: Silver typically moves 2–3x more than gold in percentage terms. When gold is up 0.5%, silver is often up 1–1.5%. This leverage-within-leverage means silver trades require tighter risk management. The gold-silver ratio (gold price ÷ silver price) is a key indicator — historically it oscillates between 60x and 90x. At extremes, mean reversion trades become attractive.
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          <strong>Seasonal demand</strong> adds an Indian angle: silver demand spikes before Diwali (jewellery, gifting) and during large solar panel procurement cycles (India&apos;s solar installation targets require significant silver for panel contacts). Watch for these seasonal patterns in MCX Silver open interest around April–May and September–October.
        </p>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/commodities/silver" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
            MCX Silver live price & analysis →
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
          <Link href="/markets" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
            All live prices
          </Link>
        </div>
      </>
    ),
  },
  {
    id: 17,
    section: 'Contracts',
    title: 'Energy contracts — Crude Oil & Natural Gas',
    label: 'Contracts · Article 3 of 4',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          MCX energy contracts track global benchmark prices directly — crude oil follows WTI/Brent, natural gas follows Henry Hub. Both are highly sensitive to geopolitical events and typically have the most intraday volatility of all MCX contracts.
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L per tick', 'Approx margin*', 'Expiry']}
          rows={[
            ['Crude Oil',      '100 barrels', '₹/barrel', '₹1',    '₹100/lot',  '~₹30–45K',   '19th–20th of month'],
            ['Crude Oil Mini', '10 barrels',  '₹/barrel', '₹1',    '₹10/lot',   '~₹3–5K',     '19th–20th of month'],
            ['Natural Gas',    '1,250 mmBtu', '₹/mmBtu',  '₹0.10', '₹125/lot',  '~₹20–30K',   '25th of month'],
            ['Nat Gas Mini',   '250 mmBtu',   '₹/mmBtu',  '₹0.10', '₹25/lot',   '~₹4–6K',     '25th of month'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Approximate SPAN margins at mid-2026 price levels (Crude ~₹6,500/bbl; NatGas ~₹320/mmBtu). Energy margins can spike 50–100% during geopolitical events — always check live SPAN before trading.
        </p>
        <InfoBox title="Crude Oil — the most event-driven MCX contract">
          MCX Crude is where geopolitics hits your P&amp;L fastest. OPEC production decisions, Iran-related news, and US EIA inventory data (every Wednesday at 8 PM IST) can move crude ₹200–500/bbl in minutes.<br /><br />
          <strong>Crude Oil Mini (10 barrels)</strong> is excellent for retail traders — ₹3,000–5,000 margin, manageable P&amp;L swings of ₹10 per ₹1 move. The standard 100-barrel contract requires ₹30–45K and has ₹100 P&amp;L per ₹1 move — fine for experienced traders with clear stop-losses.<br /><br />
          <strong>Expiry note</strong>: Crude expires around the 19th–20th of each month, earlier than most other MCX contracts. Holding into the last 3 days before expiry sees rapid open-interest unwinding and volatile spreads.
        </InfoBox>
        <InfoBox title="Natural Gas — high volatility, seasonal swings">
          MCX Natural Gas tracks Henry Hub (US benchmark) converted to rupees. It is the most volatile MCX contract by percentage — winter demand, US storage reports, and LNG export capacity news can cause 5–10% single-day moves.<br /><br />
          Natural Gas expires on the 25th of each month. The US EIA Natural Gas Storage report (every Thursday, ~8:30 PM IST) is the key weekly catalyst — builds above consensus fall the contract, draws below consensus push it higher.<br /><br />
          The Mini (250 mmBtu) requires only ₹4,000–6,000 margin, making it accessible — but the high volatility means even small moves can create outsized P&amp;L relative to margin. Natural gas is best avoided by beginners until comfortable with crude.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          <strong>MCX Crude vs petrol/diesel prices</strong>: MCX crude and retail fuel prices in India are linked but not directly. OMCs (BPCL, IOCL, HPCL) absorb margin compression during crude spikes before passing costs to consumers. A ₹500/bbl rise in MCX Crude does not immediately translate to a petrol price hike — but sustained crude elevation over 2–3 months typically does.
        </p>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/commodities/crude-oil" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
            MCX Crude Oil live price & analysis →
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
          <Link href="/commodities/natural-gas" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
            MCX Natural Gas →
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
          <Link href="/markets" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
            All live prices
          </Link>
        </div>
      </>
    ),
  },
  {
    id: 18,
    section: 'Contracts',
    title: 'Base metals — Copper, Aluminium, Zinc, Lead, Nickel',
    label: 'Contracts · Article 4 of 4',
    content: (
      <>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8, marginBottom: 20 }}>
          MCX base metals are the industrial heartbeat of the commodity market. Unlike gold, their price is driven almost entirely by real economic activity — manufacturing, construction, infrastructure. China, which consumes 40–55% of most base metals globally, is the dominant price driver.
        </p>
        <ArticleTable
          headers={['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L per tick', 'Approx margin*', 'Key driver']}
          rows={[
            ['Copper',          '1,000 kg (1 MT)',   '₹/kg',  '₹0.05', '₹50/lot',   '~₹80K–1.2L',  'China manufacturing, LME'],
            ['Copper Mini',     '250 kg',             '₹/kg',  '₹0.05', '₹12.5/lot', '~₹20–30K',    'Retail traders'],
            ['Aluminium',       '5,000 kg (5 MT)',   '₹/kg',  '₹0.05', '₹250/lot',  '~₹25–40K',    'Auto, packaging, infra'],
            ['Aluminium Mini',  '1,000 kg (1 MT)',   '₹/kg',  '₹0.05', '₹50/lot',   '~₹5–8K',      'Small capital entry'],
            ['Zinc',            '5,000 kg (5 MT)',   '₹/kg',  '₹0.05', '₹250/lot',  '~₹30–50K',    'Galvanising, construction'],
            ['Zinc Mini',       '1,000 kg (1 MT)',   '₹/kg',  '₹0.05', '₹50/lot',   '~₹6–10K',     'Retail traders'],
            ['Lead',            '5,000 kg (5 MT)',   '₹/kg',  '₹0.05', '₹250/lot',  '~₹50–70K',    'Auto batteries, cables'],
            ['Lead Mini',       '1,000 kg (1 MT)',   '₹/kg',  '₹0.05', '₹50/lot',   '~₹10–14K',    'Retail traders'],
            ['Nickel',          '250 kg',             '₹/kg',  '₹0.10', '₹25/lot',   '~₹20–30K',    'Stainless steel, EV batteries'],
            ['Nickel Mini',     '100 kg',             '₹/kg',  '₹0.10', '₹10/lot',   '~₹8–12K',     'Small capital entry'],
          ]}
        />
        <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 6, lineHeight: 1.6 }}>
          * Approximate SPAN margins at mid-2026 levels. All base metals expire on the last working day of the contract month. Verify live margins on your broker&apos;s SPAN calculator — base metal margins shift with LME inventory reports.
        </p>
        <InfoBox title="Copper — the economic barometer">
          Copper is called &quot;Dr. Copper&quot; because its price historically predicts economic turning points before equity markets do. When China&apos;s PMI (Purchasing Managers&apos; Index) rises, copper leads higher. When China announces stimulus, copper is often the first MCX contract to react.<br /><br />
          MCX Copper tracks COMEX copper (quoted in ¢/lb) converted to ₹/kg. Formula: COMEX ¢/lb × 22.0462 × USD/INR ÷ 100 × (1 + duty). A 1% COMEX copper move translates to roughly 1% on MCX Copper, amplified by any USD/INR move on the same day.<br /><br />
          <strong>Copper Mini (250 kg)</strong> is the most practical entry — ₹20,000–30,000 margin, accessible for retail.
        </InfoBox>
        <InfoBox title="Nickel — the EV battery wildcard">
          Nickel is the most volatile MCX base metal. It surged 250% in a single week in March 2022 on the LME (a historic short squeeze), forcing LME to halt trading. MCX Nickel followed with massive moves.<br /><br />
          The long-term demand driver is EV batteries (nickel-manganese-cobalt cells) and stainless steel (68% of global nickel demand). Watch: any Tesla or BYD production data, Indonesian nickel export policy, and LME nickel inventory reports.<br /><br />
          Given its extreme volatility, Nickel is best approached with tight stop-losses and smaller position sizing than other base metals — even with the Mini (100 kg) contract.
        </InfoBox>
        <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.8 }}>
          <strong>Zinc and Lead</strong> tend to move together — both are by-products of mining operations and share many of the same demand drivers (construction for zinc galvanising; auto battery replacement cycle for lead). Aluminium has the most direct India-specific demand angle: packaging, two-wheeler manufacturing, and infrastructure spending. When India&apos;s Union Budget announces large infra allocation, aluminium and copper are typically the first MCX base metals to react.
        </p>
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/commodities/copper" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 500, textDecoration: 'none' }}>
            MCX Copper live price & analysis →
          </Link>
          <span style={{ color: 'var(--border)', fontSize: 13 }}>|</span>
          <Link href="/markets" style={{ fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
            All live prices
          </Link>
        </div>
      </>
    ),
  },
  ] // end return
} // end buildArticles

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

export default function LearnPage({ specs }: { specs?: ContractSpecs | null }) {
  const ARTICLES = buildArticles(specs ?? null)
  const SECTIONS = Array.from(new Set(ARTICLES.map(a => a.section)))
  const [activeId, setActiveId] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const active = ARTICLES[activeId]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function selectArticle(id: number) {
    setActiveId(id)
    setTocOpen(false)
    if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const SidebarNav = () => (
    <>
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
          {ARTICLES.filter(a => a.section === section).map(article => {
            const navStyle = {
              display: 'block', width: '100%', textAlign: 'left' as const,
              padding: '10px 16px', borderBottom: '1px solid var(--border)',
              fontSize: 13,
              color: activeId === article.id ? 'var(--gold)' : 'var(--ink-3)',
              fontWeight: (activeId === article.id ? 500 : 400) as number,
              background: activeId === article.id ? 'var(--gold-pale)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)', transition: 'all .15s',
              textDecoration: 'none',
            }
            if (article.href) {
              return (
                <Link key={article.id} href={article.href} style={navStyle}>
                  {article.title} ↗
                </Link>
              )
            }
            return (
              <button
                key={article.id}
                onClick={() => selectArticle(article.id)}
                style={{ ...navStyle, border: 'none', width: '100%' }}
              >
                {article.title}
              </button>
            )
          })}
        </div>
      ))}
    </>
  )

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? 24 : 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          Learn
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          All MCX contracts &amp; lot sizes, trading mechanics, market drivers, hedging and taxation — explained clearly.
        </p>
      </div>

      {isMobile ? (
        /* ── Mobile layout ── */
        <div>
          {/* Collapsible TOC toggle */}
          <button
            onClick={() => setTocOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', marginBottom: tocOpen ? 0 : 16,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: tocOpen ? '10px 10px 0 0' : 10,
              fontSize: 13, fontWeight: 500, color: 'var(--ink)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            <span>
              <span style={{ color: 'var(--ink-4)', marginRight: 6, fontSize: 11 }}>READING:</span>
              {active.title}
            </span>
            <span style={{ fontSize: 16, color: 'var(--ink-3)' }}>{tocOpen ? '✕' : '☰'}</span>
          </button>

          {/* TOC dropdown */}
          {tocOpen && (
            <div style={{
              border: '1px solid var(--border)', borderTop: 'none',
              borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: 16,
            }}>
              <SidebarNav />
            </div>
          )}

          {/* Article content */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '24px 18px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
              {active.label}
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, lineHeight: 1.3, color: 'var(--ink)', margin: '0 0 20px' }}>
              {active.title}
            </h2>
            {active.content}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', gap: 8 }}>
              {activeId > 0 ? (
                <button onClick={() => selectArticle(activeId - 1)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-2)',
                  background: 'none', fontSize: 12, fontWeight: 500, color: 'var(--ink)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'left',
                }}>
                  ← {ARTICLES[activeId - 1].title}
                </button>
              ) : <span />}
              {activeId < ARTICLES.length - 1 ? (
                <button onClick={() => selectArticle(activeId + 1)} style={{
                  flex: 1, padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-2)',
                  background: 'none', fontSize: 12, fontWeight: 500, color: 'var(--ink)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)', textAlign: 'right',
                }}>
                  {ARTICLES[activeId + 1].title} →
                </button>
              ) : <span />}
            </div>
          </div>
        </div>
      ) : (
        /* ── Desktop layout ── */
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 28, alignItems: 'start' }}>

          {/* Sidebar nav */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden', position: 'sticky', top: 80,
          }}>
            <SidebarNav />
          </div>

          {/* Article content */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 36,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>
              {active.label}
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, lineHeight: 1.3, color: 'var(--ink)', margin: '0 0 24px' }}>
              {active.title}
            </h2>
            {active.content}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              {activeId > 0 ? (
                <button onClick={() => selectArticle(activeId - 1)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 6, border: '1px solid var(--border-2)',
                  background: 'none', fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}>
                  ← {ARTICLES[activeId - 1].title}
                </button>
              ) : <span />}
              {activeId < ARTICLES.length - 1 ? (
                <button onClick={() => selectArticle(activeId + 1)} style={{
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
      )}
    </div>
  )
}

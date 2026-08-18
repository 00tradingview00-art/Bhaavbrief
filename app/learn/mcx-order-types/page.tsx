import Link from 'next/link'
import { safeJsonLd } from '@/lib/seo'

export const metadata = {
  title: 'MCX Order Types Explained — Limit, Market, SL, SL-M Orders India 2026',
  description: 'How to place orders on MCX: Market order, Limit order, Stop Loss (SL), Stop Loss Market (SL-M) explained with worked examples for Indian commodity traders. When to use each order type on MCX gold, crude oil, and silver.',
  keywords: [
    'MCX order types India explained',
    'how to place MCX order India',
    'MCX SL-M order explained',
    'MCX limit order vs market order',
    'stop loss order MCX India',
    'MCX SL order vs SL-M order',
    'how to set stop loss on MCX',
    'MCX order types for beginners India',
    'MCX buy sell order types',
    'MCX bracket order cover order India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-order-types' },
  openGraph: {
    title: 'MCX Order Types India 2026 — Limit, SL, SL-M Explained | BhaavBrief',
    description: 'Market, Limit, SL, SL-M orders explained for MCX commodity trading in India. When to use each, worked examples, and common beginner mistakes.',
    url: 'https://bhaavbrief.in/learn/mcx-order-types',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Order+Types+Explained&tags=Beginner,Orders,MCX+India', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Order Types India 2026 | BhaavBrief', description: 'Limit, Market, SL, SL-M orders for MCX explained with worked examples. The stop loss order most beginners place wrong.', site: '@bhaavbrief' },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Order Types Explained' },
  ],
}

const HOWTO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to place a stop loss order on MCX',
  description: 'Step-by-step guide to placing an SL-M (Stop Loss Market) order on MCX to protect your position from large losses.',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Open your broker trading terminal', text: 'Log in to Zerodha Kite, Angel One, or your broker\'s MCX terminal. Navigate to the MCX section and find the contract you are trading (e.g., Gold Mini June).' },
    { '@type': 'HowToStep', position: 2, name: 'Select SL-M as the order type', text: 'In the order window, change Order Type from "Market" to "SL-M" (Stop Loss Market). Do NOT use a plain "SL" (Stop Loss Limit) as a stop loss — if price gaps through your limit, the order will not execute.' },
    { '@type': 'HowToStep', position: 3, name: 'Enter the trigger price only', text: 'SL-M requires only a Trigger Price (no limit price). Enter the price at which you want to be stopped out. Example: if you bought Gold Mini at ₹91,500/10g, set trigger at ₹91,000 to limit loss to ₹500/10g (₹5,000 on 100g lot).' },
    { '@type': 'HowToStep', position: 4, name: 'Verify the order is on the correct side', text: 'If you are LONG (bought), your stop loss order must be a SELL SL-M. If you are SHORT (sold), your stop loss must be a BUY SL-M. This is the most common beginner error — placing an SL on the wrong side.' },
    { '@type': 'HowToStep', position: 5, name: 'Confirm the order and check order book', text: 'After placing, check your order book to confirm the SL-M shows as "Pending" with the correct trigger price. It will execute automatically when MCX price touches or crosses your trigger — you do not need to be watching the screen.' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What are the different order types on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX supports four main order types: (1) Market Order — executes immediately at the current best available price. Fast, but you may get a different price than expected during volatile periods. (2) Limit Order — executes only at your specified price or better. Safer for entry, but may not execute if price moves away. (3) SL (Stop Loss Limit) — triggers when price hits your trigger, then places a limit order. Has execution risk if price gaps. (4) SL-M (Stop Loss Market) — triggers when price hits your trigger, then places a market order for instant execution. Recommended for stop losses. Some brokers also offer Bracket Orders and Cover Orders which include automatic stop losses built in.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between SL and SL-M order on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'SL (Stop Loss Limit): Requires two prices — a trigger price and a limit price. When the trigger is hit, it places a limit order at your limit price. Problem: if the market gaps past your limit (e.g., news causes a sudden ₹200 move), your limit order may not get filled, leaving you still in a losing position. SL-M (Stop Loss Market): Requires only a trigger price. When the trigger is hit, it places a market order — which WILL execute at whatever the current market price is. You may get a slightly worse price than the trigger, but you WILL exit the position. For stop losses, always use SL-M over SL unless you have a very specific reason to use a limit.' },
    },
    {
      '@type': 'Question',
      name: 'When should I use a Market order vs Limit order on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Use Market order when: speed is more important than price — you want to enter/exit immediately, especially during fast-moving news events. Be aware that during thin liquidity (MCX mid-afternoon, or first/last few minutes), market orders can cause significant slippage. Use Limit order when: you have a specific entry price in mind and are willing to wait. Example: Gold Mini is at ₹91,800 and you only want to buy at ₹91,600 — place a buy limit at ₹91,600 and it executes only if price falls to that level. If price never reaches ₹91,600, the order stays open. Limit orders do not guarantee execution.' },
    },
    {
      '@type': 'Question',
      name: 'How do I set a stop loss on MCX Gold Mini?',
      acceptedAnswer: { '@type': 'Answer', text: 'Example: You buy 1 lot of MCX Gold Mini at ₹91,500/10g. Your maximum acceptable loss is ₹5,000 (₹500/10g on a 100g lot). Place a Sell SL-M order with trigger price at ₹91,000/10g. When MCX Gold falls to ₹91,000, the SL-M auto-triggers and sells your 1 lot at the next available market price (likely ₹91,000 ± ₹50 depending on liquidity). Important: the SL-M executes as a market order — during high-volatility periods, you may get filled slightly below ₹91,000. This is called slippage, and it is normal. Set your trigger a few points wider than your actual stop to account for it.' },
    },
    {
      '@type': 'Question',
      name: 'What is a Cover Order and Bracket Order on MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Cover Order (CO): An entry order + mandatory stop loss in a single order. You enter a position and simultaneously set a stop loss. Cover Orders typically offer lower margin requirements (some brokers give 50% lower margin for CO) because the stop loss limits broker exposure. The stop cannot be removed — it is locked until you square off the position. Bracket Order (BO): Entry order + stop loss + target price, all in one. When either your stop loss OR target price is hit, the position closes and the other order cancels. BO and CO availability varies by broker — check your specific platform. Note: Cover and Bracket Orders typically do not work in the last 20–30 minutes before MCX close.' },
    },
    {
      '@type': 'Question',
      name: 'Can I place MCX orders after market hours?',
      acceptedAnswer: { '@type': 'Answer', text: 'Most brokers allow After Market Orders (AMO) on MCX — orders placed between 11:45 PM and 8:45 AM that execute at MCX open (9:00 AM). AMOs are useful if you know you want to trade the morning open but cannot be at your terminal at 9 AM. However, AMO prices can be significantly different from the previous night\'s close if global markets moved overnight (COMEX, NYMEX). Always set a limit AMO (not a market AMO) to avoid paying the wrong price at open.' },
    },
  ],
}

export default function Page() {
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 40 }
  const h3: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 500, color: '#18180F', marginBottom: 8, marginTop: 24 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const warnBox: React.CSSProperties = { background: '#FFF8F0', borderLeft: '3px solid #E05C00', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const th: React.CSSProperties = { padding: '9px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #E5E5DC', fontSize: 14, color: '#18180F', verticalAlign: 'top', lineHeight: 1.6 }
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' }

  const orderTypes = [
    {
      type: 'Market Order',
      abbr: 'MKT',
      when: 'Immediate execution needed',
      risk: 'Slippage — you may pay more than expected',
      useFor: 'Fast entry/exit during news events',
      avoid: 'Mid-afternoon thin liquidity',
      color: '#2E6E3B',
    },
    {
      type: 'Limit Order',
      abbr: 'LMT',
      when: 'You have a specific entry/exit price',
      risk: 'May not execute if price never reaches your level',
      useFor: 'Patient entries at support/resistance',
      avoid: 'Fast-moving markets — order left unfilled',
      color: '#2E6E3B',
    },
    {
      type: 'Stop Loss (SL)',
      abbr: 'SL',
      when: 'You want to exit at a price but have a limit floor',
      risk: 'If market gaps past your limit, order may not fill',
      useFor: 'Rarely — advanced use only',
      avoid: 'Do NOT use as primary stop loss',
      color: '#7A6000',
    },
    {
      type: 'Stop Loss Market (SL-M)',
      abbr: 'SL-M',
      when: 'You want guaranteed stop loss execution',
      risk: 'Small slippage at execution, but WILL exit',
      useFor: 'All stop losses — this is the standard',
      avoid: 'Nothing — always use SL-M for stops',
      color: '#C8720A',
    },
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(HOWTO_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-mono)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Order Types Explained</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Order Types Explained — Limit, Market, SL and SL-M
        </h1>
        <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: 32, lineHeight: 1.6 }}>
          The four order types on MCX, when to use each, and the stop loss mistake most beginners make on their first trade.
        </p>

        <div style={infoBox}>
          <strong>Most important rule:</strong> Always use <strong>SL-M (Stop Loss Market)</strong> — not SL (Stop Loss Limit) — for your stop losses on MCX. SL-M guarantees exit when the trigger price is hit. SL can leave you stuck in a losing position if the market gaps through your limit.
        </div>

        <h2 style={h2}>The 4 MCX Order Types at a Glance</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {orderTypes.map((o, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${o.color}`, padding: '14px 18px', background: '#FAFAF7', borderRadius: '0 4px 4px 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: o.color, fontSize: 15 }}>{o.type}</span>
                <span style={{ ...mono, fontSize: 11, background: '#F0EFE8', padding: '2px 6px', borderRadius: 3, color: '#48483A' }}>{o.abbr}</span>
              </div>
              <div style={{ fontSize: 14, color: '#48483A', lineHeight: 1.7 }}>
                <span style={{ fontWeight: 600 }}>Use when: </span>{o.when}<br />
                <span style={{ fontWeight: 600 }}>Best for: </span>{o.useFor}<br />
                <span style={{ fontWeight: 600, color: '#C0392B' }}>Risk: </span>{o.risk}
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Market Order — Speed Over Price</h2>
        <p style={prose}>
          A market order executes immediately at the current best available price in the MCX order book. You get filled instantly, but you have no control over the exact price.
        </p>
        <div style={infoBox}>
          <strong>Example:</strong> MCX Gold Mini is at Bid ₹91,500 / Ask ₹91,502. You place a Buy Market order for 1 lot. You get filled at ₹91,502 (the ask). Total cost: ₹91,502 × 100g = ₹91,50,200 (of which ₹60,000 is your margin; the rest is your P&amp;L exposure).
        </div>
        <p style={prose}>
          During thin liquidity (MCX mid-afternoon, or the first 5 minutes after MCX open), the spread between bid and ask can widen to ₹10–30 on Gold Mini. A market order in this window means you pay the full wide spread as an immediate loss. Always check the order book depth before using a market order.
        </p>

        <h2 style={h2}>Limit Order — Price Control, No Guarantee</h2>
        <p style={prose}>
          A limit order executes only at your specified price or better. A buy limit order will only fill at your limit or lower; a sell limit will only fill at your limit or higher.
        </p>
        <div style={infoBox}>
          <strong>Example:</strong> MCX Gold Mini is trading at ₹91,800. You believe it will dip to ₹91,500 before rallying. You place a Buy Limit at ₹91,500. If price falls to ₹91,500, your order executes. If it never falls that low and instead rallies from ₹91,800, your order stays open unfilled. You missed the trade — but you also did not buy at the wrong price.
        </div>
        <p style={prose}>
          Limit orders are best for patient traders who have a clear entry level based on support/resistance analysis. They do not guarantee execution, so if you need to be in a trade, a limit order may leave you out.
        </p>

        <h2 style={h2}>SL vs SL-M — The Stop Loss You Are Probably Placing Wrong</h2>
        <p style={prose}>
          This is the most consequential choice for risk management on MCX — and the one most beginners get wrong.
        </p>

        <h3 style={h3}>SL (Stop Loss Limit) — Has Execution Risk</h3>
        <p style={prose}>
          An SL order requires two inputs: a <strong>Trigger Price</strong> and a <strong>Limit Price</strong>. When MCX price hits your trigger, a limit order is placed at your limit price.
        </p>
        <div style={warnBox}>
          <strong>The danger:</strong> If MCX Gold suddenly gaps down by ₹300 due to a Fed announcement, your trigger fires at ₹91,000 but the market is already at ₹90,700. Your limit order at ₹90,950 does not fill — no buyer wants to pay that above the current market. You are still in the position, now with a ₹500/10g additional loss and no stop in place.
        </div>

        <h3 style={h3}>SL-M (Stop Loss Market) — Guaranteed Exit</h3>
        <p style={prose}>
          SL-M requires only a <strong>Trigger Price</strong>. When MCX hits your trigger, it fires a market order — which WILL fill at whatever price is available. You may get ₹10–30 worse than your trigger, but you WILL exit.
        </p>
        <div style={infoBox}>
          <strong>Same scenario with SL-M:</strong> Gold gaps to ₹90,700 on Fed news. Your SL-M trigger at ₹91,000 fires. Market order executes at ₹90,680 (best available bid). You take an extra ₹320/10g slippage vs your trigger — ₹3,200 extra loss on 1 Gold Mini lot. But you are OUT. Compare to the SL scenario where you are still holding and Gold falls another ₹400 to ₹90,300 before you panic-sell.
        </div>
        <p style={prose}>
          Always use SL-M for stop losses. The slippage is real but bounded. An unfilled SL limit in a gap scenario is unbounded.
        </p>

        <h2 style={h2}>How to Place an SL-M Stop Loss — Step by Step</h2>
        <ol style={{ paddingLeft: 24, marginBottom: 20 }}>
          {HOWTO_SCHEMA.step.map((s) => (
            <li key={s.position} style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 12 }}>
              <strong>{s.name}:</strong> {s.text}
            </li>
          ))}
        </ol>

        <h2 style={h2}>Cover Order and Bracket Order</h2>
        <div style={{ overflowX: 'auto', marginBottom: 28 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E5DC' }}>
            <thead>
              <tr>
                <th style={th}>Order Type</th>
                <th style={th}>What It Does</th>
                <th style={th}>Margin Benefit</th>
                <th style={th}>Best Used For</th>
              </tr>
            </thead>
            <tbody>
              {[
                { type: 'Cover Order (CO)', what: 'Entry + mandatory SL-M in one order. SL cannot be removed.', margin: 'Lower margin (40–60% of normal, varies by broker)', best: 'Intraday trades where you want lower capital requirement with forced stop loss' },
                { type: 'Bracket Order (BO)', what: 'Entry + SL + Target price. When one triggers, the other cancels.', margin: 'Lower margin, similar to CO', best: 'Intraday trades with defined entry, stop, and target — hands-free once placed' },
              ].map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#FAFAF7' }}>
                  <td style={{ ...td, fontWeight: 600 }}>{r.type}</td>
                  <td style={{ ...td, fontSize: 13 }}>{r.what}</td>
                  <td style={{ ...td, fontSize: 13, color: '#2E6E3B', fontWeight: 500 }}>{r.margin}</td>
                  <td style={{ ...td, fontSize: 13, color: '#48483A' }}>{r.best}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 13, color: '#8A8A7A', marginBottom: 28 }}>
          Note: CO and BO availability varies by broker. Both are intraday-only and are auto-squared off before MCX close (usually 20–30 minutes before 11:30 PM). Not available in the last 20–30 minutes of the MCX session.
        </p>

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
          <Link href="/learn/how-much-money-to-start-mcx-trading" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → How much capital do I need for MCX?
          </Link>
          <Link href="/learn/mcx-trading-hours" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX trading hours and best windows
          </Link>
          <Link href="/learn/which-mcx-commodity-to-trade" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → Which MCX commodity to trade?
          </Link>
          <Link href="/learn/mcx-margin-calculator" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → MCX margin calculator
          </Link>
          <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none' }}>
            → All MCX guides
          </Link>
        </div>

        <p style={{ fontSize: 12, color: '#8A8A7A', marginTop: 32, lineHeight: 1.7, borderTop: '1px solid #E5E5DC', paddingTop: 20 }}>
          Disclaimer: Order type availability and exact behaviour may vary by broker platform. Always check your specific broker&apos;s documentation. MCX commodity trading involves substantial risk of loss. This is educational content only and not investment advice.
        </p>
      </div>
    </>
  )
}

import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import SubscribeForm from '@/components/SubscribeForm'
import { safeJsonLd } from '@/lib/seo'

interface Prices {
  electricity: number
  snapshotDate: string
  isLive: boolean
}

// No live MCX_ELECTRICITY field exists in either fallback tier yet (this is a
// newly launched 2026 contract) — the ₹5,800/MWh static fallback below is
// derived from MCX's own reported Sept 4 2026 record session (₹245 crore
// turnover ÷ 4.20 lakh MWh volume), not invented, and is clearly labeled
// as such rather than presented as a live quote.
function loadPrices(): Prices {
  const cwd = process.cwd()
  try {
    const snap = JSON.parse(fs.readFileSync(path.join(cwd, 'data/market-snapshot.json'), 'utf8'))
    const i = snap.instruments
    if (i?.MCX_ELECTRICITY?.price) {
      return {
        electricity: i.MCX_ELECTRICITY.price,
        snapshotDate: snap.generatedAtIST ?? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }),
        isLive: true,
      }
    }
  } catch { /* fall through */ }
  return { electricity: 5800, snapshotDate: 'Sep 2026 (derived, not live)', isLive: false }
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

function fmtValue(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} crore`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} lakh`
  return `₹${fmt(Math.round(v))}`
}

function marginRange(cv: number, lo = 0.10, hi = 0.15): string {
  const low  = Math.round(cv * lo / 1000) * 1000
  const high = Math.round(cv * hi / 1000) * 1000
  return `${fmtValue(low)} – ${fmtValue(high)}`
}

export const metadata = {
  title: 'MCX Electricity Futures Contract 2026: Lot Size, Margin & Specs',
  description: 'MCX Electricity futures contract explained: 50 MWh lot size, ₹1/MWh tick, cash settlement against the IEX Day-Ahead Market price, margin, trading hours, and why there are no options yet.',
  keywords: [
    'MCX electricity futures contract specifications',
    'MCX electricity lot size',
    'MCX electricity futures margin',
    'MCX electricity tick size',
    'IEX day ahead market MCX electricity',
    'MCX electricity futures explained',
    'MCX electricity options',
    'MCX electricity trading hours',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn/mcx-electricity-contract' },
  openGraph: {
    title: 'MCX Electricity Futures Contract 2026 — Full Specs | BhaavBrief',
    description: 'Lot size, tick size, margin, settlement and trading hours for MCX Electricity futures — India\'s newest commodity derivative.',
    url: 'https://bhaavbrief.in/learn/mcx-electricity-contract',
    siteName: 'BhaavBrief',
    type: 'article' as const,
    locale: 'en_IN',
    images: [{ url: 'https://bhaavbrief.in/api/og?title=MCX+Electricity+Futures+2026&tags=Lot+Size,Margin,IEX+DAM', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image' as const, title: 'MCX Electricity Futures Contract 2026 | BhaavBrief', description: 'Lot size, margin, settlement and trading hours for MCX Electricity futures.', site: '@bhaavbrief', images: ['https://bhaavbrief.in/api/og?title=MCX+Electricity+Futures+2026&tags=Lot+Size,Margin,IEX+DAM'] },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',  item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Learn', item: 'https://bhaavbrief.in/learn' },
    { '@type': 'ListItem', position: 3, name: 'MCX Electricity Futures Contract' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the MCX Electricity futures lot size?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Electricity futures have a lot size of 50 MWh, quoted in ₹ per MWh. You can trade a minimum of 1 lot and a maximum of 50 lots per order. The tick size is ₹1/MWh, which works out to ₹50 profit or loss per lot for every ₹1/MWh the price moves.' },
    },
    {
      '@type': 'Question',
      name: 'Why is MCX Electricity cash-settled only, with no physical delivery?',
      acceptedAnswer: { '@type': 'Answer', text: 'Electricity cannot be stored or delivered like gold or crude oil — it must be consumed as it is generated. So MCX Electricity futures are cash-settled only: at expiry, your position is settled in rupees against the reference price, with no delivery process, vaults, or KYC-for-delivery requirements that apply to MCX\'s physical-delivery contracts like gold or silver.' },
    },
    {
      '@type': 'Question',
      name: 'Are there options on MCX Electricity futures?',
      acceptedAnswer: { '@type': 'Answer', text: 'Not as of this writing. MCX has listed only electricity futures — no options chain exists yet, unlike gold, silver, crude oil, natural gas, and copper, which all have MCX options. Reports around the futures launch noted that electricity options "might follow" in the future, but no launch has been confirmed.' },
    },
    {
      '@type': 'Question',
      name: 'What price does MCX Electricity futures settle against?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Electricity futures cash-settle against the Volume Weighted Average of the Unconstrained Market Clearing Price (UMCP) on the Indian Energy Exchange\'s (IEX) Day-Ahead Market (DAM) — the price at which India\'s spot electricity market clears a day ahead of actual delivery. This ties the MCX futures price directly to real-time power demand and supply conditions.' },
    },
    {
      '@type': 'Question',
      name: 'Why does both SEBI and CERC regulate MCX Electricity futures?',
      acceptedAnswer: { '@type': 'Answer', text: 'This is a genuinely unusual dual-regulator setup. SEBI (Securities and Exchange Board of India) regulates the MCX derivative itself, the same as any other commodity futures contract. CERC (Central Electricity Regulatory Commission) regulates the underlying IEX spot market that the contract references. Traders don\'t interact with CERC directly, but this split reflects electricity\'s unique status as both a traded commodity and a regulated utility.' },
    },
    {
      '@type': 'Question',
      name: 'What happens when an MCX Electricity futures contract expires?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX lists Electricity futures for near, next, and far months, with contracts currently trading across four expiry months at once. At expiry, every open position is cash-settled against the reference IEX DAM price — automatically, with no delivery intention filing or physical settlement process. This is simpler for traders than MCX\'s physically-deliverable contracts, where positions must be squared off before expiry to avoid delivery.' },
    },
  ],
}

export default function Page() {
  const p = loadPrices()

  const contractValue = p.electricity * 50
  const tickValue = 50

  const cell: React.CSSProperties = { padding: '10px 14px', borderTop: '1px solid #DDDDD0', fontSize: 15, color: '#18180F', verticalAlign: 'top' }
  const hcell: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600, color: '#8A8A7A', background: '#F3F2EC', fontFamily: 'var(--font-sans)' }
  const accent: React.CSSProperties = { color: '#C8720A', fontWeight: 500 }
  const sub: React.CSSProperties = { fontSize: 11, color: '#8A8A7A' }
  const infoBox: React.CSSProperties = { background: '#F8F7F2', borderLeft: '3px solid #C8720A', padding: '16px 20px', marginBottom: 24, borderRadius: '0 4px 4px 0' }
  const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: '#18180F', marginBottom: 12, marginTop: 36 }
  const prose: React.CSSProperties = { fontSize: 15, color: '#48483A', lineHeight: 1.8, marginBottom: 16 }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(FAQ_SCHEMA) }} />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 16px 64px' }}>

        <nav style={{ fontSize: 12, color: '#8A8A7A', marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          <Link href="/" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Home</Link>
          {' / '}
          <Link href="/learn" style={{ color: '#8A8A7A', textDecoration: 'none' }}>Learn</Link>
          {' / '}
          <span style={{ color: '#18180F' }}>MCX Electricity Futures Contract</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, lineHeight: 1.25, color: '#18180F', marginBottom: 8 }}>
          MCX Electricity Futures Contract 2026: Lot Size, Margin &amp; Specs
        </h1>
        <p style={{ fontSize: 12, color: '#8A8A7A', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
          MCX Electricity at <strong style={{ color: '#18180F' }}>₹{fmt(p.electricity)}/MWh</strong> · {p.snapshotDate}{p.isLive ? ' · Updated on every deploy' : ''}
        </p>

        <p style={prose}>
          MCX Electricity is India&apos;s newest commodity derivative — launched in 2026, it is the first MCX contract that is <strong>cash-settled only</strong> and references a real-time spot market price (the IEX Day-Ahead Market) instead of a global benchmark or physical delivery. It currently has <strong>one contract shape</strong> (no Mini/Standard split like gold or silver) and <strong>no options chain</strong>.
        </p>

        {/* Master spec table */}
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '0.5px solid #DDDDD0' }}>
            <thead>
              <tr>
                {['Contract', 'Lot Size', 'Quoted', 'Tick Size', 'P&L / tick', 'Contract Value*', 'Margin*', 'Settlement'].map(h => (
                  <th key={h} style={hcell}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={cell}><strong>Electricity</strong></td>
                <td style={cell}>50 MWh</td>
                <td style={cell}>₹/MWh</td>
                <td style={cell}>₹1</td>
                <td style={cell}>₹{tickValue}/lot</td>
                <td style={{ ...cell, ...accent }}>{fmtValue(contractValue)}</td>
                <td style={cell}>{marginRange(contractValue)}</td>
                <td style={{ ...cell, fontSize: 12, color: '#8A8A7A' }}>Cash only — no delivery</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ ...sub, marginBottom: 32 }}>
          * At {p.snapshotDate} MCX Electricity price of ₹{fmt(p.electricity)}/MWh{p.isLive ? '' : ' (derived from reported turnover/volume, not a live quote — this page updates automatically once a live feed is available)'}. Margin indicative at 10–15% of contract value per MCX&apos;s published 10%-or-SPAN-whichever-is-higher rule; actual margin set by MCX and your broker daily. Verify on your broker&apos;s SPAN calculator before trading.
        </p>

        <h2 style={h2}>Why Electricity trades differently from every other MCX contract</h2>
        <p style={prose}>
          Every other MCX contract — gold, silver, crude oil, base metals — either allows physical delivery or tracks a global exchange benchmark (COMEX, LME, Henry Hub) via an import-parity formula. Electricity does neither. It cannot be stored, so delivery is impossible; and there is no global &quot;electricity price&quot; to import-parity against, since power markets are inherently local and grid-specific.
        </p>
        <div style={infoBox}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', marginBottom: 8 }}>What the contract settles against</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: '#18180F' }}>
            <li><strong>Reference price:</strong> Volume Weighted Average of the Unconstrained Market Clearing Price (UMCP) on the IEX Day-Ahead Market (DAM)</li>
            <li><strong>Settlement:</strong> Cash only — no physical delivery, no vaults, no delivery KYC</li>
            <li><strong>Regulation:</strong> SEBI regulates the MCX futures contract; CERC regulates the underlying IEX spot market</li>
            <li><strong>Contract months:</strong> Near, next, and far month — trading has been active across four expiry months at once</li>
          </ul>
        </div>

        <h2 style={h2}>Worked example</h2>
        <div style={{ overflowX: 'auto', marginBottom: 24 }}>
          <div style={{ background: '#F3F2EC', padding: '16px 20px', fontFamily: 'var(--font-sans)', fontSize: 15, lineHeight: 2, color: '#18180F', minWidth: 300 }}>
            Example: Buy 1 lot of MCX Electricity at ₹{fmt(p.electricity)}/MWh<br />
            Contract value = ₹{fmt(p.electricity)} × 50 = <strong>{fmtValue(contractValue)}</strong><br />
            Margin (at ~10%) = <strong>₹{fmt(Math.round(contractValue * 0.10))}</strong><br />
            <br />
            Price rises ₹200/MWh → Profit = ₹200 × 50 = <strong>+₹10,000</strong><br />
            Price falls ₹200/MWh → Loss = ₹200 × 50 = <strong>−₹10,000</strong><br />
            (₹200 move = {((200 / p.electricity) * 100).toFixed(1)}% of current price)
          </div>
        </div>

        <h2 style={h2}>Trading hours and margin</h2>
        <p style={prose}>
          MCX Electricity trades on the same session as every other MCX commodity — 9:00 AM to 11:30 PM IST on weekdays (extended to 11:55 PM during the US daylight-saving window). Margin is set at <strong>10% of contract value, or SPAN, whichever is higher</strong> — a simpler rule than the tiered SPAN ranges used for gold or crude, but one that can still move meaningfully if the IEX DAM price becomes volatile (heatwaves, coal shortages, or grid stress can all widen the effective margin overnight).
        </p>

        <h2 style={h2}>No options — yet</h2>
        <p style={prose}>
          Unlike gold, silver, crude oil, natural gas, and copper, MCX Electricity has no listed options contract as of this writing. Only a plain long or short futures position is available. This site&apos;s Strategy Builder tool reflects this — Electricity appears there as a futures-only instrument, without the strike-chain and options-strategy templates used for the other five.
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
          <div style={{ fontSize: 10, fontFamily: 'var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A8A7A', marginBottom: 16 }}>Continue reading</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/learn" style={{ fontSize: 15, color: '#C8720A', textDecoration: 'none', border: '0.5px solid #C8720A', padding: '8px 14px' }}>
              ← Learn hub
            </Link>
            <Link href="/learn/mcx-lot-sizes" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              All MCX lot sizes →
            </Link>
            <Link href="/commodities/electricity" style={{ fontSize: 15, color: '#18180F', textDecoration: 'none', border: '0.5px solid #DDDDD0', padding: '8px 14px' }}>
              Electricity live price &amp; analysis →
            </Link>
          </div>
        </div>

        <div style={{ background: '#F3F2EC', border: '0.5px solid #C8C8B8', padding: '1.5rem', marginTop: 40 }}>
          <SubscribeForm location="learn_mcx-electricity-contract" />
        </div>

        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-sans)', marginTop: 24, lineHeight: 1.6 }}>
          BhaavBrief · MCX commodity intelligence · Data auto-updated with every site deploy from live MCX feed once available · Last updated {p.snapshotDate}
        </p>
        <p style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
          Prices are indicative. Verify live margins on your broker&apos;s SPAN calculator before trading. Tax treatment for this newly launched, cash-settled-only contract type had not been separately confirmed as of this writing — consult a tax advisor before filing. Trading commodity futures involves significant risk of loss.
        </p>
      </div>
    </>
  )
}

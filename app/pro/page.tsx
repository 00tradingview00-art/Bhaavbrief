import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import ProCheckout from './ProCheckout'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'BhaavBrief Pro — Full MCX Options Analytics',
  description: 'Unlock the full MCX options chain, Greeks, Strategy Builder, IV analytics, and institutional positioning data. ₹33/day, ₹333/month, or ₹2,999/year.',
  keywords: [
    'MCX options analytics India subscription',
    'BhaavBrief Pro',
    'MCX options chain full India',
    'MCX Greeks India subscription',
    'MCX options strategy builder India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/pro' },
}

const FREE_FEATURES = [
  'Daily MCX brief at 9:30 AM IST',
  'Flash intelligence during market hours',
  'Live MCX prices (gold, silver, crude, copper, natgas)',
  'MCX event calendar (EIA, FOMC, RBI MPC, OPEC)',
  'ATM option row and summary stats (PCR, Max Pain, IVIX)',
  'Educational library (lot sizes, margin, Greeks basics)',
]

const PRO_WORKFLOWS: {
  title: string
  description: string
  chips: string[]
  href: string
}[] = [
  {
    title: 'Options Chain Terminal',
    description: 'Full strike ladder with live Greeks, IV quality tiers, Max Pain and PCR — what a market maker sees.',
    chips: ['All strikes & expiries', 'Delta · Gamma · Theta · Vega', 'IV quality tiers'],
    href: '/options',
  },
  {
    title: 'Volatility Analytics',
    description: 'Know when to buy volatility and when to sell it. IV Rank, IV Percentile (90-day history), IV Skew chart, OI buildup.',
    chips: ['IV Rank & Percentile', 'IV Skew CE vs PE', 'OI Buildup 90-day'],
    href: '/tools/mcx-iv-rank',
  },
  {
    title: 'Strategy Builder',
    description: '12 pre-built multi-leg templates — straddle, strangle, bull/bear spreads, covered calls. Payoff at expiry + P&L table.',
    chips: ['12 templates', 'Payoff chart', 'Greeks per leg'],
    href: '/options/strategy',
  },
  {
    title: 'Basis Dashboard',
    description: 'Commodity arbitrage intelligence — MCX vs COMEX/WTI import-parity spread, 30-day chart with ±1σ / ±2σ reference bands.',
    chips: ['30-day spread chart', 'MCX vs COMEX/WTI', '±1σ / ±2σ bands'],
    href: '/basis',
  },
  {
    title: 'Pro Research',
    description: 'Macro event analysis — FOMC, Jackson Hole, EIA, RBI MPC — with MCX-specific implications published within hours.',
    chips: ['Macro event analysis', 'MCX implications', 'Published within hours'],
    href: '/news',
  },
]

export default function ProPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem 5rem', fontFamily: 'var(--font-sans)' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.75rem' }}>
            BhaavBrief Pro
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 700, color: 'var(--ink)', marginBottom: '1rem', lineHeight: 1.15 }}>
            The MCX Options Terminal<br />India Has Been Missing
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--ink-3)', maxWidth: 540, margin: '0 auto', lineHeight: 1.6 }}>
            No dedicated options-analytics platform exists for MCX commodities. BhaavBrief Pro is built specifically for MCX — Black-76 pricing, live Greeks, and volatility analytics for Gold, Silver, Crude, Copper, and Natural Gas.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="pro-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '4rem' }}>
          <PricingCard
            plan="daily"
            label="Daily"
            price="₹33"
            sub="/day"
            note="No commitment — cancel anytime"
            cta="Start Daily"
          />
          <PricingCard
            plan="monthly"
            label="Monthly"
            price="₹333"
            sub="/month"
            note="Save ₹657 — ₹11/day"
            cta="Start Monthly"
          />
          <PricingCard
            plan="yearly"
            label="Annual"
            price="₹2,999"
            sub="/year"
            note="Save ₹997 — ₹250/month"
            highlight
            cta="Start Annual"
          />
        </div>

        {/* Pro workflows */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>
            What Pro Unlocks
          </h2>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            Five analyst workflows, built for MCX options traders.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {PRO_WORKFLOWS.map(w => (
              <Link key={w.href} href={w.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '1.5rem',
                  background: 'var(--surface-2)',
                  transition: 'border-color 0.15s',
                }} className="pro-workflow-card">
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.5rem' }}>
                    Pro
                  </div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.5rem' }}>
                    {w.title}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: '1rem' }}>
                    {w.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {w.chips.map(c => (
                      <span key={c} style={{ fontSize: '0.7rem', background: 'var(--gold-pale)', color: 'var(--gold-dark)', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Free tier */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '2rem', background: 'var(--surface-3)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--up)', marginBottom: '1rem' }}>
            Free forever — no card needed
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem' }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.87rem', color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--up)', flexShrink: 0, marginTop: 1 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <style>{`
        .pro-workflow-card:hover { border-color: var(--gold) !important; }
        @media (max-width: 640px) {
          .pro-pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

function PricingCard({
  plan, label, price, sub, note, highlight, cta,
}: {
  plan: 'daily' | 'monthly' | 'yearly'
  label: string
  price: string
  sub: string
  note?: string
  highlight?: boolean
  cta: string
}) {
  return (
    <div style={{
      border: highlight ? '2px solid var(--ink)' : '1px solid var(--border)',
      borderRadius: 8,
      padding: '1.1rem',
      position: 'relative',
      background: highlight ? 'var(--surface-3)' : 'var(--surface)',
      fontFamily: 'var(--font-sans)',
    }}>
      {highlight && (
        <span style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink)', color: '#fff', fontSize: '0.62rem', padding: '2px 10px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.05em',
        }}>
          Best value
        </span>
      )}
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--ink-3)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.2rem' }}>
        {price}<span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 400, color: 'var(--ink-3)' }}>{sub}</span>
      </div>
      {note && <div style={{ fontSize: '0.7rem', color: 'var(--up)', marginBottom: '0.7rem', fontWeight: 500 }}>{note}</div>}
      <ProCheckout plan={plan} cta={cta} />
    </div>
  )
}

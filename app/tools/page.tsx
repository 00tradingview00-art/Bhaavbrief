import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'MCX Analytics Tools — BhaavBrief',
  description: 'Free and Pro MCX analytics tools: IV Rank, Put-Call Ratio, Open Interest, Greeks, Max Pain, P&L Calculator, Bhavcopy, and Commodity Basis. Updated live.',
  keywords: [
    'MCX analytics tools India', 'MCX options tools free India',
    'MCX IV rank tool', 'MCX put call ratio calculator',
    'MCX open interest tool India', 'MCX options greeks calculator',
    'MCX max pain calculator India', 'MCX P&L calculator',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/tools' },
}

const PRO_TOOLS = [
  {
    href: '/options',
    label: 'Full Option Chain',
    desc: 'All strikes, all expiries. Live Greeks (delta, gamma, theta, vega) per row. IV quality tiers.',
  },
  {
    href: '/options/strategy',
    label: 'Strategy Builder',
    desc: '12 multi-leg templates — straddle, strangle, bull/bear spreads, covered calls. Payoff chart + P&L table.',
  },
  {
    href: '/basis',
    label: 'Basis Dashboard',
    desc: '30-day MCX vs import-parity spread chart with ±1σ / ±2σ reference bands. Commodity arbitrage intelligence.',
  },
  {
    href: '/research',
    label: 'Pro Research',
    desc: 'Macro event analysis — FOMC, Jackson Hole, EIA, RBI MPC — with MCX-specific implications published within hours.',
  },
]

const FREE_TOOLS = [
  {
    href: '/tools/mcx-iv-rank',
    label: 'IV Rank & Percentile',
    desc: 'Is MCX options cheap or expensive today? IV Rank + IV Percentile for Gold, Silver, Crude, Copper, Natural Gas.',
  },
  {
    href: '/tools/mcx-pcr',
    label: 'Put-Call Ratio (PCR)',
    desc: 'Live PCR and IVIX for all MCX instruments. PCR > 1.2 = contrarian bullish signal.',
  },
  {
    href: '/tools/mcx-open-interest',
    label: 'Open Interest Analysis',
    desc: 'Top-5 OI strikes by Call and Put for each instrument. High OI = strong support/resistance.',
  },
  {
    href: '/tools/mcx-greeks',
    label: 'Options Greeks (ATM)',
    desc: 'Black-76 delta, gamma, theta, and vega for the at-the-money strike. All 5 instruments.',
  },
  {
    href: '/tools/mcx-max-pain',
    label: 'Max Pain',
    desc: 'The strike at which option sellers lose the least. Updated live every 60 seconds.',
  },
  {
    href: '/tools/mcx-pl-calculator',
    label: 'P&L Calculator',
    desc: 'Calculate futures profit and loss in INR. Lot sizes and tick values built in for every MCX commodity.',
  },
  {
    href: '/tools/mcx-bhavcopy',
    label: 'Bhavcopy Guide',
    desc: 'What is MCX bhavcopy, how to download it, and what the settlement columns mean.',
  },
  {
    href: '/tools/mcx-basis',
    label: 'Commodity Basis',
    desc: 'MCX vs COMEX/international spread for Gold, Silver, Crude, and Copper. Updated every 15 minutes.',
  },
]

export default function ToolsPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 4rem', fontFamily: 'var(--font-sans)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Analytics Tools
      </h1>
      <p style={{ fontSize: '0.88rem', color: 'var(--ink-3)', marginBottom: '2.5rem' }}>
        Professional-grade tools for MCX commodity options traders. Pro analytics unlock the full analytical depth.
      </p>

      {/* Pro Analytics — shown first */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Pro Analytics</h2>
          <Link href="/pro" style={{ fontSize: '0.75rem', background: 'var(--ink)', color: '#fff', padding: '2px 10px', borderRadius: 20, textDecoration: 'none', fontWeight: 600 }}>
            Unlock — ₹33/day →
          </Link>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>
          Built for traders who use options — not just futures prices.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {PRO_TOOLS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="pro-tool-card"
              style={{
                display: 'block',
                border: '1px solid var(--border-2)',
                borderRadius: 8,
                padding: '0.9rem 1rem',
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--surface-3)',
              }}
            >
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: 'var(--ink)', color: '#fff',
                fontSize: '0.65rem', padding: '2px 8px',
                borderBottomLeftRadius: 6, fontWeight: 700, letterSpacing: '0.05em',
              }}>
                PRO
              </span>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '0.35rem' }}>{t.label}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', margin: 0, lineHeight: 1.45 }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Free Tools */}
      <section>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--up)', marginBottom: '1rem' }}>
          Free Data Tools
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {FREE_TOOLS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="free-tool-card"
              style={{
                display: 'block',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '0.9rem 1rem',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{t.label}</span>
                <span style={{ fontSize: '0.65rem', background: '#EBF5EF', color: 'var(--up)', padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>
                  FREE
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)', margin: 0, lineHeight: 1.45 }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .free-tool-card:hover { border-color: var(--gold) !important; }
        .pro-tool-card:hover  { border-color: var(--gold) !important; }
      `}</style>
    </main>
  )
}

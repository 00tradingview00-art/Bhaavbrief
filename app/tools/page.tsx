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

const FREE_TOOLS = [
  {
    href: '/tools/mcx-iv-rank',
    label: 'IV Rank & Percentile',
    desc: 'Is MCX options cheap or expensive today? IV Rank + IV Percentile for Gold, Silver, Crude, Copper, Natural Gas.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-pcr',
    label: 'Put-Call Ratio (PCR)',
    desc: 'Live PCR and IVIX for all MCX instruments. PCR > 1.2 = contrarian bullish signal.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-open-interest',
    label: 'Open Interest Analysis',
    desc: 'Top-5 OI strikes by Call and Put for each instrument. High OI = strong support/resistance.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-greeks',
    label: 'Options Greeks (ATM)',
    desc: 'Black-76 delta, gamma, theta, and vega for the at-the-money strike. All 5 instruments.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-max-pain',
    label: 'Max Pain',
    desc: 'The strike at which option sellers lose the least. Updated live every 60 seconds.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-pl-calculator',
    label: 'P&L Calculator',
    desc: 'Calculate futures profit and loss in INR. Lot sizes and tick values built in for every MCX commodity.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-bhavcopy',
    label: 'Bhavcopy Guide',
    desc: 'What is MCX bhavcopy, how to download it, and what the settlement columns mean.',
    badge: 'Free',
  },
  {
    href: '/tools/mcx-basis',
    label: 'Commodity Basis',
    desc: 'MCX vs COMEX/international spread for Gold, Silver, Crude, and Copper. Updated every 15 minutes.',
    badge: 'Free',
  },
]

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

export default function ToolsPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem 4rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        MCX Analytics Tools
      </h1>
      <p style={{ fontSize: '0.88rem', opacity: 0.65, marginBottom: '2rem' }}>
        Live data tools for MCX commodity options traders. Free tools available to everyone — Pro tools unlock the full analytical depth.
      </p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#16a34a' }}>
          Free Tools
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {FREE_TOOLS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              className="tools-card"
              style={{
                display: 'block',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '0.9rem 1rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.label}</span>
                <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#16a34a', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>
                  {t.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Pro Tools</h2>
          <Link href="/pro" style={{ fontSize: '0.78rem', background: '#1a1a1a', color: '#fff', padding: '2px 10px', borderRadius: 20, textDecoration: 'none', fontWeight: 600 }}>
            Unlock — ₹33/day →
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {PRO_TOOLS.map(t => (
            <Link
              key={t.href}
              href={t.href}
              style={{
                display: 'block',
                border: '1px solid #1a1a1a',
                borderRadius: 8,
                padding: '0.9rem 1rem',
                textDecoration: 'none',
                color: 'inherit',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: '#1a1a1a', color: '#fff',
                fontSize: '0.65rem', padding: '2px 8px',
                borderBottomLeftRadius: 6, fontWeight: 600,
              }}>
                Pro
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>{t.label}</div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <style>{`
        .tools-card:hover { border-color: #1a1a1a !important; }
      `}</style>
    </main>
  )
}

import type { Metadata } from 'next'
import Script from 'next/script'
import ProCheckout from './ProCheckout'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'BhaavBrief Pro — Full MCX Options Analytics',
  description: 'Unlock the full MCX options chain, Greeks, Strategy Builder, IV analytics, and institutional positioning data. ₹999/month or ₹8,999/year.',
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

const PRO_FEATURES = [
  'Full option chain — all strikes, all expiries',
  'Live Greeks (delta, gamma, theta, vega) per strike',
  'Strategy Builder — 12 multi-leg templates with payoff charts',
  'IV Skew Chart — CE vs PE implied volatility by strike',
  'OI Buildup History — 90-day open interest by strike',
  'Commodity Basis Dashboard — MCX vs COMEX spread, 30-day chart',
  'Pro Research Articles — macro event analysis within hours of publication',
  'FPI/DII positioning — institutional net long/short data (coming soon)',
]

export default function ProPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1rem 5rem', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            BhaavBrief Pro
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#555', maxWidth: 560, margin: '0 auto' }}>
            The only MCX-focused options analytics terminal in India.
            No Sensibull equivalent exists for commodity options. Until now.
          </p>
        </div>

        {/* Pricing cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          <PricingCard
            plan="monthly"
            label="Monthly"
            price="₹999"
            sub="/month"
            cta="Start Monthly"
          />
          <PricingCard
            plan="yearly"
            label="Annual"
            price="₹8,999"
            sub="/year"
            note="Save ₹2,989 — ₹749/month"
            highlight
            cta="Start Annual"
          />
        </div>

        {/* Feature comparison */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <FeatureList title="Free forever" features={FREE_FEATURES} accent="#16a34a" />
          <FeatureList title="Pro" features={PRO_FEATURES} accent="#1a1a1a" bold />
        </div>
      </main>
    </>
  )
}

function PricingCard({
  plan, label, price, sub, note, highlight, cta,
}: {
  plan: 'monthly' | 'yearly'
  label: string
  price: string
  sub: string
  note?: string
  highlight?: boolean
  cta: string
}) {
  return (
    <div style={{
      border: highlight ? '2px solid #1a1a1a' : '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '1.75rem',
      position: 'relative',
    }}>
      {highlight && (
        <span style={{
          position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#fff', fontSize: '0.75rem', padding: '2px 12px', borderRadius: 20,
        }}>
          Best value
        </span>
      )}
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        {price}<span style={{ fontSize: '1rem', fontWeight: 400, color: '#6b7280' }}>{sub}</span>
      </div>
      {note && <div style={{ fontSize: '0.85rem', color: '#16a34a', marginBottom: '1rem' }}>{note}</div>}
      <ProCheckout plan={plan} cta={cta} />
    </div>
  )
}

function FeatureList({ title, features, accent, bold }: {
  title: string
  features: string[]
  accent: string
  bold?: boolean
}) {
  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: bold ? 700 : 500, color: accent, marginBottom: '1rem' }}>
        {title}
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {features.map(f => (
          <li key={f} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.6rem', fontSize: '0.9rem', color: '#374151' }}>
            <span style={{ color: accent, flexShrink: 0 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}

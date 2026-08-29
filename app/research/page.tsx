import type { Metadata } from 'next'
import { getAllResearch } from '@/lib/research'
import Link from 'next/link'

export const revalidate = 3600

export const metadata: Metadata = {
  title:       'Pro Research — BhaavBrief',
  description: 'MCX-specific analysis of major macro events — FOMC, Jackson Hole, OPEC+, RBI MPC, and EIA — with live options chain data and actionable MCX commodity implications.',
  keywords:    [
    'MCX gold analysis FOMC India', 'MCX commodity research India',
    'Jackson Hole MCX gold impact', 'OPEC MCX crude analysis India',
    'RBI MPC MCX gold India', 'MCX macro event analysis',
  ],
}

export default function ResearchPage() {
  const articles = getAllResearch()

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        Pro Research
      </h1>
      <p style={{ fontSize: '0.85rem', opacity: 0.65, marginBottom: '1.5rem' }}>
        MCX-specific analysis of major macro events, published within hours. Full articles are Pro-only.
      </p>

      {articles.length === 0 ? (
        <p style={{ fontSize: '0.88rem', opacity: 0.55 }}>
          No research articles published yet. Check back after the next major market event.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {articles.map(a => (
            <div key={a.slug} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1a1a1a', color: '#fff', padding: '2px 7px', borderRadius: 99 }}>
                  Pro
                </span>
                <span style={{ fontSize: '0.72rem', opacity: 0.55 }}>{a.displayDate}</span>
                {a.commodities.length > 0 && (
                  <span style={{ fontSize: '0.72rem', opacity: 0.55 }}>· {a.commodities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}</span>
                )}
              </div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
                <Link href={`/research/${a.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {a.title}
                </Link>
              </h2>
              <p style={{ fontSize: '0.82rem', opacity: 0.7, margin: '0 0 0.5rem' }}>{a.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link
                  href={`/research/${a.slug}`}
                  style={{ fontSize: '0.8rem', color: '#1a1a1a', fontWeight: 600, textDecoration: 'none' }}
                >
                  Read full analysis →
                </Link>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{a.readingMinutes} min read</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

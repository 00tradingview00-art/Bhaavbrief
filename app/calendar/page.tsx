import type { Metadata } from 'next'
import StatisticalDisclaimer from '@/components/StatisticalDisclaimer'
import CountdownTimer from '@/components/CountdownTimer'
import CalendarFilterBar from '@/components/CalendarFilterBar'
import { getUpcomingEvents, getNextHighImpactEvent } from '@/lib/eventMap'

export const revalidate = 900

const BASE_URL = 'https://bhaavbrief.in'

export const metadata: Metadata = {
  title: 'MCX Event Calendar — Trader Intelligence | BhaavBrief',
  description: 'Scheduled macro and data-release events mapped to MCX contracts — EIA storage, FOMC, CPI, China PMI and more, with historical context. Educational, not advice.',
  alternates: { canonical: `${BASE_URL}/calendar` },
}

export default function CalendarPage() {
  const events = getUpcomingEvents()
  const nextHighImpact = getNextHighImpactEvent()

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <nav aria-label="Breadcrumb" style={{ maxWidth: 980, margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Home', href: '/' },
          { label: 'Calendar', href: null },
        ].map((crumb, i, arr) => (
          <span key={crumb.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {crumb.href ? (
              <a href={crumb.href} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', textDecoration: 'none', letterSpacing: '0.04em' }}>{crumb.label}</a>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{crumb.label}</span>
            )}
            {i < arr.length - 1 && <span style={{ color: '#C8C8B8', fontSize: 10 }}>›</span>}
          </span>
        ))}
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>
            MCX Event Calendar
          </h1>
          <p style={{ fontSize: '1rem', color: '#48483A', lineHeight: 1.6, fontWeight: 300, maxWidth: 640 }}>
            Scheduled macro and data-release events mapped to the MCX contracts they typically move — with prior actuals and historical context where available.
          </p>
          <StatisticalDisclaimer />
        </header>

        {nextHighImpact && (
          <CountdownTimer
            targetIso={nextHighImpact.next_release_utc}
            label={`Next high-impact event: ${nextHighImpact.name}`}
          />
        )}

        <CalendarFilterBar events={events} />
      </div>
    </div>
  )
}

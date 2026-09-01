import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import CountdownTimer from '@/components/CountdownTimer'
import CalendarFilterBar from '@/components/CalendarFilterBar'
import { getUpcomingEvents, getNextHighImpactEvent } from '@/lib/eventMap'
import { getImpactStats, type EventImpactEntry } from '@/lib/eventImpactStats'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 900

const BASE_URL = 'https://bhaavbrief.in'

const TITLE = 'MCX Event Calendar — Trader Intelligence | BhaavBrief'
const DESCRIPTION = 'Scheduled macro and data-release events mapped to MCX contracts — EIA storage, FOMC, CPI, RBI MPC, Union Budget, China PMI and more, with historical context. Educational, not advice.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'MCX event calendar',
    'EIA natural gas storage report India',
    'FOMC MCX gold impact',
    'RBI MPC MCX gold crude impact',
    'Union Budget gold import duty MCX',
    'MCX crude oil inventory report schedule',
    'China PMI MCX copper impact',
    'MCX contract expiry calendar 2026',
    'CFTC commitment of traders MCX',
  ],
  alternates: { canonical: `${BASE_URL}/calendar` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/calendar`,
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary' as const,
    title: 'MCX Event Calendar | BhaavBrief',
    description: 'Scheduled macro/data-release events mapped to MCX contracts — EIA, FOMC, CPI, RBI MPC, Union Budget and more.',
    site: '@bhaavbrief',
  },
}

const BASE = BASE_URL

export default function CalendarPage() {
  const events = getUpcomingEvents()
  const nextHighImpact = getNextHighImpactEvent()

  // Pre-fetch impact stats for all events × affected contracts
  const impactStatsMap: Record<string, Record<string, EventImpactEntry>> = {}
  for (const event of events) {
    const eventStats: Record<string, EventImpactEntry> = {}
    for (const commodity of event.affected_contracts) {
      const s = getImpactStats(event.id, commodity)
      if (s) eventStats[commodity] = s
    }
    if (Object.keys(eventStats).length > 0) impactStatsMap[event.id] = eventStats
  }

  // Load tick values (₹/lot per ₹1 move) for lot-level impact context
  const tickValues: Record<string, number> = {}
  try {
    const c = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/commodity-constants.json'), 'utf8'))
    for (const [key, val] of Object.entries(c) as [string, Record<string, unknown>][]) {
      const tv = val?.tickValuePerLotINR
      if (typeof tv === 'number') tickValues[key] = tv
    }
  } catch { /* degrades gracefully */ }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Calendar' },
    ],
  }

  const eventListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: events.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.name,
        startDate: e.next_release_utc,
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        description: e.description_educational,
        url: `${BASE}/calendar#${e.id}`,
        location: { '@type': 'VirtualLocation', url: `${BASE}/calendar#${e.id}` },
      },
    })),
  }

  return (
    <div style={{ background: '#FAFAF6', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(eventListSchema) }} />

      <nav aria-label="Breadcrumb" style={{ maxWidth: 980, margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { label: 'Home', href: '/' },
          { label: 'Calendar', href: null },
        ].map((crumb, i, arr) => (
          <span key={crumb.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {crumb.href ? (
              <a href={crumb.href} style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#C8720A', textDecoration: 'none', letterSpacing: '0.04em' }}>{crumb.label}</a>
            ) : (
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>{crumb.label}</span>
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
        </header>

        {nextHighImpact && (
          <CountdownTimer
            targetIso={nextHighImpact.next_release_utc}
            label={`Next high-impact event: ${nextHighImpact.name}`}
          />
        )}

        <CalendarFilterBar events={events} impactStats={impactStatsMap} tickValues={tickValues} />
      </div>
    </div>
  )
}

import { getAllEvents } from '@/lib/events'
import { COMMODITY_LABELS } from '@/lib/eventMap'
import { COMMODITY_ACCENT_COLORS } from '@/lib/commodityTags'
import Link from 'next/link'
import type { Metadata } from 'next'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 300

export const metadata: Metadata = {
  title:       'Event Results — MCX Economic Calendar Outcomes | BhaavBrief',
  description: 'A permanent archive of scheduled macro events — EIA inventories, FOMC, CPI — and exactly how MCX commodity prices reacted at time of print.',
  alternates:  { canonical: 'https://bhaavbrief.in/events' },
  keywords: [
    'MCX commodity events calendar India',
    'FOMC EIA OPEC MCX schedule',
    'MCX macro events India',
    'commodity market events today India',
    'EIA inventory MCX crude oil India',
    'FOMC MCX gold impact India',
    'RBI MPC commodity India',
  ],
}

export default async function EventsIndexPage() {
  const events = await getAllEvents()

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':     'CollectionPage',
        '@id':       'https://bhaavbrief.in/events',
        name:        'Event Results — MCX Economic Calendar Outcomes',
        description: 'A permanent archive of scheduled macro events — EIA inventories, FOMC, CPI — and exactly how MCX commodity prices reacted at time of print.',
        url:         'https://bhaavbrief.in/events',
      },
      {
        '@type': 'ItemList',
        itemListElement: events.slice(0, 20).map((e, i) => ({
          '@type':   'ListItem',
          position:  i + 1,
          url:       `https://bhaavbrief.in/events/${e.slug}`,
          name:      e.title,
        })),
      },
    ],
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500,
        color: 'var(--ink)', margin: '0 0 8px',
      }}>
        Event Results
      </h1>
      <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 28 }}>
        A permanent record of every scheduled macro event covered by BhaavBrief — the result, the MCX price move at time of print, and why it moved. No recommendations, just what happened.
      </p>

      {events.length === 0 ? (
        <div style={{
          background: 'var(--surface-3)', borderRadius: 4, padding: '20px 24px',
          fontSize: 14, color: 'var(--ink-4)',
        }}>
          No event results recorded yet — this archive fills in as scheduled events (EIA, FOMC, CPI) fire during market hours.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(e => {
            const color = COMMODITY_ACCENT_COLORS[e.commodity as keyof typeof COMMODITY_ACCENT_COLORS] ?? '#7A7668'
            const up    = e.mcxChangePct >= 0
            return (
              <Link key={e.slug} href={`/events/${e.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 4, background: `${color}15`, color,
                      }}>
                        {COMMODITY_LABELS[e.commodity] ?? e.commodity}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{e.displayDate}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink)', lineHeight: 1.35 }}>
                      {e.title}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                      ₹{e.mcxPrice.toLocaleString('en-IN')}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
                      color: up ? '#16A34A' : '#DC2626',
                    }}>
                      {up ? '▲' : '▼'} {Math.abs(e.mcxChangePct).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

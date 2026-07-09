'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import StatisticalDisclaimer from '@/components/StatisticalDisclaimer'
import {
  type EventMapEntry,
  COMMODITY_URL_SLUGS,
  COMMODITY_LABELS,
} from '@/lib/eventMapTypes'

const TIER_STYLES: Record<string, { background: string; color: string }> = {
  high:       { background: '#FDF0F0', color: '#991818' },
  medium:     { background: '#FFF7E0', color: '#996600' },
  low:        { background: '#F3F2EC', color: '#48483A' },
  context:    { background: '#EAF5EE', color: '#1E6630' },
  structural: { background: '#F3F2EC', color: '#8A8A7A' },
}

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso)) + ' IST'
}

function formatPrior(event: EventMapEntry): string | null {
  const p = event.prior_field
  if (p.value == null) return null
  const unit = p.unit ? ` ${p.unit}` : ''
  const period = p.as_of_period ? ` (${p.as_of_period})` : ''
  return `Prior: ${p.value}${unit}${period}`
}

function EventCard({ event }: { event: EventMapEntry }) {
  const tierStyle = TIER_STYLES[event.impact_tier] ?? TIER_STYLES.low
  const prior = formatPrior(event)

  return (
    <div
      id={event.id}
      data-commodities={event.affected_contracts.join(',')}
      style={{
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        padding: '14px 16px',
        scrollMarginTop: 80,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
          textTransform: 'uppercase', padding: '2px 7px',
          background: tierStyle.background, color: tierStyle.color,
        }}>
          {event.impact_tier}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)' }}>
          {formatIST(event.next_release_utc)}
        </span>
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
        {event.name}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5, marginBottom: 8 }}>
        {event.description_educational}
      </p>

      {prior && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)', marginBottom: 8 }}>
          {prior}
        </div>
      )}

      {event.affected_contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          {event.affected_contracts.map(c => (
            <Link
              key={c}
              href={`/commodities/${COMMODITY_URL_SLUGS[c] ?? c}`}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: '#C8720A', textDecoration: 'none',
                background: '#F3F2EC', padding: '2px 8px',
              }}
            >
              {COMMODITY_LABELS[c] ?? c}
            </Link>
          ))}
        </div>
      )}

      <StatisticalDisclaimer />
    </div>
  )
}

export default function CalendarFilterBar({ events }: { events: EventMapEntry[] }) {
  const [active, setActive] = useState<string>('all')

  const commodities = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) for (const c of e.affected_contracts) set.add(c)
    return Array.from(set)
  }, [events])

  const filtered = active === 'all'
    ? events
    : events.filter(e => e.affected_contracts.includes(active))

  return (
    <div>
      <div className="calendar-filter-bar" style={{ marginBottom: 16 }}>
        <button
          onClick={() => setActive('all')}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em',
            padding: '6px 12px', border: '1px solid var(--border)', whiteSpace: 'nowrap',
            background: active === 'all' ? 'var(--gold)' : 'var(--surface-1)',
            color: active === 'all' ? '#FAFAF6' : 'var(--ink-2)',
            cursor: 'pointer',
          }}
        >
          All
        </button>
        {commodities.map(c => (
          <button
            key={c}
            onClick={() => setActive(c)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em',
              padding: '6px 12px', border: '1px solid var(--border)', whiteSpace: 'nowrap',
              background: active === c ? 'var(--gold)' : 'var(--surface-1)',
              color: active === c ? '#FAFAF6' : 'var(--ink-2)',
              cursor: 'pointer',
            }}
          >
            {COMMODITY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      <div className="calendar-week-grid">
        {filtered.map(event => <EventCard key={event.id} event={event} />)}
      </div>
    </div>
  )
}

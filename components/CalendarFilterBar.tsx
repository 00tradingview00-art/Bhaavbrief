'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Pill, { type PillTone } from '@/components/ui/Pill'
import {
  type EventMapEntry,
  COMMODITY_URL_SLUGS,
  COMMODITY_LABELS,
} from '@/lib/eventMapTypes'

type EventImpactEntry = {
  avgAbsMovePct: number
  maxAbsMovePct: number
  sampleSize:    number
}

const TIER_TONE: Record<string, PillTone> = {
  high:       'down',
  medium:     'energy',
  low:        'neutral',
  context:    'up',
  structural: 'neutral',
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

function EventCard({
  event,
  eventImpact,
  tickValues,
}: {
  event: EventMapEntry
  eventImpact: Record<string, EventImpactEntry>
  tickValues: Record<string, number>
}) {
  const tierTone = TIER_TONE[event.impact_tier] ?? 'neutral'
  const prior = formatPrior(event)

  // Build per-commodity historical reaction summary
  const impactLines = event.affected_contracts
    .map(c => {
      const s = eventImpact[c]
      if (!s) return null
      const tv = tickValues[c]
      const lotNote = tv
        ? ` · ₹${tv}/lot per ₹1 move`
        : ''
      return `${COMMODITY_LABELS[c] ?? c}: avg ±${s.avgAbsMovePct.toFixed(2)}% · max ±${s.maxAbsMovePct.toFixed(2)}% (${s.sampleSize} events)${lotNote}`
    })
    .filter(Boolean) as string[]

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
        <Pill tone={tierTone} size="xs">{event.impact_tier}</Pill>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--ink-4)' }}>
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
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-2)', marginBottom: 8 }}>
          {prior}
        </div>
      )}

      {impactLines.length > 0 && (
        <div style={{
          background: 'var(--surface-2)', borderLeft: '2px solid var(--border)',
          padding: '8px 10px', marginBottom: 8, borderRadius: '0 4px 4px 0',
        }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Historical reaction
          </div>
          {impactLines.map((line, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: 10.5, color: 'var(--ink-2)', lineHeight: 1.6 }}>
              {line}
            </div>
          ))}
        </div>
      )}

      {event.affected_contracts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          {event.affected_contracts.map(c => (
            <Pill key={c} tone="neutral" size="xs" href={`/commodities/${COMMODITY_URL_SLUGS[c] ?? c}`} style={{ color: '#C8720A' }}>
              {COMMODITY_LABELS[c] ?? c}
            </Pill>
          ))}
        </div>
      )}

      {event.research_href && (
        <div style={{ marginTop: 6 }}>
          <Link
            href={event.research_href}
            style={{ fontSize: 11, color: '#1a1a1a', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#1a1a1a', color: '#fff', padding: '1px 5px', borderRadius: 99 }}>Pro</span>
            Read our analysis →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function CalendarFilterBar({
  events,
  impactStats = {},
  tickValues = {},
}: {
  events: EventMapEntry[]
  impactStats?: Record<string, Record<string, EventImpactEntry>>
  tickValues?: Record<string, number>
}) {
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
        <Pill size="md" tone="neutral" active={active === 'all'} onClick={() => setActive('all')}>
          All
        </Pill>
        {commodities.map(c => (
          <Pill key={c} size="md" tone="neutral" active={active === c} onClick={() => setActive(c)}>
            {COMMODITY_LABELS[c] ?? c}
          </Pill>
        ))}
      </div>

      <div className="calendar-week-grid">
        {filtered.map(event => (
          <EventCard
            key={event.id}
            event={event}
            eventImpact={impactStats[event.id] ?? {}}
            tickValues={tickValues}
          />
        ))}
      </div>
    </div>
  )
}

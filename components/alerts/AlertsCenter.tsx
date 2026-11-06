'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type EventAlert = { id: string; name: string; time: string; impact: string; commodities: string[] }

// Legacy client-only storage — migrated to the server on first load below,
// then left alone (the server list is now the source of truth).
const LEGACY_STORAGE_KEY = 'bhaavbrief-event-alerts-v1'

async function postAlert(eventId: string, watch: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, watch }),
    })
    return res.ok
  } catch {
    return false
  }
}

export default function AlertsCenter({ events, initialWatched }: { events: EventAlert[]; initialWatched: string[] }) {
  const [saved, setSaved] = useState<string[]>(initialWatched)
  const [pending, setPending] = useState<Set<string>>(new Set())
  const migrated = useRef(false)

  useEffect(() => {
    if (migrated.current) return
    migrated.current = true
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? '[]')
      if (!Array.isArray(legacy)) return
      const toMigrate = legacy.filter((id): id is string => typeof id === 'string' && !initialWatched.includes(id))
      if (!toMigrate.length) return
      ;(async () => {
        const migratedOk: string[] = []
        for (const id of toMigrate) {
          if (await postAlert(id, true)) migratedOk.push(id)
        }
        if (migratedOk.length) setSaved(current => [...current, ...migratedOk])
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      })()
    } catch { /* A broken local preference must not block the page. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggle(id: string) {
    const wasActive = saved.includes(id)
    setPending(current => new Set(current).add(id))
    setSaved(current => wasActive ? current.filter(value => value !== id) : [...current, id])

    const ok = await postAlert(id, !wasActive)
    if (!ok) {
      // Revert on failure — the server state didn't change.
      setSaved(current => wasActive ? [...current, id] : current.filter(value => value !== id))
    }
    setPending(current => { const next = new Set(current); next.delete(id); return next })
  }

  return (
    <div className="bb-alerts-page">
      <header className="bb-alerts-header">
        <div className="bb-eyebrow">Event radar</div>
        <h1>Stay ahead of what moves the market.</h1>
        <p>Watch the events you want to keep an eye on — we&apos;ll send you a reminder email before each one.</p>
      </header>

      <section className="bb-alerts-note" aria-label="Alert status">
        <span aria-hidden="true">⌁</span>
        <p><strong>{saved.length} watched event{saved.length === 1 ? '' : 's'}</strong><br />Email reminders · No market calls or trade recommendations.</p>
      </section>

      <section aria-labelledby="upcoming-alert-events">
        <div className="bb-section-heading">
          <div><div className="bb-section-label">Upcoming</div><h2 id="upcoming-alert-events">Events to watch</h2></div>
          <Link href="/calendar">Full calendar <span aria-hidden="true">→</span></Link>
        </div>
        {events.length === 0 && (
          <p style={{ fontSize: 14, color: 'var(--ink-3)', padding: '16px 0' }}>
            No upcoming scheduled events right now — the <Link href="/calendar">calendar</Link> lists the next releases as they are confirmed.
          </p>
        )}
        <div className="bb-alert-list">
          {events.map(event => {
            const active = saved.includes(event.id)
            const busy = pending.has(event.id)
            return (
              <article className="bb-alert-row" key={event.id}>
                <div className="bb-impact-dot" data-impact={event.impact}>{event.impact}</div>
                <div className="bb-alert-copy"><h3>{event.name}</h3><p>{event.time} · {event.commodities.join(', ')}</p></div>
                <button type="button" onClick={() => toggle(event.id)} aria-pressed={active} aria-label={`${active ? 'Remove' : 'Watch'} ${event.name}`} disabled={busy}>
                  {active ? 'Watching' : 'Watch'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

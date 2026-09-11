'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type EventAlert = { id: string; name: string; time: string; impact: string; commodities: string[] }

const STORAGE_KEY = 'bhaavbrief-event-alerts-v1'

export default function AlertsCenter({ events }: { events: EventAlert[] }) {
  const [saved, setSaved] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      if (Array.isArray(parsed)) setSaved(parsed.filter((id): id is string => typeof id === 'string'))
    } catch { /* A broken local preference must not block the page. */ }
    setReady(true)
  }, [])

  function toggle(id: string) {
    setSaved(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="bb-alerts-page">
      <header className="bb-alerts-header">
        <div className="bb-eyebrow">Event radar</div>
        <h1>Stay ahead of what moves the market.</h1>
        <p>Save the events you want to watch. Your selections stay on this device; notifications will be available when you connect an account.</p>
      </header>

      <section className="bb-alerts-note" aria-label="Alert status">
        <span aria-hidden="true">⌁</span>
        <p><strong>{saved.length} saved event{saved.length === 1 ? '' : 's'}</strong><br />This device only · No market calls or trade recommendations.</p>
      </section>

      <section aria-labelledby="upcoming-alert-events">
        <div className="bb-section-heading">
          <div><div className="bb-section-label">Upcoming</div><h2 id="upcoming-alert-events">Events to watch</h2></div>
          <Link href="/calendar">Full calendar <span aria-hidden="true">→</span></Link>
        </div>
        <div className="bb-alert-list">
          {events.map(event => {
            const active = saved.includes(event.id)
            return (
              <article className="bb-alert-row" key={event.id}>
                <div className="bb-impact-dot" data-impact={event.impact}>{event.impact}</div>
                <div className="bb-alert-copy"><h3>{event.name}</h3><p>{event.time} · {event.commodities.join(', ')}</p></div>
                <button type="button" onClick={() => toggle(event.id)} aria-pressed={active} aria-label={`${active ? 'Remove' : 'Watch'} ${event.name}`} disabled={!ready}>
                  {active ? 'Saved' : 'Watch'}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

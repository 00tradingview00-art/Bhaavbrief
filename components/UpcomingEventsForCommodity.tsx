import Link from 'next/link'
import StatisticalDisclaimer from '@/components/StatisticalDisclaimer'
import { getEventsForCommodity } from '@/lib/eventMap'
import { getImpactStats } from '@/lib/eventImpactStats'

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso)) + ' IST'
}

function formatPrior(prior: { value: number | null; unit: string | null; as_of_period: string | null }): string | null {
  if (prior.value == null) return null
  const unit = prior.unit ? ` ${prior.unit}` : ''
  const period = prior.as_of_period ? ` (${prior.as_of_period})` : ''
  return `Prior: ${prior.value}${unit}${period}`
}

export default function UpcomingEventsForCommodity({ commodityKey, name }: { commodityKey: string; name: string }) {
  const events = getEventsForCommodity(commodityKey).slice(0, 5)
  if (events.length === 0) return null

  return (
    <>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--ink)', margin: '0 0 16px' }}>
        Upcoming Events for {name}
      </h2>
      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '20px 24px', marginBottom: 32,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map(event => {
            const stats = getImpactStats(event.id, commodityKey)
            const prior = formatPrior(event.prior_field)
            return (
              <Link
                key={event.id}
                href={`/calendar#${event.id}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{event.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                    {formatIST(event.next_release_utc)}
                  </span>
                </div>
                {(prior || stats) && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                    {[prior, stats ? `Avg move ±${stats.avgAbsMovePct.toFixed(1)}% (n=${stats.sampleSize})` : null]
                      .filter(Boolean).join(' · ')}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
        <StatisticalDisclaimer style={{ marginTop: 12 }} />
      </div>
    </>
  )
}

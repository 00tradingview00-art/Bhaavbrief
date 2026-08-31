import Link from 'next/link'
import StatisticalDisclaimer from '@/components/StatisticalDisclaimer'
import { getEventsForCommodity, COMMODITY_LABELS, type EventMapEntry } from '@/lib/eventMap'
import { getImpactStats } from '@/lib/eventImpactStats'
import { deriveCommodityKeysFromTags, type CommodityKey } from '@/lib/commodityTags'

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso)) + ' IST'
}

function TapeMoversRow({ event, commodityKey }: { event: EventMapEntry; commodityKey: string }) {
  const stats = getImpactStats(event.id, commodityKey)

  return (
    <div className="tape-movers-row" style={{ padding: '10px 0', borderBottom: '0.5px solid #DDDDD0' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: '#0E0D0A' }}>
          {event.name}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', marginTop: 2 }}>
          {COMMODITY_LABELS[commodityKey] ?? commodityKey}
        </div>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#48483A', whiteSpace: 'nowrap' }}>
        {formatIST(event.next_release_utc)}
      </div>
      {stats && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', whiteSpace: 'nowrap' }}>
          Avg move ±{stats.avgAbsMovePct.toFixed(1)}% (n={stats.sampleSize})
        </div>
      )}
    </div>
  )
}

export default function TapeMovers({ tags }: { tags: string[] }) {
  const commodityKeys = deriveCommodityKeysFromTags(tags)

  if (commodityKeys.length === 0) return null

  // Prefer events within the next 24h; if none, fall back to the single
  // nearest upcoming event per commodity so the widget isn't empty on a
  // quiet news day.
  const within24h = commodityKeys.flatMap(k => getEventsForCommodity(k).filter(e => {
    const hoursAway = (new Date(e.next_release_utc).getTime() - Date.now()) / 3_600_000
    return hoursAway <= 24
  }).map(e => ({ event: e, commodityKey: k })))

  const rows = within24h.length > 0
    ? within24h
    : commodityKeys
        .map(k => {
          const next = getEventsForCommodity(k)[0]
          return next ? { event: next, commodityKey: k } : null
        })
        .filter((r): r is { event: EventMapEntry; commodityKey: CommodityKey } => r !== null)
        .slice(0, 3)

  if (rows.length === 0) return null

  return (
    <div className="tape-movers-widget" style={{
      border: '0.5px solid #DDDDD0',
      background: '#F9F8F4',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A' }}>
          Today&rsquo;s Tape Movers
        </span>
        <Link href="/calendar" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#C8720A', textDecoration: 'none' }}>
          Full calendar →
        </Link>
      </div>

      {rows.map(({ event, commodityKey }) => (
        <TapeMoversRow key={`${event.id}-${commodityKey}`} event={event} commodityKey={commodityKey} />
      ))}

      <StatisticalDisclaimer style={{ marginTop: 8 }} />
    </div>
  )
}

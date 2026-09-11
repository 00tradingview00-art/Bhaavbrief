import Link from 'next/link'
import type { BriefMeta } from '@/lib/briefs'
import type { EventMapEntry } from '@/lib/eventMap'
import type { PriceData } from '@/lib/prices'
import type { StoryArc } from '@/lib/arcs'
import SubscribeForm from '@/components/SubscribeForm'

type WatchItem = {
  label: string
  href: string
  value: number | undefined
  change: number | undefined
  stale?: boolean
  unit: string
  decimals: number
}

function formatPrice(value: number | undefined, decimals = 0) {
  if (!value) return '—'
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

function formatEventTime(iso: string) {
  const date = new Date(iso)
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short',
  }) + ' · ' + date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true,
  }) + ' IST'
}

function MarketRow({ item }: { item: WatchItem }) {
  const positive = (item.change ?? 0) >= 0
  const hasChange = (item.value ?? 0) > 0 && typeof item.change === 'number'

  return (
    <Link href={item.href} className="bb-watch-row" role="listitem">
      <span className="bb-watch-name">{item.label}<small>{item.unit}</small></span>
      <span className="bb-watch-price">{formatPrice(item.value, item.decimals)}{item.stale && <small>Delayed</small>}</span>
      <span className={hasChange ? (positive ? 'bb-move bb-move--up' : 'bb-move bb-move--down') : 'bb-move'}>
        {hasChange ? `${positive ? '▲' : '▼'} ${Math.abs(item.change!).toFixed(2)}%` : '—'}
      </span>
      <span className="bb-chevron" aria-hidden="true">›</span>
    </Link>
  )
}

export default function DailyBriefHome({
  latest,
  prices,
  nextEvent,
  briefDelayed,
  activeArc,
}: {
  latest: BriefMeta | undefined
  prices: PriceData | null
  nextEvent: EventMapEntry | null
  briefDelayed: boolean
  activeArc: StoryArc | undefined
}) {
  const watchItems: WatchItem[] = [
    { label: 'Gold', href: '/commodities/gold', value: prices?.gold.mcx, change: prices?.gold.mcxChangePct, stale: prices?.gold.mcxStale, unit: 'MCX · /10g', decimals: 0 },
    { label: 'Silver', href: '/commodities/silver', value: prices?.silver.mcx, change: prices?.silver.mcxChangePct, stale: prices?.silver.mcxStale, unit: 'MCX · /kg', decimals: 0 },
    { label: 'Crude Oil', href: '/commodities/crude-oil', value: prices?.crude.mcx, change: prices?.crude.mcxChangePct, stale: prices?.crude.mcxStale, unit: 'MCX · /bbl', decimals: 0 },
    { label: 'Copper', href: '/commodities/copper', value: prices?.copper.mcx, change: prices?.copper.mcxChangePct, stale: prices?.copper.mcxStale, unit: 'MCX · /kg', decimals: 2 },
    { label: 'Natural Gas', href: '/commodities/natural-gas', value: prices?.natgas.mcx, change: prices?.natgas.mcxChangePct, stale: prices?.natgas.mcxStale, unit: 'MCX · /mmBtu', decimals: 2 },
  ]

  return (
    <div className="bb-brief-home">
      <section className="bb-brief-hero" aria-labelledby="brief-heading">
        <div className="bb-eyebrow"><span className="bb-live-dot" /> {prices?.snapshotStale ? 'Data delayed' : 'Market intelligence'} <span>·</span> {prices?.generatedAtIST ? `Updated ${prices.generatedAtIST}` : 'India'}</div>
        <h1 id="brief-heading">Know what moves commodities today.</h1>
        <p>Prices, context and the events that matter—built for India&apos;s commodity markets.</p>
        <div className="bb-hero-actions">
          <Link href={latest ? `/briefs/${latest.urlSlug}` : '/briefs'} className="bb-button bb-button--primary">Read today&apos;s brief</Link>
          <Link href="/markets" className="bb-button bb-button--secondary">View markets</Link>
        </div>
      </section>

      <section className="bb-lead-card" aria-labelledby="lead-brief-heading">
        <div className="bb-section-label">Today&apos;s intelligence</div>
        {latest ? (
          <>
            <div className="bb-lead-meta">
              <span>Edition #{latest.edition}</span>
              <span>{latest.displayDate}</span>
              {briefDelayed && <span className="bb-status-warning">Brief delayed</span>}
            </div>
            <h2 id="lead-brief-heading">{latest.title}</h2>
            <p>{latest.summary || latest.description}</p>
            <div className="bb-tag-list">
              {latest.commodities.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}
            </div>
            <Link className="bb-inline-link" href={`/briefs/${latest.urlSlug}`}>Read the full analysis <span aria-hidden="true">→</span></Link>
          </>
        ) : (
          <>
            <h2 id="lead-brief-heading">Today&apos;s brief is being prepared.</h2>
            <p>Explore live MCX market data and the event calendar while the latest edition is published.</p>
            <Link className="bb-inline-link" href="/markets">Explore markets <span aria-hidden="true">→</span></Link>
          </>
        )}
      </section>

      <section className="bb-watchlist-section" aria-labelledby="watchlist-heading">
        <div className="bb-section-heading">
          <div>
            <div className="bb-section-label">Market pulse</div>
            <h2 id="watchlist-heading">Your market watch</h2>
          </div>
          <Link href="/markets">All markets <span aria-hidden="true">→</span></Link>
        </div>
        <div className="bb-watchlist" role="list">
          {watchItems.map(item => <MarketRow key={item.label} item={item} />)}
        </div>
        <p className="bb-data-note">{prices?.snapshotStale ? 'Prices may be delayed. ' : ''}Source: MCX and market-data providers · Values are informational only.</p>
      </section>

      <section className="bb-event-card" aria-labelledby="event-heading">
        <div className="bb-event-icon" aria-hidden="true">⌁</div>
        <div>
          <div className="bb-section-label">Event radar</div>
          <h2 id="event-heading">{nextEvent?.name ?? 'No high-impact event is currently scheduled.'}</h2>
          {nextEvent ? (
            <>
              <p>{formatEventTime(nextEvent.next_release_utc)} · Affects {nextEvent.affected_contracts.join(', ')}</p>
              <Link className="bb-inline-link" href={`/calendar#${nextEvent.id}`}>See event context <span aria-hidden="true">→</span></Link>
            </>
          ) : <Link className="bb-inline-link" href="/calendar">Open event calendar <span aria-hidden="true">→</span></Link>}
        </div>
      </section>

      <section className="bb-explore-section" aria-labelledby="explore-heading">
        <div className="bb-section-label">Explore BhaavBrief</div>
        <h2 id="explore-heading">The tools behind the daily brief.</h2>
        <div className="bb-explore-grid">
          <Link href="/options"><strong>Options intelligence</strong><span>iVIX, PCR, Greeks and expiry context</span><b>→</b></Link>
          <Link href="/calendar"><strong>Event calendar</strong><span>Know what can move your market next</span><b>→</b></Link>
          <Link href="/research"><strong>Research library</strong><span>Longer reads for deeper context</span><b>→</b></Link>
        </div>
      </section>

      {activeArc && (
        <section className="bb-arc-card" aria-labelledby="arc-heading">
          <div className="bb-section-label">Developing story</div>
          <h2 id="arc-heading">{activeArc.title}</h2>
          <p>{activeArc.summary}</p>
          <Link className="bb-inline-link" href={`/arcs/${activeArc.id}`}>Follow this story <span aria-hidden="true">→</span></Link>
        </section>
      )}

      <section className="bb-subscribe-card" aria-labelledby="subscribe-heading">
        <div>
          <div className="bb-section-label">Daily market brief</div>
          <h2 id="subscribe-heading">A clearer market read, before the day gets noisy.</h2>
          <p>Gold, crude, silver and the events to watch—delivered every trading day.</p>
        </div>
        <SubscribeForm compact location="mobile_brief_home" />
      </section>
    </div>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import Pill, { type PillTone } from '@/components/ui/Pill'
import {
  FILTERS,
  ITEMS_PER_PAGE,
  toISTDateKey,
  newsHref,
  type NewsItem,
} from '@/lib/newsFilter'

export type { NewsItem }

const ASSET_DETECTORS: { label: string; re: RegExp; href?: string }[] = [
  { label: 'Gold',      re: /\bgold\b/i,                          href: '/commodities/gold' },
  { label: 'Silver',    re: /\bsilver\b/i,                        href: '/commodities/silver' },
  { label: 'Crude',     re: /\bcrude|brent\b/i,                   href: '/commodities/crude-oil' },
  { label: 'Copper',    re: /\bcopper\b/i,                        href: '/commodities/copper' },
  { label: 'Nat Gas',   re: /natural.gas|nat.gas|\blng\b/i },
  { label: 'Rupee',     re: /\brupee\b|usdinr/i,                  href: '/markets' },
  { label: 'DXY',       re: /\bdollar.index\b|\bdxy\b/i },
  { label: 'Fed',       re: /federal.reserve|fomc|\bfed\b/i },
  { label: 'RBI',       re: /\brbi\b|repo.rate/i },
  { label: 'OPEC',      re: /\bopec\b/i },
  { label: 'China',     re: /\bchina\b/i },
  { label: 'MCX',       re: /\bmcx\b/i,                           href: '/markets' },
]

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins <  1)  return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function dateDividerLabel(dateKey: string): string {
  const todayIST = toISTDateKey(new Date().toISOString())
  const yestIST  = toISTDateKey(new Date(Date.now() - 86400000).toISOString())
  if (dateKey === todayIST) return 'Today'
  if (dateKey === yestIST)  return 'Yesterday'
  return new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getCrossAssets(item: NewsItem): string[] {
  const text = `${item.title} ${item.summary}`
  return ASSET_DETECTORS.filter(a => a.re.test(text)).map(a => a.label).slice(0, 4)
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g,  '<')
    .replace(/&gt;/g,  '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function truncate(text: string, maxLen = 220): string {
  if (text.length <= maxLen) return text
  const cut = text.lastIndexOf(' ', maxLen)
  return text.slice(0, cut > 0 ? cut : maxLen) + '…'
}

function TypeBadge({ itemType, premium }: { itemType?: NewsItem['itemType']; premium?: boolean }) {
  if (itemType === 'research') return (
    <Pill tone="gold" size="sm">{premium ? '🔒 Pro Research' : 'Research'}</Pill>
  )
  if (itemType === 'hawk-scan') return (
    <Pill tone="down" size="sm">⚡ Hawk-Scan</Pill>
  )
  if (itemType === 'flash') return null
  if (itemType === 'alert') return (
    <Pill tone="up" size="sm">Analysis</Pill>
  )
  return null
}

function PageLink({ page, filter, disabled, children }: { page: number; filter: string; disabled: boolean; children: React.ReactNode }) {
  const baseStyle = {
    fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.05em',
    padding: '8px 16px', border: '0.5px solid #DDDDD0',
    textDecoration: 'none', display: 'inline-block',
  } as const
  if (disabled) {
    return <span style={{ ...baseStyle, background: 'transparent', color: '#C8C8B8' }}>{children}</span>
  }
  return (
    <Link href={newsHref(filter, page)} style={{ ...baseStyle, background: '#18180F', color: '#FAFAF6' }}>
      {children}
    </Link>
  )
}

interface Props {
  items:         NewsItem[]  // already the current page's slice
  counts:        Record<string, number>
  activeFilter:  string
  page:          number
  totalPages:    number
  totalFiltered: number
}

export default function NewsFeed({ items, counts, activeFilter, page, totalPages, totalFiltered }: Props) {
  return (
    <div>

      {/* Filter pills with counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = counts[f] ?? 0
          const active = activeFilter === f
          return (
            <Pill
              key={f}
              size="md"
              tone="neutral"
              active={active}
              href={newsHref(f, 1)}
              style={{ opacity: !active && count === 0 ? 0.5 : 1 }}
            >
              {f}
              {count > 0 && (
                <Pill
                  size="xs"
                  tone="neutral"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : '#E8E4D8', color: active ? '#FAFAF6' : '#8A8A7A', border: 'none' }}
                >
                  {count}
                </Pill>
              )}
            </Pill>
          )
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div style={{ padding: '32px 0', borderTop: '0.5px solid #DDDDD0' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#8A8A7A', letterSpacing: '0.04em', margin: '0 0 8px' }}>
            No {activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' '}intelligence right now.
          </p>
          {activeFilter !== 'All' && (counts.All ?? 0) > 0 && (
            <Link
              href={newsHref('All', 1)}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#C8720A', background: 'none', border: 'none', textDecoration: 'underline' }}
            >
              Show all {counts.All} items →
            </Link>
          )}
        </div>
      )}

      {/* Intelligence items — grouped by IST date */}
      {(() => {
        let lastDateKey = ''
        return items.map((item, idx) => {
          const dateKey     = toISTDateKey(item.pubDate)
          const showDivider = dateKey !== lastDateKey
          lastDateKey = dateKey
          const crossAssets = getCrossAssets(item)
          return (
            <div key={item.id}>
              {showDivider && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  margin: `${idx === 0 ? 0 : 24}px 0 0`,
                  paddingBottom: 10,
                  borderBottom: '0.5px solid #DDDDD0',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#18180F',
                  }}>
                    {dateDividerLabel(dateKey)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
                    {dateKey}
                  </span>
                </div>
              )}
              <div style={item.itemType === 'hawk-scan' ? {
                padding: '20px 20px 20px 16px',
                borderBottom: '0.5px solid #DDDDD0',
                background: '#FFF8F5',
                borderLeft: '2px solid #CC3300',
                marginLeft: -1,
              } : { padding: '22px 0', borderBottom: '0.5px solid #DDDDD0' }}>

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Pill tone={item.tagType as PillTone} size="sm">{item.category.charAt(0).toUpperCase() + item.category.slice(1)}</Pill>
                  <TypeBadge itemType={item.itemType} premium={item.premium} />
                  <span style={{ width: 1, height: 12, background: '#DDDDD0', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'var(--font-sans)' }}>
                    {relativeTime(item.pubDate)}
                  </span>
                </div>

                {/* Cover thumbnail */}
                {item.coverImage && (
                  <div style={{ float: 'right', marginLeft: 14, marginBottom: 6, width: 110, height: 74, flexShrink: 0, overflow: 'hidden' }}>
                    <Image
                      src={item.coverImage}
                      alt=""
                      width={110}
                      height={74}
                      style={{ objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Headline */}
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: item.itemType === 'hawk-scan' ? 20 : 18,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: '#18180F',
                  margin: '0 0 10px',
                  letterSpacing: '-0.01em',
                }}>
                  {decodeHtml(item.title)}
                </h2>

                {/* Body — truncate only when there's a destination; show full otherwise */}
                {(item.summary || item.href) && (
                  <div style={{ marginBottom: 14 }}>
                    {item.summary && (
                      <p style={{
                        fontSize: 14,
                        color: '#48483A',
                        lineHeight: 1.75,
                        margin: '0 0 8px',
                        fontWeight: 300,
                      }}>
                        {item.href ? truncate(item.summary) : item.summary}
                      </p>
                    )}
                    {item.href && (
                      <Link href={item.href} style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 11,
                        color: item.itemType === 'hawk-scan' ? '#CC3300' : '#C8720A',
                        textDecoration: 'none',
                        letterSpacing: '0.03em',
                      }}>
                        Read full →
                      </Link>
                    )}
                  </div>
                )}

                {/* Cross-asset tags */}
                {crossAssets.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {crossAssets.map(a => {
                      const detector = ASSET_DETECTORS.find(d => d.label === a)
                      return detector?.href ? (
                        <Pill key={a} tone="neutral" size="xs" href={detector.href}>{a.toUpperCase()}</Pill>
                      ) : (
                        <Pill key={a} tone="neutral" size="xs">{a.toUpperCase()}</Pill>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })
      })()}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, marginTop: 8 }}>
          <PageLink page={Math.max(1, page - 1)} filter={activeFilter} disabled={page === 1}>← Prev</PageLink>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', minWidth: 0 }}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <Link
                key={p}
                href={newsHref(activeFilter, p)}
                style={{
                  fontFamily: 'var(--font-sans)', fontSize: 11,
                  width: 30, height: 30, border: '0.5px solid #DDDDD0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none',
                  background: page === p ? '#18180F' : 'transparent',
                  color: page === p ? '#FAFAF6' : '#8A8A7A',
                }}
              >
                {p}
              </Link>
            ))}
          </div>

          <PageLink page={Math.min(totalPages, page + 1)} filter={activeFilter} disabled={page === totalPages}>Next →</PageLink>
        </div>
      )}

      {/* Item count */}
      {totalFiltered > 0 && (
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em', textAlign: 'center', marginTop: 16 }}>
          {`${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, totalFiltered)} of ${totalFiltered} intelligence items`}
        </div>
      )}
    </div>
  )
}

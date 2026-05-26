'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Tag from '@/components/Tag'

const FILTERS = ['All', 'Metals', 'Energy', 'Policy', 'Macro', 'Agri', 'Geopolitics']

const FILTER_KEYWORDS: Record<string, string[]> = {
  Metals:      ['gold', 'silver', 'copper', 'metal', 'aluminium', 'zinc', 'nickel', 'platinum'],
  Energy:      ['crude', 'oil', 'opec', 'brent', 'natural gas', 'lng', 'lpg', 'refinery'],
  Policy:      ['import duty', 'export', 'customs', 'tariff', 'excise', 'sebi', 'rbi', 'repo', 'msp', 'budget', 'finance ministry', 'monetary policy', 'regulation'],
  Macro:       ['macro', 'inflation', 'cpi', 'wpi', 'gdp', 'pmi', 'iip', 'rupee', 'forex', 'usdinr', 'federal reserve', 'rate cut', 'rate hike', 'trade deficit'],
  Agri:        ['agri', 'wheat', 'soybean', 'cotton', 'ncdex', 'monsoon', 'crop', 'cardamom', 'pepper', 'kharif', 'rabi', 'castor'],
  Geopolitics: ['iran', 'russia', 'ukraine', 'sanction', 'hormuz', 'suez', 'red sea', 'war', 'geopolit'],
}

const ASSET_DETECTORS: { label: string; re: RegExp }[] = [
  { label: 'Gold',      re: /\bgold\b/i },
  { label: 'Silver',    re: /\bsilver\b/i },
  { label: 'Crude',     re: /\bcrude|brent\b/i },
  { label: 'Copper',    re: /\bcopper\b/i },
  { label: 'Nat Gas',   re: /natural.gas|nat.gas|\blng\b/i },
  { label: 'Rupee',     re: /\brupee\b|usdinr/i },
  { label: 'DXY',       re: /\bdollar.index\b|\bdxy\b/i },
  { label: 'Fed',       re: /federal.reserve|fomc|\bfed\b/i },
  { label: 'RBI',       re: /\brbi\b|repo.rate/i },
  { label: 'OPEC',      re: /\bopec\b/i },
  { label: 'China',     re: /\bchina\b/i },
  { label: 'MCX',       re: /\bmcx\b/i },
]

export interface NewsItem {
  id:          string
  title:       string
  summary:     string
  category:    string
  tagType:     string
  pubDate:     string
  pubDateIST?: string
  href?:       string
  itemType?:   'news' | 'flash' | 'alert' | 'hawk-scan'
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins <  1)  return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function toISTDateKey(iso: string): string {
  return new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)
}

function dateDividerLabel(dateKey: string): string {
  const todayIST = toISTDateKey(new Date().toISOString())
  const yestIST  = toISTDateKey(new Date(Date.now() - 86400000).toISOString())
  if (dateKey === todayIST) return 'Today'
  if (dateKey === yestIST)  return 'Yesterday'
  return new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function matchesFilter(item: NewsItem, filter: string): boolean {
  if (filter === 'All') return true
  const text = `${item.title} ${item.summary} ${item.category}`.toLowerCase()
  return (FILTER_KEYWORDS[filter] ?? [filter.toLowerCase()]).some(k => text.includes(k))
}

function getCrossAssets(item: NewsItem): string[] {
  const text = `${item.title} ${item.summary}`
  return ASSET_DETECTORS.filter(a => a.re.test(text)).map(a => a.label).slice(0, 4)
}

function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  const cut = text.lastIndexOf(' ', maxLen)
  return text.slice(0, cut > 0 ? cut : maxLen) + '…'
}

function TypeBadge({ itemType }: { itemType?: NewsItem['itemType'] }) {
  if (itemType === 'hawk-scan') return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', background: '#1A0A0A', color: '#FF4444', border: '0.5px solid #FF4444', fontWeight: 600 }}>
      ⚡ HAWK-SCAN
    </span>
  )
  if (itemType === 'flash') return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: '#FFF7E0', color: '#996600', border: '0.5px solid #D4A830' }}>
      Flash
    </span>
  )
  if (itemType === 'alert') return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', background: '#EAF5EE', color: '#1E6630', border: '0.5px solid #5AAA70' }}>
      Analysis
    </span>
  )
  return null
}

function Skeleton() {
  const bar = (w: string, h = 14) => (
    <div style={{ height: h, borderRadius: 2, background: '#E8E4D8', width: w, marginBottom: 8 }} />
  )
  return (
    <div style={{ padding: '22px 0', borderBottom: '1px solid #E8E4D8' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {bar('60px', 20)} {bar('64px', 16)} {bar('40px', 16)}
      </div>
      {bar('95%', 17)} {bar('75%', 17)}
      {bar('88%', 13)} {bar('65%', 13)}
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {bar('44px', 18)} {bar('44px', 18)} {bar('44px', 18)}
      </div>
    </div>
  )
}

const ITEMS_PER_PAGE = 20

interface Props {
  serverItems?: NewsItem[]
}

export default function NewsFeed({ serverItems = [] }: Props) {
  const [news,         setNews]         = useState<NewsItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(false)
  const [activeFilter, setActiveFilter] = useState('All')
  const [page,         setPage]         = useState(1)
  const [lastFetched,  setLastFetched]  = useState<Date | null>(null)

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error('bad response')
      setNews(await res.json())
      setLastFetched(new Date())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const id = setInterval(fetchNews, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchNews])

  // Merge server items (flash + articles) with live API items, dedup by id
  // Hawk-scan items always float to the top, then sort newest first within each tier
  const allItems = useMemo(() => {
    const seen = new Set<string>()
    return [...serverItems, ...news]
      .filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })
      .sort((a, b) => {
        const aHawk = a.itemType === 'hawk-scan' ? 1 : 0
        const bHawk = b.itemType === 'hawk-scan' ? 1 : 0
        if (bHawk !== aHawk) return bHawk - aHawk
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      })
  }, [serverItems, news])

  const filtered   = allItems.filter(item => matchesFilter(item, activeFilter))
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div>

      {/* Last updated indicator */}
      {!loading && lastFetched && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.04em' }}>
            ● updated {relativeTime(lastFetched.toISOString())}
          </span>
        </div>
      )}

      {/* Filter pills with counts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = f === 'All' ? allItems.length : allItems.filter(item => matchesFilter(item, f)).length
          const active = activeFilter === f
          return (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setPage(1) }}
              style={{
                padding: '5px 14px',
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                border: active ? '0.5px solid #18180F' : '0.5px solid #DDDDD0',
                background: active ? '#18180F' : '#FAFAF6',
                color: active ? '#FAFAF6' : count > 0 ? '#48483A' : '#C8C8B8',
                cursor: 'pointer',
                transition: 'all .12s',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {f.toUpperCase()}
              {count > 0 && (
                <span style={{
                  fontSize: 9,
                  background: active ? 'rgba(255,255,255,0.2)' : '#E8E4D8',
                  color: active ? '#FAFAF6' : '#8A8A7A',
                  padding: '1px 5px',
                  borderRadius: 10,
                  lineHeight: 1.4,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Loading skeleton — only while live API is loading */}
      {loading && news.length === 0 && serverItems.length === 0 && [0, 1, 2, 3, 4].map(i => <Skeleton key={i} />)}

      {/* Error state */}
      {!loading && error && allItems.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8A8A7A', padding: '24px 0', letterSpacing: '0.04em' }}>
          Intelligence feed offline — retrying in 5 min
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: '32px 0', borderTop: '0.5px solid #DDDDD0' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#8A8A7A', letterSpacing: '0.04em', margin: '0 0 8px' }}>
            No {activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' '}intelligence right now.
          </p>
          {activeFilter !== 'All' && allItems.length > 0 && (
            <button
              onClick={() => { setActiveFilter('All'); setPage(1) }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#C8720A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Show all {allItems.length} items →
            </button>
          )}
        </div>
      )}

      {/* Intelligence items — grouped by IST date */}
      {(() => {
        let lastDateKey = ''
        return paginated.map((item, idx) => {
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
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#18180F',
                  }}>
                    {dateDividerLabel(dateKey)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.04em' }}>
                    {dateKey}
                  </span>
                </div>
              )}
              <div style={item.itemType === 'hawk-scan' ? {
                padding: '20px 20px 20px 16px',
                borderBottom: '0.5px solid #DDDDD0',
                background: '#0E0806',
                borderLeft: '3px solid #FF4444',
                marginLeft: -1,
              } : { padding: '22px 0', borderBottom: '0.5px solid #DDDDD0' }}>

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Tag type={item.tagType}>{item.category}</Tag>
                  <TypeBadge itemType={item.itemType} />
                  <span style={{ width: 1, height: 12, background: item.itemType === 'hawk-scan' ? 'rgba(255,68,68,0.3)' : '#DDDDD0', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: item.itemType === 'hawk-scan' ? 'rgba(255,255,255,0.45)' : '#8A8A7A', fontFamily: 'var(--font-mono)' }}>
                    {item.pubDateIST
                      ? item.pubDateIST.split(', ')[1]
                      : relativeTime(item.pubDate)}
                  </span>
                </div>

                {/* Headline */}
                <h2 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: item.itemType === 'hawk-scan' ? 20 : 18,
                  fontWeight: 700,
                  lineHeight: 1.35,
                  color: item.itemType === 'hawk-scan' ? '#FFFFFF' : '#18180F',
                  margin: '0 0 10px',
                  letterSpacing: '-0.01em',
                }}>
                  {item.title}
                </h2>

                {/* Body — 2 opening lines + read full */}
                {item.summary && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{
                      fontSize: 14,
                      color: item.itemType === 'hawk-scan' ? 'rgba(255,255,255,0.65)' : '#48483A',
                      lineHeight: 1.75,
                      margin: '0 0 8px',
                      fontWeight: 300,
                    }}>
                      {truncate(item.summary)}
                    </p>
                    {item.href && (
                      <Link href={item.href} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: item.itemType === 'hawk-scan' ? '#FF6666' : '#C8720A',
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
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: item.itemType === 'hawk-scan' ? 'rgba(255,255,255,0.35)' : '#8A8A7A', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 2 }}>
                      Touches
                    </span>
                    {crossAssets.map(a => (
                      <span key={a} style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.06em',
                        padding: '2px 7px',
                        background: item.itemType === 'hawk-scan' ? 'rgba(255,68,68,0.1)' : '#F3F2EC',
                        color: item.itemType === 'hawk-scan' ? '#FF8888' : '#48483A',
                        border: item.itemType === 'hawk-scan' ? '0.5px solid rgba(255,68,68,0.3)' : '0.5px solid #DDDDD0',
                      }}>
                        {a.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })
      })()}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, marginTop: 8 }}>
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em',
              padding: '8px 16px', border: '0.5px solid #DDDDD0',
              background: page === 1 ? 'transparent' : '#18180F',
              color: page === 1 ? '#C8C8B8' : '#FAFAF6',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  width: 30, height: 30, border: '0.5px solid #DDDDD0',
                  background: page === p ? '#18180F' : 'transparent',
                  color: page === p ? '#FAFAF6' : '#8A8A7A',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === totalPages}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.05em',
              padding: '8px 16px', border: '0.5px solid #DDDDD0',
              background: page === totalPages ? 'transparent' : '#18180F',
              color: page === totalPages ? '#C8C8B8' : '#FAFAF6',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Item count */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em', textAlign: 'center', marginTop: 16 }}>
          {`${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} intelligence items`}
        </div>
      )}
    </div>
  )
}

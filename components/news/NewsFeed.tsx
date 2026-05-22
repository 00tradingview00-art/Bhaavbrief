'use client'
import { useState, useEffect, useCallback } from 'react'
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

// Cross-asset tags detected from item text
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

interface NewsItem {
  id:       string
  title:    string
  summary:  string
  category: string
  tagType:  string
  impact?:  string
  pubDate:  string
}

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins <  1)  return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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

function ImpactBadge({ impact }: { impact?: string }) {
  if (!impact || impact === 'neutral') return (
    <span style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.02em' }}>◆ Neutral</span>
  )
  if (impact === 'bullish') return (
    <span style={{ fontSize: 11, color: '#1E6630', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.02em' }}>▲ Bullish</span>
  )
  return (
    <span style={{ fontSize: 11, color: '#991818', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.02em' }}>▼ Bearish</span>
  )
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

export default function NewsFeed() {
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

  const filtered   = news.filter(item => matchesFilter(item, activeFilter))
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Category distribution for the coverage bar
  const catCounts = FILTERS.slice(1).map(f => ({
    label: f,
    count: news.filter(item => matchesFilter(item, f)).length,
  })).filter(c => c.count > 0)

  return (
    <div>

      {/* Coverage bar */}
      {!loading && !error && catCounts.length > 0 && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          padding: '10px 14px', background: '#F3F2EC', border: '0.5px solid #DDDDD0',
          marginBottom: 20,
        }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8A7A', marginRight: 4 }}>
            Coverage
          </span>
          {catCounts.map(c => (
            <span key={c.label} style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#48483A' }}>
              {c.label} <strong style={{ color: '#18180F' }}>{c.count}</strong>
            </span>
          ))}
          {lastFetched && (
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A', marginLeft: 'auto' }}>
              updated {relativeTime(lastFetched.toISOString())}
            </span>
          )}
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1) }}
            style={{
              padding: '5px 14px',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.04em',
              border: activeFilter === f ? '0.5px solid #18180F' : '0.5px solid #DDDDD0',
              background: activeFilter === f ? '#18180F' : '#FAFAF6',
              color: activeFilter === f ? '#FAFAF6' : '#8A8A7A',
              cursor: 'pointer',
              transition: 'all .12s',
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && [0, 1, 2, 3, 4].map(i => <Skeleton key={i} />)}

      {/* Error state */}
      {!loading && error && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8A8A7A', padding: '24px 0', letterSpacing: '0.04em' }}>
          Intelligence feed offline — retrying in 5 min
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: '#8A8A7A', padding: '32px 0', letterSpacing: '0.04em' }}>
          No intelligence in this category right now — check back shortly.
        </p>
      )}

      {/* Intelligence items */}
      {!loading && !error && paginated.map((item, idx) => {
        const crossAssets = getCrossAssets(item)
        return (
          <div
            key={item.id}
            style={{
              padding: '22px 0',
              borderBottom: '0.5px solid #DDDDD0',
              borderTop: idx === 0 ? '0.5px solid #DDDDD0' : 'none',
            }}
          >
            {/* Meta row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <Tag type={item.tagType}>{item.category}</Tag>
              <span style={{ width: 1, height: 12, background: '#DDDDD0', display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#8A8A7A', fontFamily: 'IBM Plex Mono, monospace' }}>
                {relativeTime(item.pubDate)}
              </span>
              <span style={{ fontSize: 11, color: '#C8C8B8', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                BhaavBrief Intelligence
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.35,
              color: '#18180F',
              margin: '0 0 10px',
              letterSpacing: '-0.01em',
            }}>
              {item.title}
            </h2>

            {/* Body */}
            {item.summary && (
              <p style={{
                fontSize: 13,
                color: '#48483A',
                lineHeight: 1.75,
                margin: '0 0 14px',
                fontWeight: 300,
              }}>
                {item.summary}
              </p>
            )}

            {/* Cross-asset tags */}
            {crossAssets.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#8A8A7A', letterSpacing: '0.08em', textTransform: 'uppercase', marginRight: 2 }}>
                  Touches
                </span>
                {crossAssets.map(a => (
                  <span key={a} style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 9,
                    letterSpacing: '0.06em',
                    padding: '2px 7px',
                    background: '#F3F2EC',
                    color: '#48483A',
                    border: '0.5px solid #DDDDD0',
                  }}>
                    {a.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, marginTop: 8 }}>
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.05em',
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
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
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
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.05em',
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
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em', textAlign: 'center', marginTop: 16 }}>
          {`${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} intelligence items`}
        </div>
      )}
    </div>
  )
}

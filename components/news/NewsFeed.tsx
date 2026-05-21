'use client'
import { useState, useEffect, useCallback } from 'react'
import Tag from '@/components/Tag'

const FILTERS = ['All', 'Gold', 'Silver', 'Crude', 'Copper', 'Nat Gas', 'Macro', 'Agri', 'Geopolitics']

const FILTER_KEYWORDS: Record<string, string[]> = {
  Gold:        ['gold'],
  Silver:      ['silver'],
  Crude:       ['crude', 'oil', 'opec', 'brent'],
  Copper:      ['copper'],
  'Nat Gas':   ['natural gas', 'nat gas', 'lng', 'lpg'],
  Macro:       ['macro', 'rbi', 'fed ', 'rate', 'rupee', 'forex', 'inflation', 'gdp'],
  Agri:        ['agri', 'wheat', 'soybean', 'cotton', 'ncdex', 'monsoon', 'crop', 'cardamom', 'pepper'],
  Geopolitics: ['iran', 'russia', 'ukraine', 'sanction', 'hormuz', 'suez', 'war', 'geopolit'],
}

interface NewsItem {
  id:          string
  title:       string
  description: string
  link:        string
  pubDate:     string
  source:      string
  category:    string
  tagType:     string
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
  const text = `${item.title} ${item.description} ${item.category}`.toLowerCase()
  return (FILTER_KEYWORDS[filter] ?? [filter.toLowerCase()]).some(k => text.includes(k))
}

function Skeleton() {
  const bar = (w: string, h = 14) => (
    <div style={{ height: h, borderRadius: 4, background: '#E8E4D8', width: w, marginBottom: 8 }} />
  )
  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid #E8E4D8' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
        {bar('56px', 20)}
        {bar('36px', 20)}
      </div>
      {bar('100%', 18)}
      {bar('72%',  18)}
      {bar('90%',  13)}
      {bar('60%',  13)}
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

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      if (!res.ok) throw new Error('bad response')
      setNews(await res.json())
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews()
    const id = setInterval(fetchNews, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchNews])

  const filtered   = news.filter(item => matchesFilter(item, activeFilter))
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setActiveFilter(f); setPage(1) }}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--border-2)',
              background: activeFilter === f ? 'var(--ink)' : 'var(--surface)',
              color: activeFilter === f ? '#fff' : 'var(--ink-3)',
              cursor: 'pointer',
              transition: 'all .15s',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && [0, 1, 2, 3, 4].map(i => <Skeleton key={i} />)}

      {/* Error state */}
      {!loading && error && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', padding: '24px 0' }}>
          Unable to load headlines — retrying in 15 min
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', padding: '32px 0' }}>
          No headlines in this category right now.
        </p>
      )}

      {/* News items */}
      {!loading && !error && paginated.map(item => (
        <a
          key={item.id}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', padding: '20px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <Tag type={item.tagType}>{item.category}</Tag>
            <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{relativeTime(item.pubDate)}</span>
            {item.source && (
              <>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{item.source}</span>
              </>
            )}
          </div>
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 17,
            fontWeight: 500,
            lineHeight: 1.4,
            color: 'var(--ink)',
            margin: '0 0 7px',
          }}>
            {item.title}
          </h2>
          {item.description && (
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, margin: 0 }}>
              {item.description}
            </p>
          )}
        </a>
      ))}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 24, marginTop: 8 }}>
          <button
            onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            disabled={page === 1}
            style={{
              fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.05em',
              padding: '8px 16px', border: '0.5px solid var(--border-2)',
              background: page === 1 ? 'transparent' : 'var(--ink)', color: page === 1 ? 'var(--ink-4)' : '#fff',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Prev
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{
                  fontFamily: 'IBM Plex Mono, monospace', fontSize: 11,
                  width: 32, height: 32, border: '0.5px solid var(--border-2)',
                  background: page === p ? 'var(--ink)' : 'transparent',
                  color: page === p ? '#fff' : 'var(--ink-3)',
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
              padding: '8px 16px', border: '0.5px solid var(--border-2)',
              background: page === totalPages ? 'transparent' : 'var(--ink)', color: page === totalPages ? 'var(--ink-4)' : '#fff',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Item count */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'var(--ink-4)', letterSpacing: '0.04em', textAlign: 'center', marginTop: 12 }}>
          {`Showing ${(page - 1) * ITEMS_PER_PAGE + 1}–${Math.min(page * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} items`}
        </div>
      )}
    </div>
  )
}

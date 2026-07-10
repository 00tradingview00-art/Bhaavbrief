'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'
import type { ScoredEntry } from '@/lib/searchIndex'

const STARTER_QUESTIONS = [
  'How does rising crude oil impact Indian importers?',
  'What drives MCX gold prices in India?',
  'Explain USDINR impact on commodity prices',
  'What is open interest and why does it matter?',
  'How does OPEC+ affect MCX crude?',
  'What is import parity price?',
]

function relDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function TypePill({ type }: { type: ScoredEntry['type'] }) {
  const styles: Record<string, { bg: string; color: string; label: string; border?: string }> = {
    brief:       { bg: '#F3F0E8', color: '#7A7668', label: 'Brief'    },
    article:     { bg: '#F0F4FF', color: '#2B4FC7', label: 'Flash'    },
    'hawk-scan': { bg: '#1A0A0A', color: '#FF4444', label: '⚡ Hawk', border: '#FF4444' },
    news:        { bg: '#EFFAF4', color: '#166534', label: 'News'     },
  }
  const s = styles[type] ?? styles.article
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '2px 6px',
      background: s.bg, color: s.color,
      border: `0.5px solid ${s.border ?? 'transparent'}`,
      fontWeight: 600, flexShrink: 0,
    }}>
      {s.label}
    </span>
  )
}

export default function AboutSearch() {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [asked,   setAsked]   = useState<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 3) { setResult(null); setAsked(''); return }
    setLoading(true)
    setAsked(trimmed)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error('bad')
      setResult(await res.json())
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 420)
  }

  const handleStarter = (q: string) => {
    setQuery(q)
    inputRef.current?.focus()
    doSearch(q)
  }

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      {/* Section header */}
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700,
        marginBottom: '0.4rem', paddingBottom: '0.5rem', borderBottom: '0.5px solid #DDDDD0',
      }}>
        Ask BhaavBrief
      </h2>
      <p style={{ fontSize: 15, color: '#8A8A7A', marginBottom: '1.25rem', lineHeight: 1.6, fontWeight: 300 }}>
        Search past briefs and articles, or ask anything about Indian commodity markets.
      </p>

      {/* Search input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: '1px solid #DDDDD0', background: '#FAFAF6',
        padding: '10px 14px', borderRadius: 4,
        marginBottom: '1rem',
        transition: 'border-color 0.15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: '#8A8A7A', flexShrink: 0 }}>
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(query)}
          placeholder="e.g. how does rising crude affect chemical companies"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontSize: 15, color: '#18180F', fontFamily: 'var(--font-sans)',
          }}
        />
        {loading && (
          <div style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: '2px solid #DDDDD0', borderTopColor: '#C8720A',
            animation: 'spin 0.7s linear infinite',
          }} />
        )}
      </div>

      {/* Starter questions */}
      {!result && !loading && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.5rem' }}>
          {STARTER_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => handleStarter(q)}
              style={{
                fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.02em',
                color: '#48483A', background: '#F3F2EC',
                border: '0.5px solid #DDDDD0', padding: '5px 10px',
                cursor: 'pointer', lineHeight: 1.4, textAlign: 'left',
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EAE8E0'; e.currentTarget.style.borderColor = '#C8720A' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F3F2EC'; e.currentTarget.style.borderColor = '#DDDDD0' }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{
          border: '0.5px solid #DDDDD0', borderRadius: 4, overflow: 'hidden',
          background: '#FFFFFF',
        }}>
          {/* Question echo */}
          {asked && (
            <div style={{
              padding: '10px 16px',
              background: '#F3F2EC',
              borderBottom: '0.5px solid #DDDDD0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.04em' }}>
                &quot;{asked}&quot;
              </span>
              <button
                onClick={() => { setResult(null); setQuery(''); setAsked('') }}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.06em',
                }}
              >
                CLEAR ×
              </button>
            </div>
          )}

          {/* AI answer */}
          {result.answer && (
            <div style={{ padding: '16px', borderBottom: '0.5px solid #DDDDD0', background: '#FAFAF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: '#C8720A',
                  background: '#FFF7E0', padding: '2px 7px',
                  border: '0.5px solid #D4A830',
                }}>
                  Intelligence
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A' }}>
                  Educational · Not investment advice
                </span>
              </div>
              <p style={{ fontSize: 15, color: '#48483A', lineHeight: 1.8, margin: 0, fontWeight: 300 }}>
                {result.answer}
              </p>
            </div>
          )}

          {/* Content matches */}
          {result.contentMatches.length > 0 && (
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#8A8A7A',
                padding: '10px 16px 6px',
              }}>
                From BhaavBrief
              </div>
              {result.contentMatches.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  style={{ textDecoration: 'none', display: 'block' }}
                >
                  <div
                    style={{
                      padding: '10px 16px',
                      borderTop: '0.5px solid #DDDDD0',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F3F2EC')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <TypePill type={item.type} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A' }}>
                        {relDate(item.date)}
                      </span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: '#18180F', margin: '0 0 2px', lineHeight: 1.3 }}>
                      {item.title}
                      <span style={{ fontSize: 11, color: '#C8720A', marginLeft: 5, fontFamily: 'var(--font-mono)' }}>→</span>
                    </p>
                    {item.description && (
                      <p style={{ fontSize: 11, color: '#8A8A7A', margin: 0, lineHeight: 1.5 }}>
                        {item.description.slice(0, 100)}{item.description.length > 100 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Related questions */}
          {result.relatedQuestions.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: '0.5px solid #DDDDD0', background: '#FAFAF6' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: '#8A8A7A', marginBottom: 8,
              }}>
                Related
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.relatedQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => handleStarter(q)}
                    style={{
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      color: '#C8720A', background: 'none',
                      border: '0.5px solid #D4A830', padding: '4px 9px',
                      cursor: 'pointer', letterSpacing: '0.02em',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF7E0')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    + {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </section>
  )
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import type { SearchResult } from '@/app/api/search/route'
import type { ScoredEntry } from '@/lib/searchIndex'

// ── Suggested starter queries ──────────────────────────────────────────────────
const SUGGESTIONS = [
  'how does rising crude impact import costs',
  'gold silver ratio explained',
  'what moves MCX crude prices',
  'USDINR impact on commodity prices',
  'EIA inventory and crude price linkage',
  'OPEC production cuts India impact',
]

// ── Formatting ─────────────────────────────────────────────────────────────────
function relDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function TypePill({ type }: { type: ScoredEntry['type'] }) {
  const s: Record<string, { bg: string; color: string; label: string; border?: string }> = {
    brief:       { bg: '#F3F0E8', color: '#7A7668', label: 'Brief'    },
    article:     { bg: '#F0F4FF', color: '#2B4FC7', label: 'Flash'    },
    'hawk-scan': { bg: '#1A0A0A', color: '#FF4444', label: '⚡ Hawk', border: '#FF4444' },
    news:        { bg: '#EFFAF4', color: '#166534', label: 'News'     },
  }
  const st = s[type] ?? s.article
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em',
      textTransform: 'uppercase', padding: '2px 6px',
      background: st.bg, color: st.color,
      border: `0.5px solid ${st.border ?? 'transparent'}`,
      fontWeight: 600, flexShrink: 0,
    }}>
      {st.label}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: Props) {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResult(null)
      setError(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 3) { setResult(null); return }
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      if (!res.ok) throw new Error('bad response')
      setResult(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (val: string) => {
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 420)
  }

  const handleSuggestion = (s: string) => {
    setQuery(s)
    doSearch(s)
  }

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(14,13,10,0.72)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'clamp(48px, 10vh, 96px)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 680,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          margin: '0 16px',
          maxHeight: 'calc(100vh - 120px)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--ink-4)' }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            placeholder="Ask about commodities…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, color: 'var(--ink)',
              background: 'transparent',
              fontFamily: 'var(--font-sans)',
              minWidth: 0,
            }}
          />
          {loading && (
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: '2px solid var(--border)',
              borderTopColor: 'var(--gold)',
              animation: 'spin 0.7s linear infinite',
            }} />
          )}
          <kbd onClick={onClose} style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--ink-4)', background: 'var(--surface-3)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '2px 6px', cursor: 'pointer', flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* Scrollable results area */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Suggestions — show when no query */}
          {!query && !result && (
            <div style={{ padding: '16px 20px' }}>
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: 12,
              }}>
                Try asking
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    style={{
                      textAlign: 'left', background: 'none', border: 'none',
                      padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                      fontSize: 13, color: 'var(--ink-2)',
                      transition: 'background 0.1s',
                      fontFamily: 'var(--font-sans)',
                      minHeight: 44, display: 'flex', alignItems: 'center',
                      width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ color: 'var(--ink-4)', marginRight: 8 }}>→</span>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)' }}>
                Search offline — try again in a moment
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div>
              {/* AI Answer */}
              {result.answer && (
                <div style={{
                  padding: '20px 20px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: 'var(--gold)',
                      background: 'var(--gold-pale)', padding: '2px 7px',
                      border: '0.5px solid rgba(181,134,42,0.25)',
                    }}>
                      Intelligence
                    </span>
                  </div>
                  <p style={{
                    fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.75,
                    margin: 0, fontWeight: 300,
                  }}>
                    {result.answer}
                  </p>
                </div>
              )}

              {/* Content matches */}
              {result.contentMatches.length > 0 && (
                <div>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--ink-4)',
                    padding: '14px 20px 8px', margin: 0,
                  }}>
                    From BhaavBrief
                  </p>
                  {result.contentMatches.map(item => (
                    <Link
                      key={item.slug}
                      href={item.href}
                      onClick={onClose}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <div
                        style={{
                          padding: '12px 20px',
                          borderTop: '0.5px solid var(--border)',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <TypePill type={item.type} />
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: 'var(--ink-4)', letterSpacing: '0.03em',
                          }}>
                            {relDate(item.date)}
                          </span>
                          {item.commodity && (
                            <span style={{
                              fontFamily: 'var(--font-mono)', fontSize: 9,
                              color: 'var(--ink-4)', letterSpacing: '0.03em',
                            }}>
                              · {item.commodity}
                            </span>
                          )}
                        </div>
                        <p style={{
                          fontSize: 13, fontWeight: 500, color: 'var(--ink)',
                          margin: '0 0 3px', lineHeight: 1.35,
                        }}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p style={{
                            fontSize: 12, color: 'var(--ink-3)',
                            margin: 0, lineHeight: 1.5,
                          }}>
                            {item.description.slice(0, 120)}{item.description.length > 120 ? '…' : ''}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Related questions */}
              {result.relatedQuestions.length > 0 && (
                <div style={{
                  padding: '12px 20px 16px',
                  borderTop: '1px solid var(--border)',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--ink-4)',
                    margin: '0 0 8px',
                  }}>
                    Related
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {result.relatedQuestions.map(q => (
                      <button
                        key={q}
                        onClick={() => handleSuggestion(q)}
                        style={{
                          textAlign: 'left', background: 'none', border: 'none',
                          padding: '6px 8px', borderRadius: 5, cursor: 'pointer',
                          fontSize: 12, color: 'var(--ink-3)',
                          fontFamily: 'var(--font-sans)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ color: 'var(--gold)', marginRight: 6 }}>+</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {!result.answer && result.contentMatches.length === 0 && (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-4)' }}>
                    No results — try a different search term
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          flexWrap: 'wrap', gap: '4px 12px',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)' }}>
            BhaavBrief Intelligence
          </span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

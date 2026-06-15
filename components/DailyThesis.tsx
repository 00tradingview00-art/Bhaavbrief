'use client'
import { useEffect, useState } from 'react'

interface ThesisEntry {
  date:        string
  thesis:      string
  commodity:   string
  direction:   'bullish' | 'bearish'
  targetLevel: number
  reasoning:   string
  editionRef?: number
}

interface ThesisResolved extends ThesisEntry {
  outcome:     'CORRECT' | 'WRONG'
  actualClose: number
  outcomeNote: string
}

interface ThesisData {
  current:   ThesisEntry | null
  yesterday: ThesisResolved | null
  history:   ThesisResolved[]
}

function calcStreak(history: ThesisResolved[]): { streak: number; total: number; correct: number } {
  let streak = 0
  for (const entry of history) {
    if (entry.outcome === 'CORRECT') streak++
    else break
  }
  return {
    streak,
    total:   history.length,
    correct: history.filter(h => h.outcome === 'CORRECT').length,
  }
}

export default function DailyThesis() {
  const [data, setData] = useState<ThesisData | null>(null)

  useEffect(() => {
    fetch('/api/thesis')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => {})
  }, [])

  if (!data || (!data.current && !data.yesterday)) return null

  const { current, yesterday } = data
  const { streak, total, correct } = calcStreak(data.history ?? [])

  // IST close time display
  const closeTime = '11:30 PM IST tonight'

  const commodityColor: Record<string, string> = {
    'MCX Crude':   '#7C3AED',
    'MCX Gold':    '#B45309',
    'MCX Silver':  '#2B4FC7',
    'MCX Copper':  '#065F46',
    'MCX NatGas':  '#7C3AED',
  }

  return (
    <div style={{
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 28,
    }}>
      {/* Yesterday's resolution */}
      {yesterday && (
        <div style={{
          background: yesterday.outcome === 'CORRECT' ? 'var(--up-bg)' : 'var(--down-bg)',
          borderBottom: `1px solid ${yesterday.outcome === 'CORRECT' ? '#C6E4D2' : '#F2C9C4'}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {yesterday.outcome === 'CORRECT'
              ? <span style={{ color: 'var(--up)', fontWeight: 700, fontSize: 14 }}>✓</span>
              : <span style={{ color: 'var(--down)', fontWeight: 700, fontSize: 14 }}>✗</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: yesterday.outcome === 'CORRECT' ? 'var(--up)' : 'var(--down)',
                fontWeight: 700,
              }}>
                YESTERDAY · {yesterday.outcome}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'white',
                background: commodityColor[yesterday.commodity] ?? '#7A7668',
                padding: '1px 6px',
                borderRadius: 3,
              }}>
                {yesterday.commodity.replace('MCX ', '')}
              </span>
            </div>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 15,
              color: 'var(--ink-2)',
              margin: '0 0 2px',
              lineHeight: 1.4,
              fontStyle: 'italic',
            }}>
              "{yesterday.thesis}"
            </p>
            {yesterday.outcomeNote && (
              <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0, lineHeight: 1.4 }}>
                {yesterday.outcomeNote}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Today's thesis */}
      {current && (
        <div style={{ padding: '14px 16px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              fontWeight: 600,
            }}>
              TODAY'S THESIS
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'white',
              background: commodityColor[current.commodity] ?? '#7A7668',
              padding: '1px 6px',
              borderRadius: 3,
            }}>
              {current.commodity.replace('MCX ', '')}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 3,
              background: current.direction === 'bullish' ? 'var(--up-bg)' : 'var(--down-bg)',
              color: current.direction === 'bullish' ? 'var(--up)' : 'var(--down)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {current.direction === 'bullish' ? '▲ BULLISH' : '▼ BEARISH'}
            </span>
          </div>

          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ink)',
            margin: '0 0 6px',
            lineHeight: 1.45,
          }}>
            "{current.thesis}"
          </p>

          {current.reasoning && (
            <p style={{
              fontSize: 12,
              color: 'var(--ink-3)',
              margin: '0 0 8px',
              lineHeight: 1.5,
            }}>
              {current.reasoning}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              letterSpacing: '0.05em',
            }}>
              Watch: ₹{current.targetLevel.toLocaleString('en-IN')} · Resolution {closeTime}
            </span>

            {total > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {streak >= 2 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--up)',
                    background: 'var(--up-bg)',
                    padding: '2px 7px',
                    borderRadius: 3,
                    letterSpacing: '0.06em',
                  }}>
                    {streak}-DAY STREAK
                  </span>
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--ink-4)',
                  letterSpacing: '0.04em',
                }}>
                  {correct}/{total} correct
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

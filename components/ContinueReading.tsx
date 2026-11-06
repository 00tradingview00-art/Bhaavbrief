'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CommodityVisit } from './CommodityVisitTracker'

const STORAGE_KEY = 'bb_commodity_visits'
const SHOWN = 3

export default function ContinueReading() {
  const [visits, setVisits] = useState<CommodityVisit[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setVisits((JSON.parse(raw) as CommodityVisit[]).slice(0, SHOWN))
    } catch {
      // localStorage unavailable — just show nothing
    }
  }, [])

  // Reserve this slot's height even before the localStorage read resolves —
  // returning visitors (the only ones who ever see real pills here) got a
  // whole row inserted between the hero and TerminalTabbar after first paint,
  // pushing everything below it down. A fresh Lighthouse/lab run never has
  // reading history, so this never reproduced synthetically (lab CLS ~0.003
  // vs. real-user field CLS 0.13) despite being a real, every-repeat-visit
  // shift. Same label + one placeholder pill, same padding/border, just
  // invisible — matches the real single-row height instead of guessing a
  // pixel value that drifts if the styling below ever changes.
  if (visits.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)',
        visibility: 'hidden',
      }}>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em',
          textTransform: 'uppercase', flexShrink: 0,
        }}>
          Continue reading
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 13, fontWeight: 500,
          padding: '4px 10px', borderRadius: 20,
          border: '1px solid transparent',
        }}>
          &nbsp;
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
      marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--ink-4)', flexShrink: 0,
      }}>
        Continue reading
      </span>
      {visits.map(v => (
        <Link
          key={v.slug}
          href={`/commodities/${v.slug}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
            textDecoration: 'none',
            padding: '4px 10px', borderRadius: 20,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
          }}
        >
          {v.name}
          <span style={{ color: 'var(--gold)' }}>→</span>
        </Link>
      ))}
    </div>
  )
}

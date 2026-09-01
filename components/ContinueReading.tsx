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

  if (visits.length === 0) return null

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

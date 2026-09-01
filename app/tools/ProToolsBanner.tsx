'use client'

import Link from 'next/link'
import { useIsPro } from '@/lib/useIsPro'

// Separate client component so /tools itself can stay a static/ISR page —
// only this banner needs to know the visitor's live Pro status (it was
// previously showing an "Unlock" CTA to already-subscribed Pro users, since
// the page had no auth check at all).
export default function ProToolsBanner() {
  const isPro = useIsPro()
  if (isPro) return null

  return (
    <Link
      href="/pro"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        border: '1px solid var(--border-2)',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        marginBottom: '2.5rem',
        textDecoration: 'none',
        background: 'var(--surface-3)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
        Want the full analytics suite? See everything BhaavBrief Pro unlocks
      </span>
      <span style={{ fontSize: '0.75rem', background: 'var(--ink)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap' }}>
        Unlock — ₹33/day →
      </span>
    </Link>
  )
}

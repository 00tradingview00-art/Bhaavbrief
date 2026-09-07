'use client'

import { useEffect, useState } from 'react'
import { formatRemaining } from '@/lib/formatTime'

export default function CountdownTimer({ targetIso, label }: { targetIso: string; label: string }) {
  const [remaining, setRemaining] = useState(() => new Date(targetIso).getTime() - Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(new Date(targetIso).getTime() - Date.now())
    }, 60_000)
    return () => clearInterval(id)
  }, [targetIso])

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      borderRight: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      borderLeft: '3px solid var(--gold)',
      background: 'var(--gold-pale)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
      marginBottom: 16,
    }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--ink-2)' }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
        color: 'var(--gold)', letterSpacing: '0.02em',
      }}>
        {formatRemaining(remaining)}
      </div>
    </div>
  )
}

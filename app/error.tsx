'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <div style={{ textAlign: 'center', padding: '80px 24px', maxWidth: 480, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        color: 'var(--gold)', marginBottom: 16,
      }}>
        Error
      </div>
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 28, fontWeight: 500,
        color: 'var(--ink)', margin: '0 0 12px',
      }}>
        Something went wrong
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 32 }}>
        An unexpected error occurred while loading this page. You can try again or head back home.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => reset()} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--ink)', color: '#fff',
          padding: '10px 22px', borderRadius: 4,
          fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
        }}>
          ↻ Try again
        </button>
        <Link href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1px solid var(--border)', color: 'var(--ink-2)',
          padding: '10px 20px', borderRadius: 4,
          fontSize: 15, textDecoration: 'none',
        }}>
          ← Back to home
        </Link>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { useIsPro } from '@/lib/useIsPro'

interface Props {
  children?: React.ReactNode
  isPro?: boolean
  label: string
  timestamp?: string
  /**
   * Stand-in content shown blurred to non-Pro visitors instead of `children`.
   *
   * Use this whenever `children` would contain real Pro data: anything passed
   * to this (client) component is serialized into the page for every visitor,
   * so blurring real data only hides it visually — it is still readable in
   * the page source. With `preview`, the caller must only pass real
   * `children` when it already knows the visitor is Pro (server-checked, or
   * fetched client-side from a Pro-gated API). The gate then never upgrades
   * itself client-side — it would otherwise un-blur the stand-in as if real.
   *
   * Without `preview` (legacy mode) the gate blurs `children` and upgrades on
   * a client-side Pro check — only acceptable when `children` is built from
   * data free visitors already receive (e.g. the free option chain).
   */
  preview?: React.ReactNode
}

export default function ProBlurGate({ children, isPro: serverPro = false, label, timestamp, preview }: Props) {
  const clientIsPro = useIsPro()
  const isPro = preview !== undefined ? serverPro : serverPro || clientIsPro
  if (isPro) return <>{children}</>

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      <div aria-hidden="true" style={{ filter: 'blur(7px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {preview !== undefined ? preview : children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(243, 240, 232, 0.88)',
        backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1.5rem',
      }}>
        {timestamp && (
          <span style={{ fontSize: '0.72rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>
            🔴 {timestamp}
          </span>
        )}
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--ink)', textAlign: 'center', fontFamily: 'var(--font-sans)' }}>
          {label}
        </span>
        <Link href="/pro" style={{
          fontSize: '0.84rem', background: 'var(--ink)', color: '#fff',
          padding: '0.45rem 1.2rem', borderRadius: 20, textDecoration: 'none', fontWeight: 600,
          fontFamily: 'var(--font-sans)',
        }}>
          Unlock with Pro →
        </Link>
        <span style={{ fontSize: '0.7rem', color: 'var(--ink-3)', fontFamily: 'var(--font-sans)' }}>₹33/day · Cancel anytime</span>
      </div>
    </div>
  )
}

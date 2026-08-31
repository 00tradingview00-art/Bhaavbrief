'use client'
import Link from 'next/link'
import { useIsPro } from '@/lib/useIsPro'

interface Props {
  children: React.ReactNode
  isPro?: boolean
  label: string
  timestamp?: string
}

export default function ProBlurGate({ children, isPro: serverPro = false, label, timestamp }: Props) {
  const clientIsPro = useIsPro()
  const isPro = serverPro || clientIsPro
  if (isPro) return <>{children}</>

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ filter: 'blur(7px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
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

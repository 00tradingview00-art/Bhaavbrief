'use client'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface Props {
  children: React.ReactNode
  isPro?: boolean
  label: string
  timestamp?: string
}

export default function ProBlurGate({ children, isPro: serverPro = false, label, timestamp }: Props) {
  const { user } = useUser()
  const isPro = serverPro || user?.publicMetadata?.isPro === true
  if (isPro) return <>{children}</>

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
      <div style={{ filter: 'blur(7px)', opacity: 0.3, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(2px)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1.5rem',
      }}>
        {timestamp && <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>🔴 {timestamp}</span>}
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111', textAlign: 'center' }}>
          {label}
        </span>
        <Link href="/pro" style={{
          fontSize: '0.84rem', background: '#18181b', color: '#fff',
          padding: '0.45rem 1.2rem', borderRadius: 20, textDecoration: 'none', fontWeight: 600,
        }}>
          Unlock with Pro →
        </Link>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>₹33/day · Cancel anytime</span>
      </div>
    </div>
  )
}

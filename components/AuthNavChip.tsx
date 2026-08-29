'use client'

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function AuthNavChip() {
  const { isSignedIn, user } = useUser()
  const isPro = user?.publicMetadata?.isPro === true

  if (isSignedIn && isPro) {
    return (
      <Link href="/account" style={{ fontSize: '0.78rem', color: '#374151', padding: '4px 8px', borderRadius: 20, textDecoration: 'none' }}>
        Account
      </Link>
    )
  }

  if (isSignedIn) {
    return (
      <>
        <Link href="/pro" style={{ fontSize: '0.78rem', background: '#1a1a1a', color: '#fff', padding: '4px 12px', borderRadius: 20, textDecoration: 'none', fontWeight: 600 }}>
          Upgrade to Pro
        </Link>
        <Link href="/account" style={{ fontSize: '0.78rem', color: '#374151', padding: '4px 8px', borderRadius: 20, textDecoration: 'none' }}>
          Account
        </Link>
      </>
    )
  }

  return (
    <>
      <Link href="/pro" style={{ fontSize: '0.78rem', background: '#1a1a1a', color: '#fff', padding: '4px 12px', borderRadius: 20, textDecoration: 'none', fontWeight: 600 }}>
        Pro
      </Link>
      <Link href="/sign-in" style={{ fontSize: '0.78rem', color: '#374151', padding: '4px 8px', borderRadius: 20, textDecoration: 'none' }}>
        Sign in
      </Link>
    </>
  )
}

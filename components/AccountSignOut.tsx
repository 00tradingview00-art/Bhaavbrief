'use client'

import { SignOutButton } from '@clerk/nextjs'

export default function AccountSignOut() {
  return (
    <SignOutButton redirectUrl="/">
      <button
        type="button"
        style={{
          fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600,
          padding: '0.55rem 1.2rem', minHeight: 40, borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </SignOutButton>
  )
}

'use client'

import { useState } from 'react'
import { useClerk } from '@clerk/nextjs'

export default function SignOutButton() {
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(false)

  return (
    <button
      onClick={() => {
        setLoading(true)
        void signOut({ redirectUrl: '/' })
      }}
      disabled={loading}
      style={{
        fontSize: '0.8rem', color: 'var(--ink-3)', background: 'none', border: 'none',
        padding: 0, cursor: loading ? 'not-allowed' : 'pointer', textDecoration: 'underline',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}

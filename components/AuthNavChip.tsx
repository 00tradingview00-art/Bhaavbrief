'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

// No Clerk import here, deliberately. This chip is rendered on every page
// via Nav.tsx/MobileMenu.tsx, including pages with no other Clerk-aware
// content — mounting a ClerkProvider just for this (as an earlier version
// of this fix did, via a lazy-loaded independent instance) added a real,
// measurable burst of main-thread JS work on every page load, confirmed as
// the cause of a real PageSpeed regression (Desktop 99→84, Total Blocking
// Time 340ms). The chip only ever needs two booleans — is this visitor
// signed in, are they Pro — both already derivable from one fetch to
// /api/cashfree/poll-status (200 + isPro field = signed in; 401 = not),
// the same endpoint lib/useIsPro.ts already uses elsewhere for the same
// reason (Clerk's own cached client state has a documented staleness bug).
// Starts in the signed-out state (the common case) and updates once the
// fetch resolves — mirrors lib/useIsPro.ts's own pattern.
export default function AuthNavChip() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/cashfree/poll-status')
      .then(res => (res.ok ? res.json() : null))
      .then((data: { isPro?: boolean } | null) => {
        if (cancelled) return
        setIsSignedIn(data !== null)
        setIsPro(data?.isPro === true)
      })
      .catch(() => { /* keep signed-out default */ })
    return () => { cancelled = true }
  }, [])

  if (isSignedIn && isPro) {
    return (
      <Button href="/account" variant="secondary" size="sm">Account</Button>
    )
  }

  if (isSignedIn) {
    return (
      <>
        <Button href="/pro" variant="pill" size="sm">Upgrade to Pro</Button>
        <Button href="/account" variant="secondary" size="sm">Account</Button>
      </>
    )
  }

  return (
    <>
      <Button href="/pro" variant="pill" size="sm">Pro</Button>
      <Button href="/sign-in" variant="secondary" size="sm">Sign in</Button>
    </>
  )
}

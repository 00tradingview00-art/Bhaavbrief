'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

// Single source of truth for client-side Pro checks. Reuses the existing
// /api/cashfree/poll-status endpoint (already does auth() -> isProUser() ->
// live Redis read, already rate-limited) instead of trusting Clerk's cached
// user.publicMetadata.isPro, which nothing in the app ever force-refreshes
// after a purchase — that staleness was the direct cause of a paying user
// seeing "locked" on some pages and "unlocked" on others simultaneously.
//
// Multiple components mounting on the same page (nav chip, chain, IV Skew,
// etc.) share one in-flight fetch + a short-lived cache so they don't each
// hit the endpoint independently.

let cached: { isPro: boolean; expiresAt: number } | null = null
let inFlight: Promise<boolean> | null = null
const CACHE_MS = 15_000

function fetchIsPro(): Promise<boolean> {
  const now = Date.now()
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.isPro)
  if (inFlight) return inFlight

  inFlight = fetch('/api/cashfree/poll-status')
    .then(r => (r.ok ? r.json() : null))
    .then((d: { isPro?: boolean } | null) => {
      const isPro = d?.isPro === true
      cached = { isPro, expiresAt: Date.now() + CACHE_MS }
      return isPro
    })
    .catch(() => false)
    .finally(() => { inFlight = null })

  return inFlight
}

export function useIsPro(): boolean {
  const { isSignedIn, user } = useUser()
  // Start from Clerk's cached metadata so there's no flash of "locked" for a
  // returning Pro user while the live check is in flight — but the live
  // fetch below always wins once it resolves.
  const [isPro, setIsPro] = useState(user?.publicMetadata?.isPro === true)

  useEffect(() => {
    if (!isSignedIn) { setIsPro(false); return }
    let cancelled = false
    fetchIsPro().then(v => { if (!cancelled) setIsPro(v) })
    return () => { cancelled = true }
  }, [isSignedIn])

  return isPro
}

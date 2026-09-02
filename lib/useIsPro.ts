'use client'

import { useEffect, useState } from 'react'

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
//
// No Clerk import here, deliberately — mirrors components/AuthNavChip.tsx's
// fix. This hook's only Clerk client usage was useUser(), used solely to
// seed an initial value and gate the fetch behind isSignedIn — both already
// covered by fetchIsPro()'s own 200(+isPro)/401 response. But because this
// hook is pulled into OptionChain/IVSkewChart/OIBuildupChart/StrategyBuilder/
// MarketsClient/BasisClient/ProBlurGate/ProToolsBanner, that one useUser()
// call forced app/options, app/tools, app/markets, app/basis and
// app/research's layouts to each mount a full ClerkProvider — the identical
// class of PageSpeed regression (Desktop 99->84, Total Blocking Time 340ms)
// AuthNavChip.tsx's fix eliminated for the nav chip, just with a much wider
// blast radius. Trade-off: a returning Pro user now sees the locked state
// for one fetch round-trip instead of an instant unlock — the same
// trade-off AuthNavChip.tsx already made.

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
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchIsPro().then(v => { if (!cancelled) setIsPro(v) })
    return () => { cancelled = true }
  }, [])

  return isPro
}

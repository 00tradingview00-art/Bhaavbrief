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
// covered by fetchProStatus()'s own 200(+isPro)/401 response. But because this
// hook is pulled into OptionChain/IVSkewChart/OIBuildupChart/StrategyBuilder/
// MarketsClient/BasisClient/ProBlurGate/ProToolsBanner, that one useUser()
// call forced app/options, app/tools, app/markets, app/basis and
// app/research's layouts to each mount a full ClerkProvider — the identical
// class of PageSpeed regression (Desktop 99->84, Total Blocking Time 340ms)
// AuthNavChip.tsx's fix eliminated for the nav chip, just with a much wider
// blast radius. Trade-off: a returning Pro user now sees the locked state
// for one fetch round-trip instead of an instant unlock — the same
// trade-off AuthNavChip.tsx already made.

export interface ProStatus {
  isPro: boolean
  /** Pro until the paid period ends, but renewal stopped — may buy a new plan. */
  cancelling: boolean
}

const FREE: ProStatus = { isPro: false, cancelling: false }

let cached: { status: ProStatus; expiresAt: number } | null = null
let inFlight: Promise<ProStatus> | null = null
const CACHE_MS = 15_000

function fetchProStatus(): Promise<ProStatus> {
  const now = Date.now()
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.status)
  if (inFlight) return inFlight

  inFlight = fetch('/api/cashfree/poll-status')
    .then(r => (r.ok ? r.json() : null))
    .then((d: { isPro?: boolean; cancelling?: boolean } | null) => {
      const isPro = d?.isPro === true
      const status = { isPro, cancelling: isPro && d?.cancelling === true }
      cached = { status, expiresAt: Date.now() + CACHE_MS }
      return status
    })
    .catch(() => FREE)
    .finally(() => { inFlight = null })

  return inFlight
}

export function useProStatus(): ProStatus {
  const [status, setStatus] = useState<ProStatus>(FREE)

  useEffect(() => {
    let cancelled = false
    fetchProStatus().then(v => { if (!cancelled) setStatus(v) })
    return () => { cancelled = true }
  }, [])

  return status
}

export function useIsPro(): boolean {
  return useProStatus().isPro
}

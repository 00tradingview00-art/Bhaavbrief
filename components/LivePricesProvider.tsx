'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { PriceData } from '@/lib/prices'
import { isWithinMcxHours } from '@/scripts/lib/mcxHours.js'

const LivePricesContext = createContext<PriceData | null>(null)

// Single shared poll of /api/prices for the whole page tree, mounted once in
// the root layout. Before this, TickerStrip, MarketsClient, DailyBriefHome,
// CommodityTerminalGrid, CommodityPriceHero and DriverMaps each ran their own
// independent 30s/5min poll — on a page rendering more than one of them
// (e.g. the homepage: TickerStrip + CommodityTerminalGrid; a commodity page:
// TickerStrip + CommodityPriceHero + DriverMaps), that meant 2-3 near-
// simultaneous requests to /api/prices per page view. That was tripping the
// route's per-IP rate limit (confirmed: real 429s in production on
// 2026-11-20), and a 429'd poll silently keeps whatever was last shown — the
// cause of "stale on some refreshes, fresh on others." One poll here, read
// via useLivePrices(), fixes the multiplicity regardless of how many
// components on a page want the data.
export function LivePricesProvider({ initialPrices, children }: { initialPrices: PriceData | null; children: ReactNode }) {
  const [prices, setPrices] = useState<PriceData | null>(initialPrices)
  const pollRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' })
        if (!res.ok) return
        setPrices(await res.json() as PriceData)
      } catch {
        // Keep current values — don't replace live data with nothing
      }
    }

    function scheduleNext() {
      const delay = isWithinMcxHours() ? 30_000 : 300_000
      pollRef.current = setTimeout(async () => {
        await load()
        scheduleNext()
      }, delay)
    }

    load()
    scheduleNext()
    return () => clearTimeout(pollRef.current)
  }, [])

  return <LivePricesContext.Provider value={prices}>{children}</LivePricesContext.Provider>
}

// Returns the shared live PriceData, re-rendering whenever the provider's
// poll resolves. The caller's own initial/SSR value should still be used for
// the very first paint (this context starts out equal to whatever
// initialPrices the root layout loaded, which may differ by a few seconds
// from a page's own SSR snapshot — both come from the same underlying
// source, so this is not a correctness gap).
export function useLivePrices(): PriceData | null {
  return useContext(LivePricesContext)
}

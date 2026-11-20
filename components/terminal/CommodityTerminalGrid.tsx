'use client'

import { useEffect, useRef, useState } from 'react'
import type { PriceData } from '@/lib/prices'
import { isWithinMcxHours } from '@/scripts/lib/mcxHours.js'
import CommodityGatewayCard from './CommodityGatewayCard'
import type { CoreInstrument, TerminalInstrumentData, GATEWAY_META } from '@/lib/terminalData'

interface Props {
  instruments:   readonly CoreInstrument[]
  meta:          typeof GATEWAY_META
  initialPrices: PriceData | null
  terminalData:  Record<CoreInstrument, TerminalInstrumentData | null>
  sparklines:    Record<CoreInstrument, number[]>
}

// One shared poll for the whole grid rather than each of the 5 cards fetching
// independently — same /api/prices endpoint and 30s/5min cadence as
// TickerStrip/MarketsClient/DailyBriefHome (see scripts/lib/mcxHours.js for
// the shared market-hours clock), just fanned out to 5 cards instead of
// overwriting one ticker. optionsData (iVIX/PCR/Max Pain/Vol Prem) is left
// alone — it's already a live per-request Kite fetch via getOptionsChain()
// (dynamic = 'force-dynamic' on the homepage's getTerminalData() call), so
// re-fetching it client-side would be new load for no freshness gain.
export default function CommodityTerminalGrid({ instruments, meta, initialPrices, terminalData, sparklines }: Props) {
  const [prices, setPrices] = useState<PriceData | null>(initialPrices)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/prices', { cache: 'no-store' })
        if (!res.ok) return
        const d: PriceData = await res.json()
        setPrices(d)
      } catch {
        // Keep current values — don't replace live data with nothing
      }
    }

    function scheduleNext() {
      const delay = isWithinMcxHours() ? 30_000 : 300_000
      intervalRef.current = setTimeout(async () => {
        await load()
        scheduleNext()
      }, delay)
    }

    load()
    scheduleNext()
    return () => clearTimeout(intervalRef.current)
  }, [])

  const snapshotStale = prices?.snapshotStale ?? false

  return (
    <div className="terminal-commodity-grid" style={{ display: 'grid', gap: 12 }}>
      {instruments.map(instrument => {
        const instMeta = meta[instrument]
        return (
          <CommodityGatewayCard
            key={instrument}
            meta={instMeta}
            priceData={prices ? prices[instMeta.priceKey] : null}
            snapshotStale={snapshotStale}
            optionsData={terminalData[instrument]}
            sparkCloses={sparklines[instrument] ?? []}
          />
        )
      })}
    </div>
  )
}

'use client'

import type { PriceData } from '@/lib/prices'
import { useLivePrices } from '@/components/LivePricesProvider'
import CommodityGatewayCard from './CommodityGatewayCard'
import type { CoreInstrument, TerminalInstrumentData, GATEWAY_META } from '@/lib/terminalData'

interface Props {
  instruments:   readonly CoreInstrument[]
  meta:          typeof GATEWAY_META
  initialPrices: PriceData | null
  terminalData:  Record<CoreInstrument, TerminalInstrumentData | null>
  sparklines:    Record<CoreInstrument, number[]>
}

// Reads the shared poll (one fetch for the whole page tree, see
// LivePricesProvider in app/layout.tsx) rather than running its own — this
// used to poll independently, which on the homepage meant two near-
// simultaneous requests to /api/prices per page view (this grid +
// TickerStrip, both in the root layout), tripping the route's rate limit in
// production (2026-11-20). optionsData (iVIX/PCR/Max Pain/Vol Prem) is left
// alone — it's already a live per-request Kite fetch via getOptionsChain()
// (dynamic = 'force-dynamic' on the homepage's getTerminalData() call), so
// re-fetching it client-side would be new load for no freshness gain.
export default function CommodityTerminalGrid({ instruments, meta, initialPrices, terminalData, sparklines }: Props) {
  const live   = useLivePrices()
  const prices = live ?? initialPrices
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

'use client'

import dynamic from 'next/dynamic'
import type { CoreInstrument, TermStructurePoint } from '@/lib/terminalData'

// recharts is only used by this one chart on the homepage — lazy-load it so
// the library's JS/hydration cost doesn't land in the initial bundle for
// every visitor (ProBlurGate still renders this for non-Pro users, just
// blurred, so it isn't otherwise skippable). `next/dynamic({ ssr: false })`
// must live in a Client Component, hence this thin wrapper around the
// server-rendered app/page.tsx call site.
const IVTermStructureChart = dynamic(
  () => import('./IVTermStructureChart'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 240, borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
    ),
  },
)

interface Props {
  termStructure: Record<CoreInstrument, TermStructurePoint[]>
  isPro: boolean
}

export default function IVTermStructureChartLazy(props: Props) {
  return <IVTermStructureChart {...props} />
}

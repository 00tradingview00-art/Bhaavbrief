'use client'

import dynamic from 'next/dynamic'
import ProBlurGate from '@/components/ProBlurGate'
import { useIsPro } from '@/lib/useIsPro'
import type { CoreInstrument, TermStructurePoint } from '@/lib/terminalData'

// recharts is only used by this one chart on the homepage — lazy-load it so
// the library's JS/hydration cost doesn't land in the initial bundle for
// every visitor. The dynamic import is gated on isPro (not just deferred):
// it used to render unconditionally with ProBlurGate only *visually*
// blurring the result, so every non-Pro visitor still paid recharts' real
// fetch+eval cost for a chart they'd never see — confirmed via a throttled
// Lighthouse profile as a real ~135ms contributor to Total Blocking Time.
// `next/dynamic({ ssr: false })` must live in a Client Component, hence this
// thin wrapper around the server-rendered app/page.tsx call site.
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

export default function IVTermStructureChartLazy({ termStructure, isPro: serverPro }: Props) {
  const clientIsPro = useIsPro()
  const isPro = serverPro || clientIsPro

  if (!isPro) {
    return (
      <ProBlurGate isPro={false} label="iVIX Term Structure — implied volatility by expiry bucket" timestamp="Live">
        <div style={{ height: 240 }} />
      </ProBlurGate>
    )
  }

  return <IVTermStructureChart termStructure={termStructure} />
}

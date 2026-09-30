'use client'

import dynamic from 'next/dynamic'
import ProBlurGate from '@/components/ProBlurGate'
import { useProData } from '@/lib/useProData'
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
//
// The term-structure data itself is Pro-only: it is no longer passed in from
// the shared ISR homepage (where every visitor received it), but fetched from
// /api/pro/data once the visitor is confirmed Pro.
const IVTermStructureChart = dynamic(
  () => import('./IVTermStructureChart'),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 240, borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
    ),
  },
)

type TermStructure = Record<CoreInstrument, TermStructurePoint[]>

export default function IVTermStructureChartLazy() {
  const { isPro, data, failed } = useProData<TermStructure>('kind=term-structure')

  if (!isPro) {
    return (
      <ProBlurGate
        label="iVIX Term Structure — implied volatility by expiry bucket"
        timestamp="Live"
        preview={<div style={{ height: 240 }} />}
      />
    )
  }

  if (failed) {
    return <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>Term structure is unavailable right now — try again shortly.</p>
  }
  if (!data) {
    return <div style={{ height: 240, borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
  }
  return <IVTermStructureChart termStructure={data} />
}

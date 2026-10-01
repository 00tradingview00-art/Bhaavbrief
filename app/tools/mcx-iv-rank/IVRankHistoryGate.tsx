'use client'

import IVRankHistoryChart from './IVRankHistoryChart'
import type { IVRankInstrumentSeries } from '@/lib/ivRankHistory'
import { previewDates, previewWave } from '@/lib/proPreview'
import { useProData } from '@/lib/useProData'

interface Props {
  title: string
  // Current IV Rank per instrument (free — also shown in the page's cards);
  // null where there isn't enough history yet.
  instruments: { key: string; label: string; latest: number | null }[]
}

// IV Rank *history* is Pro-only. This page is ISR-cached and shared by every
// visitor, so the series is no longer rendered into it: Pro browsers fetch it
// from /api/pro/data; everyone else gets synthetic lines that end at each
// instrument's real (free) current rank, shown blurred.
export default function IVRankHistoryGate({ title, instruments }: Props) {
  const { isPro, data, failed } = useProData<{ instruments: IVRankInstrumentSeries[] }>('kind=iv-rank-history')

  if (isPro) {
    if (data) return <IVRankHistoryChart title={title} instruments={data.instruments} isPro />
    return failed
      ? <p style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>IV Rank history is unavailable right now — try again shortly.</p>
      : <div style={{ height: 380, borderRadius: 'var(--radius-md)' }} className="bb-skeleton-bar" />
  }

  const dates = previewDates(30)
  const preview = instruments
    .filter(i => i.latest != null)
    .map((inst, n) => {
      const values = previewWave(30, inst.latest as number, 18, n + 1).map(v => Math.min(100, Math.max(0, v)))
      values[values.length - 1] = inst.latest as number
      return { key: inst.key, label: inst.label, series: dates.map((date, i) => ({ date, ivRank: values[i] })) }
    })
  return <IVRankHistoryChart title={title} instruments={preview} isPro={false} />
}

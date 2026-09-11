'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'
import { CORE_INSTRUMENTS, GATEWAY_META, type CoreInstrument, type TermStructurePoint } from '@/lib/terminalData'

interface Props {
  termStructure: Record<CoreInstrument, TermStructurePoint[]>
  isPro: boolean
}

const BUCKET_LABELS = ['Near', 'Next', 'Far']

export default function IVTermStructureChart({ termStructure, isPro }: Props) {
  // Reshape from per-instrument arrays into one row per expiry bucket
  // (Recharts wants [{ bucket, GOLD: 24.1, SILVER: 19.8, ... }, ...]).
  const maxBuckets = Math.max(0, ...CORE_INSTRUMENTS.map(i => termStructure[i]?.length ?? 0))
  const data = Array.from({ length: maxBuckets }, (_, bucketIdx) => {
    const row: Record<string, string | number | null> = { bucket: BUCKET_LABELS[bucketIdx] ?? `+${bucketIdx}` }
    for (const instrument of CORE_INSTRUMENTS) {
      row[instrument] = termStructure[instrument]?.[bucketIdx]?.ivix ?? null
    }
    return row
  })

  if (maxBuckets === 0) return null

  return (
    <ProBlurGate isPro={isPro} label="iVIX Term Structure — implied volatility by expiry bucket" timestamp="Live">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => [typeof v === 'number' ? `${v.toFixed(1)}%` : '—']} />
          <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => GATEWAY_META[value as CoreInstrument]?.label ?? value} />
          {CORE_INSTRUMENTS.map(instrument => (
            <Line
              key={instrument}
              type="monotone"
              dataKey={instrument}
              name={instrument}
              stroke={GATEWAY_META[instrument].color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ProBlurGate>
  )
}

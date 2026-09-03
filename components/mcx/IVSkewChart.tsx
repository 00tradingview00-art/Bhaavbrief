'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import ProBlurGate from '@/components/ProBlurGate'

interface ChainRow {
  strike: number
  isATM?: boolean
  CE: { iv: number | null; tier: string }
  PE: { iv: number | null; tier: string }
}

interface Props {
  chain: ChainRow[]
  isPro: boolean
}

export default function IVSkewChart({ chain, isPro }: Props) {
  // Only LIVE-tier IVs go into the line — STALE means "no live two-sided
  // quote, this print may not be a current tradeable price" (see D-06 in
  // lib/options.ts), which is a reasonable caveat for a table cell with a
  // "Stale" badge next to it but produces a misleading, jagged sawtooth in a
  // continuous line chart where a viewer reads jumps as signal, not
  // liquidity gaps. Real gaps are left as gaps, never interpolated.
  const data = chain
    .filter(r => r.CE.tier === 'LIVE' || r.PE.tier === 'LIVE')
    .map(r => ({
      strike: r.strike,
      ceIV:   (r.CE.tier === 'LIVE' && r.CE.iv != null && r.CE.iv > 0) ? r.CE.iv : null,
      peIV:   (r.PE.tier === 'LIVE' && r.PE.iv != null && r.PE.iv > 0) ? r.PE.iv : null,
      isATM:  r.isATM,
    }))
    .filter(r => r.ceIV != null || r.peIV != null)

  if (data.length < 2) return null

  const atmStrike = chain.find(r => r.isATM)?.strike

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', opacity: 0.75 }}>
        IV Skew
      </h4>
      <ProBlurGate isPro={isPro} label="IV Skew — Call vs Put implied volatility by strike" timestamp="Live">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <XAxis
              dataKey="strike"
              tick={{ fontSize: 10 }}
              tickFormatter={v => Number(v).toLocaleString('en-IN')}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={v => `${v}%`}
              domain={['auto', 'auto']}
            />
            <Tooltip
              formatter={(v) => [typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)]}
              labelFormatter={v => `Strike ${Number(v).toLocaleString('en-IN')}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {atmStrike != null && (
              <ReferenceLine x={atmStrike} stroke="var(--ink-4)" strokeDasharray="3 3" label={{ value: 'ATM', fontSize: 9 }} />
            )}
            <Line
              type="monotone"
              dataKey="ceIV"
              name="Call IV"
              stroke="var(--up)"
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="peIV"
              name="Put IV"
              stroke="var(--down)"
              dot={false}
              strokeWidth={1.5}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </ProBlurGate>
    </div>
  )
}

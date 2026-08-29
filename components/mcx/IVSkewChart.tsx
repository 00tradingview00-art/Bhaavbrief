'use client'

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

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
  if (!isPro) return null

  const data = chain
    .filter(r => r.CE.tier !== 'JUNK' || r.PE.tier !== 'JUNK')
    .map(r => ({
      strike: r.strike,
      ceIV:   (r.CE.tier !== 'JUNK' && r.CE.iv != null && r.CE.iv > 0) ? r.CE.iv : null,
      peIV:   (r.PE.tier !== 'JUNK' && r.PE.iv != null && r.PE.iv > 0) ? r.PE.iv : null,
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
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <XAxis
            dataKey="strike"
            tick={{ fontSize: 10 }}
            tickFormatter={v => String(v)}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickFormatter={v => `${v}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v) => [typeof v === 'number' ? `${v.toFixed(1)}%` : String(v)]}
            labelFormatter={v => `Strike ${v}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {atmStrike != null && (
            <ReferenceLine x={atmStrike} stroke="#888" strokeDasharray="3 3" label={{ value: 'ATM', fontSize: 9 }} />
          )}
          <Line
            type="monotone"
            dataKey="ceIV"
            name="Call IV"
            stroke="#22c55e"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="peIV"
            name="Put IV"
            stroke="#f97316"
            dot={false}
            strokeWidth={1.5}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

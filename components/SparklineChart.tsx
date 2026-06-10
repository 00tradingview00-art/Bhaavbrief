'use client'

interface Props {
  data:   number[]   // close prices, oldest first
  color:  string
  width?: number
  height?: number
}

export default function SparklineChart({ data, color, width = 120, height = 36 }: Props) {
  if (!data || data.length < 2) {
    return <div style={{ width, height, opacity: 0.2, background: 'var(--border)', borderRadius: 2 }} />
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pad = 3
  const w = width  - pad * 2
  const h = height - pad * 2

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w
    const y = pad + (1 - (v - min) / range) * h
    return [x, y] as [number, number]
  })

  const linePath = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ')

  // Fill: close the path down to the bottom edge
  const last  = points[points.length - 1]
  const first = points[0]
  const fillPath = `${linePath} L ${last[0].toFixed(1)} ${(pad + h).toFixed(1)} L ${first[0].toFixed(1)} ${(pad + h).toFixed(1)} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={fillPath} fill={color} fillOpacity={0.10} stroke="none" />
      <path d={linePath}  fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle cx={last[0].toFixed(1)} cy={last[1].toFixed(1)} r={2.5} fill={color} />
    </svg>
  )
}

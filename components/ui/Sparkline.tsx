'use client'
import { useId } from 'react'

const SIZES = {
  mini: { width: 80, height: 32 },
  hero: { width: 90, height: 44 },
  card: { width: 82, height: 38 },
} as const

interface SparklineProps {
  closes: number[]
  size?: keyof typeof SIZES
}

// Hand-rolled inline SVG per Part 12 §12.4.1 — not recharts, to avoid
// instantiating a full chart library 6-9 times per page for an 80x32 line.
export default function Sparkline({ closes, size = 'card' }: SparklineProps) {
  const gradientId = useId()
  const { width, height } = SIZES[size]

  if (!closes || closes.length < 2) return null

  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const range = max - min || 1
  const up = closes[closes.length - 1] >= closes[0]
  const color = up ? 'var(--up)' : 'var(--down)'

  const padY = 3
  const points = closes.map((v, i) => {
    const x = (i / (closes.length - 1)) * width
    const y = padY + (1 - (v - min) / range) * (height - padY * 2)
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  )
}

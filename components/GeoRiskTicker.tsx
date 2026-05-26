'use client'

import { useEffect, useState } from 'react'
import type { HotspotItem, RiskLevel } from '@/app/api/geo-risk/route'

const RISK_COLOR: Record<RiskLevel, string> = {
  high:   '#F87171',
  watch:  '#FBBF24',
  stable: '#4ADE80',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  high:   'HIGH',
  watch:  'WATCH',
  stable: 'STABLE',
}

const FALLBACK: HotspotItem[] = [
  { key: 'hormuz',  label: 'Hormuz',        risk: 'watch', lastSeen: null },
  { key: 'redsea',  label: 'Red Sea',        risk: 'watch', lastSeen: null },
  { key: 'opec',    label: 'OPEC+',          risk: 'watch', lastSeen: null },
  { key: 'iran',    label: 'Iran',           risk: 'watch', lastSeen: null },
  { key: 'russia',  label: 'Russia/Ukraine', risk: 'watch', lastSeen: null },
]

export default function GeoRiskTicker() {
  const [items, setItems] = useState<HotspotItem[]>(FALLBACK)

  useEffect(() => {
    const load = () =>
      fetch('/api/geo-risk')
        .then(r => r.json())
        .then((d: HotspotItem[]) => { if (Array.isArray(d) && d.length) setItems(d) })
        .catch(() => {})

    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const doubled = [...items, ...items]

  return (
    <div style={{
      background:   '#1A1A12',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      overflow:     'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Fixed "GEO RISK" label — doesn't scroll */}
        <div style={{
          flexShrink:  0,
          padding:     '0 16px',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          display:     'flex',
          alignItems:  'center',
          background:  '#1A1A12',
          zIndex:      1,
          gap:         6,
        }}>
          {/* Animated pulse dot */}
          <span style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   '#FBBF24',
            flexShrink:   0,
            animation:    'geoPulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.45)',
            whiteSpace:    'nowrap',
          }}>
            Geo Risk
          </span>
        </div>

        {/* Scrolling hotspot track */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="geo-ticker-track">
            {doubled.map((item, i) => {
              const color = RISK_COLOR[item.risk]
              return (
                <span
                  key={`${item.key}-${i}`}
                  style={{
                    display:     'inline-flex',
                    alignItems:  'center',
                    gap:         7,
                    padding:     '7px 0',
                  }}
                >
                  {/* Colored dot with glow on high/watch */}
                  <span style={{
                    width:        7,
                    height:       7,
                    borderRadius: '50%',
                    background:   color,
                    flexShrink:   0,
                    boxShadow:    item.risk !== 'stable'
                      ? `0 0 6px ${color}99`
                      : 'none',
                  }} />

                  {/* Hotspot name */}
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      11,
                    fontWeight:    item.risk === 'high' ? 500 : 400,
                    color:         item.risk === 'high'
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.03em',
                  }}>
                    {item.label}
                  </span>

                  {/* Risk badge — always shown, color-coded */}
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      8,
                    letterSpacing: '0.1em',
                    fontWeight:    500,
                    color:         color,
                    opacity:       item.risk === 'stable' ? 0.6 : 0.9,
                    background:    `${color}18`,
                    padding:       '1px 5px',
                    borderRadius:  2,
                  }}>
                    {RISK_LABEL[item.risk]}
                  </span>

                  {/* Divider */}
                  <span style={{
                    color:       'rgba(255,255,255,0.12)',
                    fontSize:    12,
                    marginLeft:  6,
                    marginRight: 2,
                  }}>
                    ·
                  </span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

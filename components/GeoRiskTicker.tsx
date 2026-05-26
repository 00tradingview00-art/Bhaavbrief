'use client'

import { useEffect, useState } from 'react'
import type { HotspotItem, RiskLevel } from '@/app/api/geo-risk/route'

const RISK_COLOR: Record<RiskLevel, string> = {
  high:   '#F87171',  // red
  watch:  '#FBBF24',  // amber
  stable: '#4ADE80',  // green
}

const RISK_LABEL: Record<RiskLevel, string> = {
  high:   'HIGH',
  watch:  'WATCH',
  stable: 'STABLE',
}

// Fallback items shown while loading or if API fails
const FALLBACK: HotspotItem[] = [
  { key: 'hormuz',  label: 'Hormuz',        risk: 'watch',  lastSeen: null },
  { key: 'redsea',  label: 'Red Sea',        risk: 'watch',  lastSeen: null },
  { key: 'opec',    label: 'OPEC+',          risk: 'watch',  lastSeen: null },
  { key: 'iran',    label: 'Iran',           risk: 'watch',  lastSeen: null },
  { key: 'russia',  label: 'Russia/Ukraine', risk: 'watch',  lastSeen: null },
]

export default function GeoRiskTicker() {
  const [items, setItems] = useState<HotspotItem[]>(FALLBACK)

  useEffect(() => {
    fetch('/api/geo-risk')
      .then(r => r.json())
      .then((data: HotspotItem[]) => {
        if (Array.isArray(data) && data.length > 0) setItems(data)
      })
      .catch(() => {})   // keep fallback on error

    // Refresh every 15 min
    const id = setInterval(() => {
      fetch('/api/geo-risk')
        .then(r => r.json())
        .then((data: HotspotItem[]) => {
          if (Array.isArray(data) && data.length > 0) setItems(data)
        })
        .catch(() => {})
    }, 15 * 60 * 1000)

    return () => clearInterval(id)
  }, [])

  // Duplicate for seamless scroll loop
  const doubled = [...items, ...items]

  return (
    <div style={{
      background:   '#0F0F09',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      overflow:     'hidden',
      padding:      '5px 0',
    }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{
          flexShrink:    0,
          padding:       '0 14px',
          borderRight:   '1px solid rgba(255,255,255,0.08)',
          display:       'flex',
          alignItems:    'center',
          background:    '#0F0F09',
          zIndex:        1,
        }}>
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         'rgba(255,255,255,0.3)',
            whiteSpace:    'nowrap',
          }}>
            Geo Risk
          </span>
        </div>

        {/* Scrolling track */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="geo-ticker-track" style={{ display: 'flex', alignItems: 'center', gap: 28, whiteSpace: 'nowrap' }}>
            {doubled.map((item, i) => (
              <span
                key={`${item.key}-${i}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {/* Colored dot */}
                <span style={{
                  width:        6,
                  height:       6,
                  borderRadius: '50%',
                  background:   RISK_COLOR[item.risk],
                  flexShrink:   0,
                  boxShadow:    `0 0 4px ${RISK_COLOR[item.risk]}88`,
                }} />

                {/* Label */}
                <span style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      10,
                  color:         'rgba(255,255,255,0.65)',
                  letterSpacing: '0.04em',
                }}>
                  {item.label}
                </span>

                {/* Risk badge — only HIGH and WATCH, STABLE stays quiet */}
                {item.risk !== 'stable' && (
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      8,
                    letterSpacing: '0.08em',
                    color:         RISK_COLOR[item.risk],
                    opacity:       0.85,
                  }}>
                    {RISK_LABEL[item.risk]}
                  </span>
                )}

                {/* Separator */}
                <span style={{ color: 'rgba(255,255,255,0.12)', marginLeft: 2, fontSize: 10 }}>
                  |
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

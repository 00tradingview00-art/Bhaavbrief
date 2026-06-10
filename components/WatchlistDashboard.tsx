'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import SparklineChart from './SparklineChart'
import type { PulseData } from '@/app/api/commodity-pulse/route'

// ── Commodity config ──────────────────────────────────────────────────────────

const ALL_COMMODITIES = ['gold', 'silver', 'crude', 'copper', 'natgas'] as const
type CommodityKey = typeof ALL_COMMODITIES[number]

const META: Record<CommodityKey, {
  label:    string
  unit:     string
  chartKey: string
  pulseKey: string
  color:    string
  brief:    string   // tag to match in brief links
}> = {
  gold:   { label: 'MCX Gold',    unit: '/10g',    chartKey: 'gold',         pulseKey: 'GOLD',    color: '#B5862A', brief: 'Gold'    },
  silver: { label: 'MCX Silver',  unit: '/kg',     chartKey: 'silver',       pulseKey: 'SILVER',  color: '#6B7280', brief: 'Silver'  },
  crude:  { label: 'MCX Crude',   unit: '/bbl',    chartKey: 'crude-oil',    pulseKey: 'CRUDE',   color: '#7C3AED', brief: 'Crude'   },
  copper: { label: 'MCX Copper',  unit: '/kg',     chartKey: 'copper',       pulseKey: 'COPPER',  color: '#065F46', brief: 'Copper'  },
  natgas: { label: 'MCX NatGas',  unit: '/mmBtu',  chartKey: 'natural-gas',  pulseKey: 'NAT GAS', color: '#B45309', brief: 'NatGas'  },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface PriceData {
  gold?:   { mcx?: number; mcxChangePct?: number }
  silver?: { mcx?: number; mcxChangePct?: number }
  crude?:  { mcx?: number; mcxChangePct?: number }
  copper?: { mcx?: number; mcxChangePct?: number }
  natgas?: { mcx?: number; mcxChangePct?: number }
}

// ── Storage ───────────────────────────────────────────────────────────────────

const LS_KEY = 'bhaavbrief_watchlist'

function loadWatchlist(): CommodityKey[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return [...ALL_COMMODITIES]
    const parsed = JSON.parse(raw) as string[]
    const valid  = parsed.filter((k): k is CommodityKey => ALL_COMMODITIES.includes(k as CommodityKey))
    return valid.length > 0 ? valid : [...ALL_COMMODITIES]
  } catch {
    return [...ALL_COMMODITIES]
  }
}

function saveWatchlist(list: CommodityKey[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)) } catch {}
}

// ── Sparkline fetcher (per commodity, lazy) ───────────────────────────────────

function useSparkline(chartKey: string): number[] {
  const [data, setData] = useState<number[]>([])
  useEffect(() => {
    fetch(`/api/chart/${chartKey}?period=1m`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d || !Array.isArray(d)) return
        // Each candle: { date, open, high, low, price (close), volume }
        const closes = d.slice(-10).map((c: { price?: number }) => c.price ?? 0).filter(Boolean)
        setData(closes)
      })
      .catch(() => {})
  }, [chartKey])
  return data
}

// ── Individual card ───────────────────────────────────────────────────────────

function CommodityCard({
  commodityKey,
  prices,
  pulse,
  onRemove,
}: {
  commodityKey: CommodityKey
  prices:       PriceData | null
  pulse:        PulseData | null
  onRemove:     () => void
}) {
  const meta      = META[commodityKey]
  const priceData = prices?.[commodityKey]
  const pct       = priceData?.mcxChangePct ?? 0
  const price     = priceData?.mcx ?? 0
  const sparkData = useSparkline(meta.chartKey)

  const pulseRow  = pulse?.rows.find(r => r.name === meta.pulseKey)
  const driver    = pulseRow?.driver ?? ''

  const up        = pct >= 0
  const pctColor  = pct > 0.05 ? 'var(--up)' : pct < -0.05 ? 'var(--down)' : 'var(--ink-4)'
  const sparkColor = pct > 0.05 ? '#1B7A4A' : pct < -0.05 ? '#B53A2A' : '#9CA3AF'

  const fmtPrice  = price ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'
  const fmtPct    = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      position: 'relative',
      transition: 'border-color 0.15s',
    }}>
      {/* Color accent top bar */}
      <div style={{ height: 3, background: meta.color }} />

      <div style={{ padding: '14px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              marginBottom: 3,
            }}>
              {meta.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.5px',
              }}>
                {fmtPrice}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'var(--ink-4)',
              }}>
                {meta.unit}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {/* Remove button */}
            <button
              onClick={onRemove}
              title="Remove from watchlist"
              style={{
                width: 20, height: 20,
                border: 'none', background: 'none',
                cursor: 'pointer', color: 'var(--ink-4)',
                fontSize: 14, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 4,
                padding: 0,
              }}
            >
              ×
            </button>
            {/* % change badge */}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: pctColor,
              background: pct > 0.05 ? 'var(--up-bg)' : pct < -0.05 ? 'var(--down-bg)' : 'var(--surface-3)',
              padding: '3px 8px',
              borderRadius: 4,
            }}>
              {up && pct > 0.05 ? '▲ ' : !up && pct < -0.05 ? '▼ ' : ''}{fmtPct}
            </span>
          </div>
        </div>

        {/* Sparkline */}
        <div style={{ marginBottom: 10 }}>
          <SparklineChart data={sparkData} color={sparkColor} width={200} height={40} />
        </div>

        {/* AI driver */}
        {driver && (
          <p style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--ink-3)',
            margin: '0 0 10px',
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}>
            {driver}
          </p>
        )}

        {/* Brief link */}
        <Link
          href={`/briefs?tag=${meta.brief}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--gold)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
        >
          Read analysis →
        </Link>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function WatchlistDashboard() {
  const [watchlist, setWatchlist]   = useState<CommodityKey[]>([])
  const [prices, setPrices]         = useState<PriceData | null>(null)
  const [pulse, setPulse]           = useState<PulseData | null>(null)
  const [hydrated, setHydrated]     = useState(false)

  // Load from localStorage after hydration
  useEffect(() => {
    setWatchlist(loadWatchlist())
    setHydrated(true)
  }, [])

  // Fetch prices + pulse in parallel
  useEffect(() => {
    Promise.all([
      fetch('/api/prices').then(r => r.ok ? r.json() : null),
      fetch('/api/commodity-pulse').then(r => r.ok ? r.json() : null),
    ]).then(([p, pulse]) => {
      if (p)     setPrices(p)
      if (pulse) setPulse(pulse)
    }).catch(() => {})
  }, [])

  const toggle = useCallback((key: CommodityKey) => {
    setWatchlist(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
      saveWatchlist(next)
      return next
    })
  }, [])

  const remove = useCallback((key: CommodityKey) => {
    setWatchlist(prev => {
      const next = prev.filter(k => k !== key)
      saveWatchlist(next)
      return next
    })
  }, [])

  if (!hydrated) return null

  return (
    <div>
      {/* Macro theme strip */}
      {pulse?.theme && (
        <div style={{
          background: 'var(--gold-pale)',
          border: '1px solid rgba(181,134,42,0.25)',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 24,
          fontFamily: 'var(--font-serif)',
          fontSize: 14,
          color: 'var(--ink-2)',
          fontStyle: 'italic',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            fontStyle: 'normal',
            marginRight: 10,
          }}>
            Today&apos;s theme
          </span>
          {pulse.theme}
        </div>
      )}

      {/* Commodity picker */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-4)',
          marginBottom: 8,
        }}>
          Your watchlist
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ALL_COMMODITIES.map(key => {
            const active = watchlist.includes(key)
            const meta   = META[key]
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      10,
                  fontWeight:    active ? 600 : 400,
                  letterSpacing: '0.06em',
                  padding:       '5px 12px',
                  borderRadius:  20,
                  border:        `1px solid ${active ? meta.color : 'var(--border-2)'}`,
                  background:    active ? meta.color : 'transparent',
                  color:         active ? '#fff' : 'var(--ink-3)',
                  cursor:        'pointer',
                  transition:    'all .15s',
                }}
              >
                {meta.label.replace('MCX ', '')}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards grid */}
      {watchlist.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.04em',
        }}>
          Select commodities above to build your watchlist.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {watchlist.map(key => (
            <CommodityCard
              key={key}
              commodityKey={key}
              prices={prices}
              pulse={pulse}
              onRemove={() => remove(key)}
            />
          ))}
        </div>
      )}

      {pulse?.generatedAt && (
        <p style={{
          marginTop: 20,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--ink-4)',
          letterSpacing: '0.04em',
        }}>
          Updated {new Date(pulse.generatedAt).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false,
          })} IST
        </p>
      )}
    </div>
  )
}

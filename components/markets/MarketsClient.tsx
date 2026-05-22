'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { PriceData, MCXData } from '@/lib/prices'

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtINR(v: number, dec = 0): string {
  if (!v) return '—'
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
function fmtUSD(v: number, dec = 2): string {
  if (!v) return '—'
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`
}
function fmtPct(p: number): string {
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}
function fmtVol(v: number): string {
  if (!v) return '—'
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`
  if (v >= 1000)   return `${(v / 1000).toFixed(1)}K`
  return v.toLocaleString('en-IN')
}
function daysToExpiry(expiry: string): string {
  if (!expiry) return ''
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'Expired'
  if (days === 0) return 'Exp: Today'
  return `Exp: ${days}d`
}
function shortExpiry(expiry: string): string {
  if (!expiry) return ''
  return new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function isMCXOpen(): boolean {
  const m = new Date().getUTCHours() * 60 + new Date().getUTCMinutes()
  return m >= 210 && m <= 1080
}

// ── Card config ───────────────────────────────────────────────────────────────

const CARDS = [
  { key: 'gold',   label: 'MCX Gold',    unit: '/10g',   fmtP: (v: number) => fmtINR(v) },
  { key: 'silver', label: 'MCX Silver',  unit: '/kg',    fmtP: (v: number) => fmtINR(v) },
  { key: 'crude',  label: 'MCX Crude',   unit: '/bbl',   fmtP: (v: number) => fmtINR(v) },
  { key: 'copper', label: 'MCX Copper',  unit: '/kg',    fmtP: (v: number) => fmtINR(v, 2) },
  { key: 'natgas', label: 'MCX Nat Gas', unit: '/mmBtu', fmtP: (v: number) => fmtINR(v, 2) },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function RangeBar({ low, high, current, isUp }: { low: number; high: number; current: number; isUp: boolean }) {
  if (!low || !high || low >= high) return null
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100))
  const color = isUp ? 'var(--up)' : 'var(--down)'
  return (
    <div style={{ margin: '10px 0 8px' }}>
      <div style={{ position: 'relative', height: 3, background: 'var(--border)', borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: '100%', background: color, borderRadius: 2, opacity: 0.6 }} />
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          width: 9, height: 9, borderRadius: '50%', background: color, top: -3, border: '2px solid var(--surface)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
        <span>L {fmtINR(low)}</span>
        <span>H {fmtINR(high)}</span>
      </div>
    </div>
  )
}

function PriceCard({
  cfg, data, flashing,
}: {
  cfg: typeof CARDS[0]
  data: MCXData
  flashing: boolean
}) {
  const isUp    = data.mcxChangePct >= 0
  const hasKite = data.mcxHigh > 0
  const color   = isUp ? 'var(--up)' : 'var(--down)'
  const bg      = isUp ? 'var(--up-bg)' : 'var(--down-bg)'

  return (
    <div style={{
      background: flashing ? (isUp ? '#f0fdf4' : '#fff1f0') : 'var(--surface)',
      border: `1px solid ${flashing ? color : 'var(--border)'}`,
      borderRadius: 10,
      padding: '14px 16px',
      transition: 'background 0.5s ease, border-color 0.5s ease',
      cursor: 'default',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          {cfg.label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: bg, color }}>
          {isUp ? '▲' : '▼'} {fmtPct(data.mcxChangePct)}
        </span>
      </div>

      {/* Price */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, marginBottom: 2 }}>
        {data.mcx > 0 ? cfg.fmtP(data.mcx) : '—'}
      </div>
      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginBottom: hasKite ? 10 : 0 }}>
        {data.mcxChange !== 0 && (
          <span style={{ color, marginRight: 4 }}>
            {data.mcxChange > 0 ? '+' : ''}{fmtINR(Math.abs(data.mcxChange))}
          </span>
        )}
        {cfg.unit}
      </div>

      {/* OHLC — only when Kite is live */}
      {hasKite && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', marginTop: 8 }}>
            {[
              { l: 'O', v: data.mcxOpen },
              { l: 'H', v: data.mcxHigh },
              { l: 'L', v: data.mcxLow },
              { l: 'C', v: data.mcxPrevClose },
            ].map(({ l, v }) => (
              <div key={l} style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-4)', letterSpacing: '0.3px', minWidth: 10 }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-2)' }}>{cfg.fmtP(v)}</span>
              </div>
            ))}
          </div>

          <RangeBar low={data.mcxLow} high={data.mcxHigh} current={data.mcx} isUp={isUp} />

          {/* Volume + OI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
            <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{fmtVol(data.mcxVolume)}</div>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase', marginBottom: 2 }}>Open Int.</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{fmtVol(data.mcxOI)}</div>
            </div>
          </div>

          {/* Contract info */}
          {data.mcxSymbol && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.3px' }}>
                {data.mcxSymbol}
              </span>
              {data.mcxExpiry && (
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px', borderRadius: 3,
                  background: 'var(--gold-pale)', color: 'var(--gold-dark)',
                }}>
                  {daysToExpiry(data.mcxExpiry)} · {shortExpiry(data.mcxExpiry)}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Main MarketsClient ────────────────────────────────────────────────────────

export default function MarketsClient({ initialPrices }: { initialPrices: PriceData | null }) {
  const [prices, setPrices]       = useState<PriceData | null>(initialPrices)
  const [lastAt, setLastAt]       = useState<Date>(new Date())
  const [secsAgo, setSecsAgo]     = useState(0)
  const [flashing, setFlashing]   = useState(false)
  const [marketOpen, setMarketOpen] = useState(isMCXOpen())
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/prices', { cache: 'no-store' })
      if (!res.ok) return
      const data: PriceData = await res.json()
      setPrices(data)
      setLastAt(new Date())
      setSecsAgo(0)
      setMarketOpen(isMCXOpen())
      setFlashing(true)
      setTimeout(() => setFlashing(false), 600)
    } catch { /* keep stale data */ }
  }, [])

  useEffect(() => {
    function schedule() {
      const delay = isMCXOpen() ? 30_000 : 300_000
      timerRef.current = setTimeout(async () => { await refresh(); schedule() }, delay)
    }
    schedule()
    return () => clearTimeout(timerRef.current)
  }, [refresh])

  // Live "Updated Xs ago" counter
  useEffect(() => {
    const id = setInterval(() => setSecsAgo(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const p = prices

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
            Markets
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            MCX live quotes · COMEX · NYMEX reference prices
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
            background: marketOpen ? 'var(--up-bg)' : 'var(--surface-3)',
            color: marketOpen ? 'var(--up)' : 'var(--ink-3)',
            border: `1px solid ${marketOpen ? 'var(--up)' : 'var(--border)'}`,
          }}>
            {marketOpen ? '● MCX Open' : '○ MCX Closed'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>
            Updated {secsAgo}s ago
          </span>
        </div>
      </div>

      {/* ── Price cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 28 }}>
        {CARDS.map(cfg => {
          const data = p?.[cfg.key as keyof PriceData] as MCXData | undefined
          if (!data) return (
            <div key={cfg.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', height: 80 }} />
          )
          return <PriceCard key={cfg.key} cfg={cfg} data={data} flashing={flashing} />
        })}

        {/* USD/INR card — special, not MCXData shape */}
        <div style={{
          background: flashing ? '#f0f9ff' : 'var(--surface)',
          border: `1px solid ${flashing ? '#0ea5e9' : 'var(--border)'}`,
          borderRadius: 10, padding: '14px 16px',
          transition: 'background 0.5s ease, border-color 0.5s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              USD / INR
            </span>
            {p && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                background: p.usdinrChangePct >= 0 ? 'var(--up-bg)' : 'var(--down-bg)',
                color: p.usdinrChangePct >= 0 ? 'var(--up)' : 'var(--down)',
              }}>
                {p.usdinrChangePct >= 0 ? '▲' : '▼'} {fmtPct(p.usdinrChangePct)}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--ink)', lineHeight: 1, marginBottom: 2 }}>
            {p ? fmtINR(p.usdinr, 2) : '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>spot rate</div>
        </div>
      </div>

      {/* ── MCX + Global two-column cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* MCX column */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>MCX</span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: '#FFF3E0', color: '#B45309' }}>India</span>
            {p?.source && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--up)' }}>● {p.source}</span>
            )}
          </div>
          {p && ([
            { label: 'Gold',    d: p.gold,   unit: '/10g',   fmt: (v: number) => fmtINR(v) },
            { label: 'Silver',  d: p.silver, unit: '/kg',    fmt: (v: number) => fmtINR(v) },
            { label: 'Crude',   d: p.crude,  unit: '/bbl',   fmt: (v: number) => fmtINR(v) },
            { label: 'Copper',  d: p.copper, unit: '/kg',    fmt: (v: number) => fmtINR(v, 2) },
            { label: 'Nat Gas', d: p.natgas, unit: '/mmBtu', fmt: (v: number) => fmtINR(v, 2) },
          ] as { label: string; d: MCXData | undefined; unit: string; fmt: (v: number) => string }[]).map(({ label, d, unit, fmt }) => {
            if (!d) return null
            const isUp    = d.mcxChangePct >= 0
            const hasKite = d.mcxHigh > 0
            const color   = isUp ? 'var(--up)' : 'var(--down)'
            return (
              <div key={label} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: isUp ? 'var(--up-bg)' : 'var(--down-bg)', color }}>
                    {isUp ? '▲' : '▼'} {fmtPct(d.mcxChangePct)}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                  {d.mcx > 0 ? fmt(d.mcx) : '—'}
                  <span style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 400, marginLeft: 4 }}>{unit}</span>
                </div>
                {hasKite && (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      {([['O', d.mcxOpen], ['H', d.mcxHigh], ['L', d.mcxLow], ['C', d.mcxPrevClose]] as [string, number][]).map(([l, v]) => (
                        <div key={l} style={{ display: 'flex', gap: 3, alignItems: 'baseline' }}>
                          <span style={{ fontSize: 9, color: 'var(--ink-4)', fontWeight: 600 }}>{l}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-2)' }}>{fmt(v)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                        Vol <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{fmtVol(d.mcxVolume)}</span>
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>
                        OI <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}>{fmtVol(d.mcxOI)}</span>
                      </span>
                      {d.mcxExpiry && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--gold-dark)', background: 'var(--gold-pale)', padding: '1px 5px', borderRadius: 3 }}>
                          {shortExpiry(d.mcxExpiry)} · {daysToExpiry(d.mcxExpiry)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Global column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Global Reference card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Global Reference</span>
            </div>
            {p && ([
              { name: 'COMEX Gold',   exch: 'COMEX', price: p.comexGold,   pct: p.goldComexPct,   fmt: (v: number) => fmtUSD(v, 0) },
              { name: 'COMEX Silver', exch: 'COMEX', price: p.comexSilver, pct: p.silverComexPct, fmt: (v: number) => fmtUSD(v, 3) },
              { name: 'WTI Crude',    exch: 'NYMEX', price: p.wti,         pct: p.crudePct,       fmt: fmtUSD },
              { name: 'Brent Crude',  exch: 'NYMEX', price: p.brent,       pct: p.brentPct,       fmt: fmtUSD },
              { name: 'Henry Hub',    exch: 'NYMEX', price: p.henryHub,    pct: p.gasPct,         fmt: fmtUSD },
            ] as { name: string; exch: string; price: number | undefined; pct: number | undefined; fmt: (v: number) => string }[]).map(({ name, exch, price, pct, fmt }) => {
              const isUp = (pct ?? 0) >= 0
              const EXCH_STYLE: Record<string, { bg: string; color: string }> = {
                COMEX: { bg: '#EEF2FF', color: '#3730A3' },
                NYMEX: { bg: '#F5F3FF', color: '#6D28D9' },
              }
              const exStyle = EXCH_STYLE[exch] ?? { bg: 'var(--surface-2)', color: 'var(--ink-3)' }
              return (
                <div key={name} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: exStyle.bg, color: exStyle.color, flexShrink: 0 }}>{exch}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(price ?? 0) > 0 && (
                      <span style={{ fontSize: 10, color: isUp ? 'var(--up)' : 'var(--down)' }}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct ?? 0).toFixed(2)}%
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: (price ?? 0) > 0 ? 'var(--ink)' : 'var(--ink-4)' }}>
                      {(price ?? 0) > 0 ? fmt(price ?? 0) : '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Key Rates card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Key Rates</span>
            </div>
            {p && ([
              { name: 'USD / INR',     value: fmtINR(p.usdinr, 2), pct: p.usdinrChangePct as number | null },
              { name: 'RBI Repo Rate', value: '5.25%',              pct: null as number | null },
            ]).map(({ name, value, pct }) => {
              const isUp = (pct ?? 0) >= 0
              return (
                <div key={name} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pct !== null && (
                      <span style={{ fontSize: 10, color: isUp ? 'var(--up)' : 'var(--down)' }}>
                        {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Data note */}
          <div style={{ fontSize: 10, color: 'var(--ink-4)', lineHeight: 1.7, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
            MCX prices: live during market hours, refreshed every 30s.<br />
            Global reference rates: 15-min delayed.<br />
            MCX hours: 9 AM – 11:30 PM IST.
          </div>
        </div>
      </div>
    </div>
  )
}

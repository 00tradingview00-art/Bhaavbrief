'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [breakpoint])
  return isMobile
}

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type QuoteTier = 'LIVE' | 'STALE' | 'JUNK'
interface OptionSide {
  symbol: string|null; ltp: number; absChng: number; oi: number
  oiChange: number; volume: number; iv: number|null
  bid: number|null; ask: number|null; tier: QuoteTier
  delta: number|null; gamma: number|null; theta: number|null; vega: number|null
}
interface ChainRow {
  strike: number; isATM: boolean; isITM_CE: boolean; isITM_PE: boolean
  CE: OptionSide; PE: OptionSide
}
interface AAVResult {
  '5d': number|null; '10d': number|null; '20d': number|null; '40d': number|null; '60d': number|null
}
interface OptionsData {
  instrument: string; expiry: string; expiries: string[]
  futurePrice: number; maxPain: number; pcr: number
  ivix: number|null; aav: AAVResult; volPremium: number|null
  marketOpen: boolean; chain: ChainRow[]; lastUpdated: string
  riskFreeRate: number; riskFreeRateAsOf: string
}

// ── Formatters ────────────────────────────────────────────────────────────────

const numStyle: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums' }

const fmtINR = (n: number|null|undefined, dec = 0) =>
  n == null || isNaN(n) ? '·' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtN = (n: number|null|undefined, dec = 2) =>
  n == null || isNaN(n) ? '·' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtOI = (n: number) =>
  !n ? '·' : n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)

const fmtChng = (n: number) =>
  n > 0 ? `+${fmtN(n)}` : n < 0 ? fmtN(n) : '·'

const fmtOIChng = (n: number) =>
  n > 0 ? `+${fmtOI(n)}` : n < 0 ? `-${fmtOI(Math.abs(n))}` : '·'

// Best bid/ask in one compact cell — illiquid far strikes commonly have no
// depth at all, which is expected (thin MCX options liquidity away from ATM),
// not a data bug.
const fmtBidAsk = (bid: number|null, ask: number|null) =>
  bid == null && ask == null ? '·' : `${bid != null ? fmtN(bid) : '·'} / ${ask != null ? fmtN(ask) : '·'}`

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  ink:     'var(--ink)',
  ink2:    'var(--ink-2)',
  ink3:    'var(--ink-3)',
  ink4:    'var(--ink-4)',
  surf:    'var(--surface)',
  surf2:   'var(--surface-2)',
  surf3:   'var(--surface-3)',
  bdr:     'var(--border)',
  bdr2:    'var(--border-2)',
  gold:    'var(--gold)',
  goldPl:  'var(--gold-pale)',
  up:      'var(--up)',
  upBg:    'var(--up-bg)',
  dn:      'var(--down)',
  dnBg:    'var(--down-bg)',
  sans:    'var(--font-sans)',
}

// ── Shared cell padding ───────────────────────────────────────────────────────

const PAD: React.CSSProperties = { padding: '8px 10px' }
const ITM_BG = C.goldPl

// ── Column header ─────────────────────────────────────────────────────────────

function TH({ children, align = 'right', extra }: { children: React.ReactNode; align?: 'left'|'right'|'center'; extra?: React.CSSProperties }) {
  return (
    <th style={{
      ...PAD, textAlign: align, fontSize: 11, fontWeight: 500, color: C.ink3,
      fontFamily: C.sans, letterSpacing: '0.02em', whiteSpace: 'nowrap',
      background: C.surf2, borderBottom: `1px solid ${C.bdr}`, ...extra,
    }}>{children}</th>
  )
}

// ── Data cells ────────────────────────────────────────────────────────────────

function Td({ children, align = 'right', bg, bold, color, small }: {
  children: React.ReactNode; align?: 'left'|'right'|'center'
  bg?: string; bold?: boolean; color?: string; small?: boolean
}) {
  return (
    <td style={{
      ...PAD, textAlign: align, background: bg ?? 'transparent',
      ...numStyle, fontSize: small ? 12 : 13,
      fontWeight: bold ? 600 : 400,
      color: color ?? C.ink2,
    }}>{children}</td>
  )
}

// ── OI bar ────────────────────────────────────────────────────────────────────

function OIBar({ oi, max, side }: { oi: number; max: number; side: 'CE'|'PE' }) {
  const pct = max > 0 ? Math.min((oi / max) * 100, 100) : 0
  return (
    <div style={{ height: 2, background: C.bdr, borderRadius: 1, marginTop: 3, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, height: '100%', width: `${pct}%`, background: side === 'CE' ? C.dn : C.up, borderRadius: 1, [side === 'CE' ? 'right' : 'left']: 0 }} />
    </div>
  )
}

// ── OI concentration map ──────────────────────────────────────────────────────

function OIConcentrationChart({ chain }: { chain: ChainRow[] }) {
  const top = [...chain]
    .sort((a, b) => (b.CE.oi + b.PE.oi) - (a.CE.oi + a.PE.oi))
    .slice(0, 6)
    .sort((a, b) => a.strike - b.strike)
  const max = Math.max(...top.flatMap(r => [r.CE.oi, r.PE.oi]), 1)

  if (!top.length) return null

  return (
    <div style={{ padding: '8px 14px', borderBottom: `1px solid ${C.bdr}`, background: C.surf }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink4, fontFamily: C.sans }}>
          OI Concentration
        </span>
        <div style={{ display: 'flex', gap: 10, fontSize: 9, color: C.ink3, fontFamily: C.sans }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: C.dn, borderRadius: 1 }} />Calls
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: C.up, borderRadius: 1 }} />Puts
          </span>
        </div>
      </div>
      {top.map(row => {
        const cePct = max > 0 ? (row.CE.oi / max) * 100 : 0
        const pePct = max > 0 ? (row.PE.oi / max) * 100 : 0
        return (
          <div
            key={row.strike}
            title={`${row.strike.toLocaleString('en-IN')} — CE OI ${row.CE.oi.toLocaleString('en-IN')} · PE OI ${row.PE.oi.toLocaleString('en-IN')}`}
            style={{ display: 'grid', gridTemplateColumns: '1fr 62px 1fr', alignItems: 'center', gap: 4, padding: '1px 0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: C.ink3, ...numStyle, flexShrink: 0 }}>{fmtOI(row.CE.oi)}</span>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}>
                <div style={{ height: 6, width: `${cePct}%`, background: C.dn, borderRadius: '2px 0 0 2px', opacity: row.isATM ? 1 : 0.7 }} />
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: row.isATM ? 700 : 600, color: row.isATM ? C.gold : C.ink2, ...numStyle }}>
              {row.strike.toLocaleString('en-IN')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
                <div style={{ height: 6, width: `${pePct}%`, background: C.up, borderRadius: '0 2px 2px 0', opacity: row.isATM ? 1 : 0.7 }} />
              </div>
              <span style={{ fontSize: 9, color: C.ink3, ...numStyle, flexShrink: 0 }}>{fmtOI(row.PE.oi)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Volatility — today (chart returns once ATM IV history has enough days) ────

const IV_LINE = '#6941c6' // matches the iVIX pill's color — same metric, same hue

function IVHistoryChart({ chain }: { chain: ChainRow[] }) {
  // Today's live ATM IV — average of the ATM row's Call/Put IV from the current chain.
  const atmRows = chain.filter(r => r.isATM)
  const liveIVs = atmRows.flatMap(r => [r.CE.iv, r.PE.iv]).filter((v): v is number => v != null && v > 0)
  const liveIV  = liveIVs.length ? parseFloat((liveIVs.reduce((s, v) => s + v, 0) / liveIVs.length).toFixed(2)) : null

  return (
    <div style={{ padding: '16px 14px', borderBottom: `1px solid ${C.bdr}`, background: C.surf }}>
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.ink4, fontFamily: C.sans, marginBottom: 6 }}>
        Volatility — today
      </div>
      {liveIV != null ? (
        <>
          <div style={{ fontSize: 28, fontWeight: 600, color: IV_LINE, fontFamily: C.sans, ...numStyle }}>{liveIV}%</div>
          <div style={{ fontSize: 11, color: C.ink3, fontFamily: C.sans, marginTop: 4 }}>ATM IV — trend chart returns once enough daily history has built up.</div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: C.ink4, fontFamily: C.sans }}>No volatility data available right now.</div>
      )}
    </div>
  )
}

// ── Info tooltip ──────────────────────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = 200
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - width - 8) })
  }

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}
      onMouseEnter={() => { place(); setOpen(true) }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={e => { e.stopPropagation(); place(); setOpen(o => !o) }}
        aria-label="What is this?"
        style={{
          width: 13, height: 13, borderRadius: '50%', border: `1px solid ${C.ink4}`,
          background: 'transparent', color: C.ink4, fontSize: 9, fontWeight: 700,
          lineHeight: '11px', padding: 0, cursor: 'pointer', fontFamily: C.sans,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          textTransform: 'none', letterSpacing: 'normal', flexShrink: 0,
        }}
      >i</button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999,
          width: 200, padding: '8px 10px', borderRadius: 6, background: C.ink,
          color: '#fff', fontSize: 11, fontWeight: 400, lineHeight: 1.4,
          fontFamily: C.sans, textTransform: 'none', letterSpacing: 'normal',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  )
}

// ── Metric pill in analytics bar ──────────────────────────────────────────────

function Pill({ label, value, color, onClick, expand, info }: {
  label: string; value: React.ReactNode; color?: string; onClick?: () => void; expand?: boolean; info?: string
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-expanded={onClick && expand != null ? expand : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      style={{
        cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column',
        gap: 1, padding: '6px 14px', borderRight: `1px solid ${C.bdr}`, flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.ink4, fontFamily: C.sans, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        {label}{expand != null && <span style={{ marginLeft: 4 }}>{expand ? '▲' : '▼'}</span>}
        {info && <InfoTip text={info} />}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color ?? C.ink, fontFamily: C.sans, ...numStyle, lineHeight: 1.2 }}>{value}</span>
    </div>
  )
}

function PCRPill({ pcr, info }: { pcr: number; info?: string }) {
  // Labels describe the positioning data itself (which side has more open
  // interest), not a translated market call — "conventionally read as
  // bullish/bearish" is explained in the info tooltip instead, so the at-a-
  // glance label never reads as a directional signal.
  const label = pcr > 1.2 ? 'Put-heavy' : pcr < 0.8 ? 'Call-heavy' : 'Balanced'
  const color = pcr > 1.2 ? C.up : pcr < 0.8 ? C.dn : 'var(--saffron)'
  const bg    = pcr > 1.2 ? C.upBg : pcr < 0.8 ? C.dnBg : C.goldPl
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 14px', borderRight: `1px solid ${C.bdr}`, flexShrink: 0 }}>
      <span style={{ fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.ink4, fontFamily: C.sans, fontWeight: 700, display: 'flex', alignItems: 'center' }}>
        PCR{info && <InfoTip text={info} />}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: C.sans, ...numStyle }}>{pcr}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, padding: '1px 6px', borderRadius: 3, fontFamily: C.sans }}>{label}</span>
      </span>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OptionChain({ isPro, preview = false, initialData = null }: { isPro: boolean; preview?: boolean; initialData?: OptionsData | null }) {
  const [instrument, setInstrument] = useState(initialData?.instrument ?? 'GOLD')
  const [expiry, setExpiry]         = useState<string|null>(null)
  const [data, setData]             = useState<OptionsData|null>(initialData)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [showGreeks, setShowGreeks] = useState(false)
  const [showAAV, setShowAAV]       = useState(false)
  const [mapView, setMapView]       = useState<'oi'|'iv'|null>('oi')
  // D-06: strikes with zero liquidity / no-arbitrage violations are tiered
  // JUNK server-side (lib/options.ts) and hidden by default here — a row is
  // hidden only when BOTH sides are JUNK, so a genuinely liquid CE next to a
  // dead PE at the same strike still shows.
  const [showAllStrikes, setShowAllStrikes] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date|null>(initialData ? new Date(initialData.lastUpdated) : null)
  const [page, setPage]             = useState<'lower'|'main'|'upper'>('main')
  const tableBodyRef  = useRef<HTMLDivElement>(null)
  const atmRowRef     = useRef<HTMLTableRowElement>(null)
  const isMobile      = useIsMobile()

  const fetchData = useCallback(async (): Promise<OptionsData|null> => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ instrument })
      if (expiry) params.set('expiry', expiry)
      const res = await fetch(`/api/options?${params}`)
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error)
      const json: OptionsData = await res.json()
      setData(json)
      setLastRefresh(new Date())
      return json
    } catch (e) { setError((e as Error).message); return null }
    finally { setLoading(false) }
  }, [instrument, expiry])

  // Poll every 3 min while MCX is open; back off to 20 min once it's closed —
  // no point re-triggering the full fetch overnight/Sundays when nothing moves.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function scheduleNext() {
      const result = await fetchData()
      if (cancelled) return
      const delay = result?.marketOpen === false ? 20 * 60 * 1000 : 3 * 60 * 1000
      timer = setTimeout(scheduleNext, delay)
    }

    scheduleNext()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [fetchData])
  useEffect(() => { setExpiry(null); setPage('main') }, [instrument])
  useEffect(() => { setPage('main') }, [expiry])

  // Scroll ATM row to centre of the table container after data loads
  useEffect(() => {
    if (preview || !data || !atmRowRef.current || !tableBodyRef.current) return
    const container = tableBodyRef.current
    const row = atmRowRef.current
    const offset = row.offsetTop - container.clientHeight / 2 + row.clientHeight / 2
    container.scrollTo({ top: offset, behavior: 'smooth' })
  }, [data, page, preview])

  if (!isPro) {
    return (
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.bdr}` }}>
        <div style={{ filter: 'blur(5px)', opacity: 0.4, pointerEvents: 'none', maxHeight: 180, overflow: 'hidden', background: C.surf, padding: 24 }}>
          {[116500, 117000, 117500, 118000].map(s => (
            <div key={s} style={{ display: 'flex', gap: 24, padding: '5px 0', borderBottom: `1px solid ${C.bdr}`, fontFamily: C.sans, fontSize: 12, ...numStyle }}>
              <span style={{ color: C.dn, width: 60, textAlign: 'right' }}>28,000</span>
              <span style={{ color: C.dn, width: 50, textAlign: 'right' }}>-500</span>
              <span style={{ color: C.ink3, width: 40, textAlign: 'right' }}>24%</span>
              <span style={{ color: C.ink, fontWeight: 700, width: 80, textAlign: 'center' }}>{s.toLocaleString('en-IN')}</span>
              <span style={{ color: C.up, width: 60 }}>1,200</span>
              <span style={{ color: C.up, width: 50 }}>+300</span>
              <span style={{ color: C.ink3, width: 40 }}>22%</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.88)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: C.sans, fontSize: 16, fontWeight: 600, color: C.ink, marginBottom: 6 }}>BhaavBrief Pro</div>
            <div style={{ fontFamily: C.sans, fontSize: 13, color: C.ink3, marginBottom: 20 }}>Live MCX option chain — Greeks, iVIX, Max Pain, PCR</div>
            <a href="/pro" style={{ display: 'inline-block', background: C.gold, color: '#fff', fontFamily: C.sans, fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 5, textDecoration: 'none' }}>Upgrade to Pro →</a>
          </div>
        </div>
      </div>
    )
  }

  // ── Pagination: ±10% of futures price ────────────────────────────────────
  const lo = data ? data.futurePrice * 0.90 : 0
  const hi = data ? data.futurePrice * 1.10 : Infinity
  const lowerPage = data?.chain.filter(r => r.strike < lo)  ?? []
  const mainPage  = data?.chain.filter(r => r.strike >= lo && r.strike <= hi) ?? []
  const upperPage = data?.chain.filter(r => r.strike > hi)  ?? []
  let visibleChain = page === 'lower' ? lowerPage : page === 'upper' ? upperPage : mainPage

  // Preview mode: collapse to the 5 strikes nearest ATM, no pagination
  if (preview) {
    const atmIdx = mainPage.findIndex(r => r.isATM)
    const centre = atmIdx >= 0 ? atmIdx : Math.floor(mainPage.length / 2)
    const start  = Math.max(0, Math.min(centre - 2, mainPage.length - 5))
    visibleChain = mainPage.slice(start, start + 5)
  }

  const junkHiddenCount = visibleChain.filter(r => r.CE.tier === 'JUNK' && r.PE.tier === 'JUNK').length
  if (!showAllStrikes) {
    visibleChain = visibleChain.filter(r => !(r.CE.tier === 'JUNK' && r.PE.tier === 'JUNK'))
  }

  const maxCEOI = visibleChain.length ? Math.max(...visibleChain.map(r => r.CE.oi), 1) : 1
  const maxPEOI = visibleChain.length ? Math.max(...visibleChain.map(r => r.PE.oi), 1) : 1
  const vpColor = data?.volPremium == null ? C.ink3 : data.volPremium > 2 ? 'var(--saffron)' : data.volPremium < -2 ? C.up : C.ink3
  const vpStr   = data?.volPremium != null ? (data.volPremium > 0 ? '+' : '') + data.volPremium : '·'

  // Default columns: OI | Chng OI | Vol | Bid/Ask | LTP | Chng | IV%  (7 per side)
  // Greeks adds: Delta | Gamma | Theta | Vega                       (4 more per side)
  const ceCols = showGreeks ? 11 : 7
  const peCols = showGreeks ? 11 : 7

  return (
    <div style={{ background: C.surf, borderRadius: 8, border: `1px solid ${C.bdr}`, overflow: 'hidden', fontFamily: C.sans, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

      {/* ── Controls ── */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: C.surf2 }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {INSTRUMENTS.map(({ key, label }) => (
            <button key={key} onClick={() => setInstrument(key)} style={{
              padding: isMobile ? '14px 16px' : '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 5, cursor: 'pointer', fontFamily: C.sans,
              border: instrument === key ? `1px solid ${C.gold}` : `1px solid ${C.bdr}`,
              background: instrument === key ? C.gold : 'transparent',
              color: instrument === key ? '#fff' : C.ink3,
            }}>{label}</button>
          ))}
        </div>
        {data?.expiries && (
          <select value={expiry || data.expiry} onChange={e => setExpiry(e.target.value)}
            style={{ background: C.surf, color: C.ink2, border: `1px solid ${C.bdr}`, borderRadius: 5, padding: isMobile ? '13px 10px' : '5px 8px', fontSize: 12, fontFamily: C.sans }}>
            {data.expiries.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        {!preview && !isMobile && (
          // Column add-on toggle — deliberately styled unlike the OI Map/ATM IV pair
          // below (dashed border, +/− prefix, no arrow) since it's an independent
          // "add columns to this table" switch, not a mutually-exclusive view.
          <button
            onClick={() => setShowGreeks(g => !g)}
            aria-pressed={showGreeks}
            style={{
              padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer', fontFamily: C.sans,
              border: `1px dashed ${showGreeks ? C.gold : C.bdr}`, background: showGreeks ? C.goldPl : 'transparent',
              color: showGreeks ? C.gold : C.ink3,
            }}
          >
            {showGreeks ? '− Greeks columns' : '+ Greeks columns'}
          </button>
        )}
        {!preview && junkHiddenCount > 0 && (
          <button
            onClick={() => setShowAllStrikes(v => !v)}
            aria-pressed={showAllStrikes}
            title="Strikes with zero liquidity or a price outside no-arbitrage bounds are hidden by default"
            style={{
              padding: isMobile ? '13px 12px' : '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer', fontFamily: C.sans,
              border: `1px dashed ${showAllStrikes ? C.gold : C.bdr}`, background: showAllStrikes ? C.goldPl : 'transparent',
              color: showAllStrikes ? C.gold : C.ink3,
            }}
          >
            {showAllStrikes ? `Hide ${junkHiddenCount} illiquid strikes` : `Show ${junkHiddenCount} hidden strikes`}
          </button>
        )}
        {/* OI Map / Volatility — a real segmented control: one border around both,
            a shared divider, no gap between them — since only one can be active. */}
        <div style={{ display: 'flex', border: `1px solid ${C.bdr}`, borderRadius: 5, overflow: 'hidden' }} role="tablist" aria-label="Chart view">
          <button
            onClick={() => setMapView(v => v === 'oi' ? null : 'oi')}
            role="tab"
            aria-selected={mapView === 'oi'}
            style={{
              padding: isMobile ? '14px 16px' : '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: C.sans,
              border: 'none', borderRight: `1px solid ${C.bdr}`,
              background: mapView === 'oi' ? C.goldPl : 'transparent',
              color: mapView === 'oi' ? C.gold : C.ink3,
            }}
          >
            OI Map
          </button>
          <button
            onClick={() => setMapView(v => v === 'iv' ? null : 'iv')}
            role="tab"
            aria-selected={mapView === 'iv'}
            style={{
              padding: isMobile ? '14px 16px' : '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: C.sans,
              border: 'none',
              background: mapView === 'iv' ? C.goldPl : 'transparent',
              color: mapView === 'iv' ? C.gold : C.ink3,
            }}
          >
            Volatility
          </button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && <span style={{ fontSize: 11, color: C.ink4, ...numStyle }}>{lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>}
          <button onClick={fetchData} disabled={loading} style={{ background: 'none', border: `1px solid ${C.bdr}`, borderRadius: 4, color: C.ink3, fontSize: 11, cursor: 'pointer', padding: isMobile ? '15px 14px' : '3px 8px', fontFamily: C.sans }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {!preview && showAllStrikes && junkHiddenCount > 0 && (
        <div style={{
          padding: '8px 14px', fontSize: 12, fontFamily: C.sans, color: '#8A5A00',
          background: '#FFF6E0', borderBottom: `1px solid ${C.bdr}`,
        }}>
          Showing {junkHiddenCount} strike{junkHiddenCount === 1 ? '' : 's'} with no live market — zero traded volume/open interest, or a quoted price outside the no-arbitrage bound for this strike. IV and Greeks are not computed for these; treat any shown price as indicative, not tradeable.
        </div>
      )}

      {/* ── Analytics strip ── */}
      {/* Reverted the Part 12 §12.8 sticky treatment: position:sticky here
          introduced a real, confirmed rendering bug — the strip rendered
          ~52px lower than its natural static position even while not
          actively "stuck" (reproduced live: switching a tab that changes
          the content below it left the strip mispositioned, overlapping
          IVHistoryChart's ATM IV text). Not worth the regression risk on a
          live options page for a nice-to-have; back to normal static flow. */}
      {data && (
        <div style={{
          borderBottom: `1px solid ${C.bdr}`, display: 'flex', overflowX: 'auto', background: C.surf, scrollbarWidth: 'none',
        }}>
          <Pill label="Underlying" value={fmtINR(data.futurePrice)}
            info="The current MCX futures price for the nearest expiry — used as the reference price for ATM and the Greeks." />
          <Pill label="Max Pain"   value={fmtINR(data.maxPain)}    color={C.gold}
            info="The strike where option writers (sellers) owe the least at expiry — often acts as a magnet for price as expiry nears." />
          <PCRPill pcr={data.pcr}
            info="Put-Call Ratio — total Put OI divided by total Call OI. Above 1.2 (more puts open) is conventionally read as bullish positioning; below 0.8 (more calls open) as bearish." />
          {data.ivix    != null && <Pill label="iVIX"       value={data.ivix}       color="#6941c6"
            info="Implied volatility index — the market's expected annualized volatility, derived from at-the-money option prices." />}
          {data.aav['20d'] != null && <Pill label="AAV 20d" value={data.aav['20d']} color="#0369a1" onClick={() => setShowAAV(v => !v)} expand={showAAV}
            info="Annualized Actual Volatility — realized historical volatility computed from the last 20 trading days of closing prices." />}
          {data.volPremium != null && <Pill label="Vol Premium" value={vpStr}        color={vpColor}
            info="iVIX minus AAV 20d. Positive means options are pricing in more movement than has actually occurred recently." />}
          <div style={{ marginLeft: 'auto', padding: '6px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.ink4, fontFamily: C.sans, fontWeight: 700 }}>Status</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: data.marketOpen ? C.up : C.ink4, ...numStyle }}>● {data.marketOpen ? 'Live' : 'Closed'}</span>
          </div>
        </div>
      )}

      {/* ── AAV breakdown ── */}
      {data && showAAV && (
        <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', flexWrap: 'wrap', gap: '4px 24px', alignItems: 'center', background: C.surf2 }}>
          <span style={{ fontSize: 10, color: C.ink4, fontFamily: C.sans, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Annualized Actual Volatility</span>
          {(['5d','10d','20d','40d','60d'] as const).map(w => (
            <span key={w} style={{ fontSize: 12, ...numStyle }}>
              <span style={{ color: C.ink4, fontSize: 10 }}>{w} </span>
              <span style={{ color: w === '20d' ? '#0369a1' : C.ink2, fontWeight: 600 }}>{data.aav[w] ?? '·'}</span>
            </span>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', color: C.dn, fontSize: 12, fontFamily: C.sans }}>{error}</div>}

      {/* ── OI concentration map / IV skew chart ── */}
      {data?.chain && mapView === 'oi' && <OIConcentrationChart chain={mainPage} />}
      {data?.chain && mapView === 'iv' && <IVHistoryChart chain={mainPage} />}

      {/* ── ITM note ── */}
      {data?.chain && (
        <div style={{ padding: '4px 14px', borderBottom: `1px solid ${C.bdr}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.ink4, fontFamily: C.sans, background: C.surf2 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: ITM_BG, border: `1px solid ${C.gold}`, borderRadius: 2, opacity: 0.7 }} />
          Highlighted rows are in-the-money · ATM = nearest to futures price · MAX PAIN = max option writer profit
        </div>
      )}

      {/* ── Table ── */}
      {/* Loading skeleton */}
      {loading && !data && (
        <div style={{ padding: '32px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {Array.from({ length: 13 }).map((_, j) => (
                <div key={j} style={{ flex: j === 6 ? '0 0 90px' : 1, height: 20, background: C.surf3, borderRadius: 3, opacity: 1 - i * 0.08 }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {data?.chain && (
        <div ref={tableBodyRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: preview ? 'none' : '72vh' }}>
          {/* Prev page nav */}
          {!preview && lowerPage.length > 0 && (
            <button
              onClick={() => setPage(p => p === 'lower' ? 'main' : 'lower')}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', textAlign: 'center',
                background: page === 'lower' ? C.surf3 : C.surf2,
                border: 'none', borderBottom: `1px solid ${C.bdr}`,
                color: page === 'lower' ? C.ink2 : C.ink3, fontFamily: C.sans,
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}>
              {page === 'lower'
                ? `↑ Back to ATM zone (±10%)`
                : `↑ ${lowerPage.length} lower strikes below ${fmtINR(lo)} — Deep ITM Calls / Far OTM Puts`}
            </button>
          )}

          {isMobile && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: C.sans }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ ...PAD, textAlign: 'right', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink, background: C.surf, borderBottom: `1px solid ${C.bdr}` }}>CE LTP</th>
                  <th style={{ ...PAD, textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink3, background: C.surf2, borderBottom: `1px solid ${C.bdr}` }}>Strike</th>
                  <th style={{ ...PAD, textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.ink, background: C.surf, borderBottom: `1px solid ${C.bdr}` }}>PE LTP</th>
                </tr>
              </thead>
              <tbody>
                {visibleChain.map(row => {
                  const { isATM, isITM_CE, isITM_PE } = row
                  const isMP  = row.strike === data.maxPain
                  const ceBg  = isITM_CE ? ITM_BG : 'transparent'
                  const peBg  = isITM_PE ? ITM_BG : 'transparent'
                  const sBg   = isATM ? C.goldPl : isMP ? '#f5f3ff' : (isITM_CE || isITM_PE) ? ITM_BG : 'transparent'
                  const sCol  = isATM ? C.gold : isMP ? '#6941c6' : C.ink
                  const atmBT = isATM ? `2px solid ${C.gold}` : undefined
                  const ceChngColor = row.CE.absChng > 0 ? C.up : row.CE.absChng < 0 ? C.dn : C.ink4
                  const peChngColor = row.PE.absChng > 0 ? C.up : row.PE.absChng < 0 ? C.dn : C.ink4

                  return (
                    <tr key={row.strike} ref={isATM ? atmRowRef : undefined} style={{ borderBottom: `1px solid ${C.bdr}`, borderTop: atmBT }}>
                      <td style={{ padding: '10px 8px', textAlign: 'right', background: ceBg }}>
                        <div style={{ ...numStyle, fontSize: 15, fontWeight: 600, color: row.CE.ltp ? C.ink : C.ink4 }}>{row.CE.ltp ? fmtN(row.CE.ltp) : '·'}</div>
                        <div style={{ ...numStyle, fontSize: 11, color: ceChngColor }}>{fmtChng(row.CE.absChng)}</div>
                        <div style={{ ...numStyle, fontSize: 9, color: C.ink4, marginTop: 1 }}>{fmtBidAsk(row.CE.bid, row.CE.ask)}</div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', background: sBg, borderLeft: `1px solid ${C.bdr2}`, borderRight: `1px solid ${C.bdr2}` }}>
                        <span style={{ ...numStyle, fontSize: 14, fontWeight: 700, color: sCol }}>{Number(row.strike).toLocaleString('en-IN')}</span>
                        {isATM && <div style={{ fontSize: 9, fontFamily: C.sans, fontWeight: 600, color: C.gold, letterSpacing: '0.06em', marginTop: 2 }}>ATM</div>}
                        {isMP && !isATM && <div style={{ fontSize: 9, fontFamily: C.sans, fontWeight: 600, color: '#6941c6', letterSpacing: '0.06em', marginTop: 2 }}>MAX PAIN</div>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'left', background: peBg }}>
                        <div style={{ ...numStyle, fontSize: 15, fontWeight: 600, color: row.PE.ltp ? C.ink : C.ink4 }}>{row.PE.ltp ? fmtN(row.PE.ltp) : '·'}</div>
                        <div style={{ ...numStyle, fontSize: 11, color: peChngColor }}>{fmtChng(row.PE.absChng)}</div>
                        <div style={{ ...numStyle, fontSize: 9, color: C.ink4, marginTop: 1 }}>{fmtBidAsk(row.PE.bid, row.PE.ask)}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!isMobile && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: C.sans }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              {/* Section headers */}
              <tr>
                <th colSpan={ceCols} style={{ ...PAD, textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink, background: C.surf, borderBottom: `1px solid ${C.bdr}`, borderRight: `2px solid ${C.bdr2}` }}>Calls (CE)</th>
                <th style={{ ...PAD, textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.ink3, background: C.surf2, borderBottom: `1px solid ${C.bdr}` }}>Strike</th>
                <th colSpan={peCols} style={{ ...PAD, textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink, background: C.surf, borderBottom: `1px solid ${C.bdr}`, borderLeft: `2px solid ${C.bdr2}` }}>Puts (PE)</th>
              </tr>
              {/* Column names */}
              <tr>
                {/* CE columns */}
                <TH align="right">OI</TH>
                <TH align="right">Chng OI</TH>
                <TH align="right">Vol</TH>
                <TH align="right">Bid/Ask</TH>
                <TH align="right">LTP</TH>
                <TH align="right">Chng</TH>
                <TH align="right" extra={{ borderRight: `2px solid ${C.bdr2}` }}>IV%</TH>
                {showGreeks && <>
                  <TH align="right">Delta</TH>
                  <TH align="right">Gamma</TH>
                  <TH align="right">Theta</TH>
                  <TH align="right" extra={{ borderRight: `2px solid ${C.bdr2}` }}>Vega</TH>
                </>}
                {/* Strike */}
                <TH align="center" extra={{ color: C.ink2, fontWeight: 600, minWidth: 90 }}>Price</TH>
                {/* PE columns */}
                {showGreeks && <>
                  <TH align="left" extra={{ borderLeft: `2px solid ${C.bdr2}` }}>Delta</TH>
                  <TH align="left">Gamma</TH>
                  <TH align="left">Theta</TH>
                  <TH align="left">Vega</TH>
                </>}
                <TH align="left" extra={{ borderLeft: `2px solid ${C.bdr2}` }}>IV%</TH>
                <TH align="left">Chng</TH>
                <TH align="left">LTP</TH>
                <TH align="left">Bid/Ask</TH>
                <TH align="left">Vol</TH>
                <TH align="left">Chng OI</TH>
                <TH align="left">OI</TH>
              </tr>
            </thead>
            <tbody>
              {visibleChain.map(row => {
                const { isATM, isITM_CE, isITM_PE } = row
                const isMP  = row.strike === data.maxPain
                const ceBg  = isITM_CE ? ITM_BG : 'transparent'
                const peBg  = isITM_PE ? ITM_BG : 'transparent'
                const sBg   = isATM ? C.goldPl : isMP ? '#f5f3ff' : (isITM_CE || isITM_PE) ? ITM_BG : 'transparent'
                const sCol  = isATM ? C.gold : isMP ? '#6941c6' : C.ink
                const atmBT = isATM ? `2px solid ${C.gold}` : undefined

                const ceChngColor = row.CE.absChng > 0 ? C.up : row.CE.absChng < 0 ? C.dn : C.ink4
                const peChngColor = row.PE.absChng > 0 ? C.up : row.PE.absChng < 0 ? C.dn : C.ink4
                const ceOIColor   = row.CE.oiChange > 0 ? C.up : row.CE.oiChange < 0 ? C.dn : C.ink4
                const peOIColor   = row.PE.oiChange > 0 ? C.up : row.PE.oiChange < 0 ? C.dn : C.ink4

                return (
                  <tr key={row.strike} ref={isATM ? atmRowRef : undefined} style={{ borderBottom: `1px solid ${C.bdr}`, borderTop: atmBT }}>
                    {/* ── CE side ── */}
                    {/* OI */}
                    <td style={{ ...PAD, textAlign: 'right', background: ceBg, minWidth: 56 }}>
                      <div style={{ ...numStyle, fontSize: 13, color: C.ink2 }}>{fmtOI(row.CE.oi)}</div>
                      <OIBar oi={row.CE.oi} max={maxCEOI} side="CE" />
                    </td>
                    {/* Chng OI */}
                    <Td align="right" bg={ceBg} color={ceOIColor} small>{fmtOIChng(row.CE.oiChange)}</Td>
                    {/* Vol */}
                    <Td align="right" bg={ceBg} color={C.ink3}>{fmtOI(row.CE.volume)}</Td>
                    {/* Bid/Ask */}
                    <Td align="right" bg={ceBg} color={C.ink3} small>{fmtBidAsk(row.CE.bid, row.CE.ask)}</Td>
                    {/* LTP */}
                    <Td align="right" bg={ceBg} bold color={row.CE.ltp ? C.ink : C.ink4}>{row.CE.ltp ? fmtN(row.CE.ltp) : '·'}</Td>
                    {/* Chng */}
                    <Td align="right" bg={ceBg} color={ceChngColor} small>{fmtChng(row.CE.absChng)}</Td>
                    {/* IV% */}
                    <td style={{ ...PAD, textAlign: 'right', background: ceBg, borderRight: `2px solid ${C.bdr2}`, ...numStyle, fontSize: 12, color: C.ink3 }}>
                      {row.CE.iv != null ? row.CE.iv + '%' : '·'}
                    </td>
                    {/* Greeks */}
                    {showGreeks && (
                      <>
                        <Td align="right" bg={ceBg} color={C.ink3} small>{row.CE.delta != null ? fmtN(row.CE.delta, 3) : '·'}</Td>
                        <Td align="right" bg={ceBg} color={C.ink3} small>{row.CE.gamma != null ? fmtN(row.CE.gamma, 6) : '·'}</Td>
                        <Td align="right" bg={ceBg} color={C.ink3} small>{row.CE.theta != null ? fmtN(row.CE.theta, 3) : '·'}</Td>
                        <td style={{ ...PAD, textAlign: 'right', background: ceBg, borderRight: `2px solid ${C.bdr2}`, ...numStyle, fontSize: 12, color: C.ink3 }}>
                          {row.CE.vega != null ? fmtN(row.CE.vega, 3) : '·'}
                        </td>
                      </>
                    )}

                    {/* ── Strike ── */}
                    <td style={{ ...PAD, textAlign: 'center', background: sBg, borderLeft: `2px solid ${C.bdr2}`, borderRight: `2px solid ${C.bdr2}` }}>
                      <span style={{ ...numStyle, fontSize: 15, fontWeight: 700, color: sCol }}>
                        {Number(row.strike).toLocaleString('en-IN')}
                      </span>
                      {isATM && <div style={{ fontSize: 10, fontFamily: C.sans, fontWeight: 600, color: C.gold, letterSpacing: '0.06em', marginTop: 2 }}>ATM</div>}
                      {isMP && !isATM && <div style={{ fontSize: 10, fontFamily: C.sans, fontWeight: 600, color: '#6941c6', letterSpacing: '0.06em', marginTop: 2 }}>MAX PAIN</div>}
                    </td>

                    {/* ── PE side ── */}
                    {/* Greeks */}
                    {showGreeks && (
                      <>
                        <td style={{ ...PAD, textAlign: 'left', background: peBg, borderLeft: `2px solid ${C.bdr2}`, ...numStyle, fontSize: 12, color: C.ink3 }}>
                          {row.PE.delta != null ? fmtN(row.PE.delta, 3) : '·'}
                        </td>
                        <Td align="left" bg={peBg} color={C.ink3} small>{row.PE.gamma != null ? fmtN(row.PE.gamma, 6) : '·'}</Td>
                        <Td align="left" bg={peBg} color={C.ink3} small>{row.PE.theta != null ? fmtN(row.PE.theta, 3) : '·'}</Td>
                        <Td align="left" bg={peBg} color={C.ink3} small>{row.PE.vega != null ? fmtN(row.PE.vega, 3) : '·'}</Td>
                      </>
                    )}
                    {/* IV% */}
                    <td style={{ ...PAD, textAlign: 'left', background: peBg, borderLeft: `2px solid ${C.bdr2}`, ...numStyle, fontSize: 12, color: C.ink3 }}>
                      {row.PE.iv != null ? row.PE.iv + '%' : '·'}
                    </td>
                    {/* Chng */}
                    <Td align="left" bg={peBg} color={peChngColor} small>{fmtChng(row.PE.absChng)}</Td>
                    {/* LTP */}
                    <Td align="left" bg={peBg} bold color={row.PE.ltp ? C.ink : C.ink4}>{row.PE.ltp ? fmtN(row.PE.ltp) : '·'}</Td>
                    {/* Bid/Ask */}
                    <Td align="left" bg={peBg} color={C.ink3} small>{fmtBidAsk(row.PE.bid, row.PE.ask)}</Td>
                    {/* Vol */}
                    <Td align="left" bg={peBg} color={C.ink3}>{fmtOI(row.PE.volume)}</Td>
                    {/* Chng OI */}
                    <Td align="left" bg={peBg} color={peOIColor} small>{fmtOIChng(row.PE.oiChange)}</Td>
                    {/* OI */}
                    <td style={{ ...PAD, textAlign: 'left', background: peBg, minWidth: 56 }}>
                      <div style={{ ...numStyle, fontSize: 13, color: C.ink2 }}>{fmtOI(row.PE.oi)}</div>
                      <OIBar oi={row.PE.oi} max={maxPEOI} side="PE" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          )}

          {/* Next page nav */}
          {!preview && upperPage.length > 0 && (
            <button
              onClick={() => setPage(p => p === 'upper' ? 'main' : 'upper')}
              style={{
                display: 'block', width: '100%', padding: '8px 14px', textAlign: 'center',
                background: page === 'upper' ? C.surf3 : C.surf2,
                border: 'none', borderTop: `1px solid ${C.bdr}`,
                color: page === 'upper' ? C.ink2 : C.ink3, fontFamily: C.sans,
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}>
              {page === 'upper'
                ? `↓ Back to ATM zone (±10%)`
                : `↓ ${upperPage.length} higher strikes above ${fmtINR(hi)} — Far OTM Calls / Deep ITM Puts`}
            </button>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      {preview ? (
        <a href="/options" style={{
          display: 'block', padding: '10px 14px', textAlign: 'center', textDecoration: 'none',
          borderTop: `1px solid ${C.bdr}`, background: C.surf2, color: C.gold,
          fontSize: 12, fontWeight: 600, fontFamily: C.sans,
        }}>
          View full option chain — Greeks, iVIX & Max Pain →
        </a>
      ) : (
        <div style={{ padding: '7px 14px', borderTop: `1px solid ${C.bdr}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.ink4, background: C.surf2, fontFamily: C.sans }}>
          <span>Black-76 · {data ? (data.riskFreeRate * 100).toFixed(1) : '6.5'}% risk-free rate (as of {data?.riskFreeRateAsOf ?? '—'}) · 30s cache</span>
          <span>Not investment advice</span>
        </div>
      )}
    </div>
  )
}

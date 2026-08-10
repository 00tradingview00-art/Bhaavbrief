'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Legend,
  AreaChart, Area,
} from 'recharts'
import {
  computePayoff, computeNetGreeks, computeBreakevens, computeMaxProfitLoss, computeNetCost,
  computeExpectedMoveCone, computeProbOfProfit,
  type Leg, type SavedStrategy, type PayoffPoint, type Action,
} from '@/lib/strategy'
import {
  computeIVRegime,
  type IVRegime, type TemplateId,
} from '@/lib/ivAnalysis'
import Link from 'next/link'
import { MCX_INSTRUMENTS } from '@/lib/options'
import type { EventMapEntry } from '@/lib/eventMapTypes'

// ── Types mirrored from getOptionsChain return shape ─────────────────────────

interface OptionSide {
  ltp:      number
  iv:       number | null  // percentage e.g. 24.5
  delta:    number | null
  gamma:    number | null
  theta:    number | null
  vega:     number | null
  oi:       number
  tier:     'LIVE' | 'STALE' | 'JUNK'
}

interface ChainRow {
  strike:   number
  isATM:    boolean
  isITM_CE: boolean
  isITM_PE: boolean
  CE: OptionSide
  PE: OptionSide
}

interface ChainData {
  futurePrice:  number
  expiry:       string
  expiries:     string[]
  riskFreeRate: number
  chain:        ChainRow[]
}

interface EdgeResolution {
  verdict:       'confirmed' | 'rejected' | 'unresolved'
  resolvedValue: number | null
  reason:        string | null
}

interface BriefEdge {
  edge:          string
  title:         string
  urlSlug:       string
  date:          string
  edgeMetric?:    string | null
  edgeLevel?:     number | null
  edgeCondition?: 'above' | 'below' | null
  resolution?:    EdgeResolution | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

// Only these editions' structured Edge-of-Day metrics have a real underlying
// market for the currently-supported instruments — COPPER/NATURALGAS
// deliberately have no entry here (fail open, never fabricate a mapping).
const EDGE_METRIC_TO_INSTRUMENT: Record<string, string> = {
  COMEX_GOLD:   'GOLD',
  COMEX_SILVER: 'SILVER',
  WTI:          'CRUDEOIL',
}

// Instrument-appropriate chart ranges — wider for high-vol commodities
const PAYOFF_WIDTH_BY_INST: Record<string, number> = {
  NATURALGAS: 0.30,
  SILVER:     0.25,
  CRUDEOIL:   0.20,
  COPPER:     0.20,
  GOLD:       0.15,
}

// MCX daily circuit limits
const CIRCUIT_LIMITS: Record<string, number> = {
  GOLD: 0.06, SILVER: 0.06, CRUDEOIL: 0.04, NATURALGAS: 0.10, COPPER: 0.06,
}

const PAYOFF_POINTS = 101
const LS_KEY = 'bhaavbrief_strategies'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function fmtOI(n: number): string {
  if (n === 0) return '—'
  if (n >= 100000) return `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  if (n >= 1000)   return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return String(n)
}

function fmtPnlAxis(v: number): string {
  if (v === 0) return '0'
  const abs = Math.abs(v)
  const sign = v < 0 ? '−' : '+'
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(abs % 100000 === 0 ? 0 : 1)}L`
  if (abs >= 1000)   return `${sign}₹${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`
  return `${sign}₹${abs}`
}

function fmtPnl(n: number | null): string {
  if (n === null) return 'Unlimited'
  const sign = n >= 0 ? '+' : ''
  return `${sign}₹${fmt(Math.abs(n))}`
}

function fmtGreek(n: number, dp = 3): string {
  return n.toFixed(dp)
}

function daysToExpiry(expiry: string): number {
  return Math.max(0, (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function buildFRange(futurePrice: number, payoffWidth: number, legs: Leg[]): number[] {
  const base = Array.from(
    { length: PAYOFF_POINTS },
    (_, i) => futurePrice * (1 - payoffWidth) + (i / (PAYOFF_POINTS - 1)) * futurePrice * 2 * payoffWidth,
  )
  const lo = base[0], hi = base[base.length - 1]
  // Extra fine-grained points (±1% of spot) around every distinct option
  // strike, so a tight multi-leg spread (e.g. adjacent-strike vertical spread)
  // is never under-sampled by the coarse background grid — regardless of how
  // wide the overall window is. FUT legs have no strike to add points around.
  const strikes = [...new Set(legs.filter(l => l.type !== 'FUT').map(l => l.strike))]
  const fineRadius = futurePrice * 0.01
  const finePoints = strikes.flatMap(K =>
    Array.from({ length: 21 }, (_, i) => K - fineRadius + (i / 20) * 2 * fineRadius),
  )
  const merged = [...base, ...finePoints].filter(F => F >= lo && F <= hi)
  return [...new Set(merged.map(f => +f.toFixed(4)))].sort((a, b) => a - b)
}

function greekColor(label: string, raw: number): string {
  if (label.includes('Theta')) return raw < 0 ? 'var(--down, #B53A2A)' : 'var(--up, #1B7A4A)'
  if (label.includes('Vega'))  return raw < 0 ? 'var(--down, #B53A2A)' : 'var(--up, #1B7A4A)'
  if (label.includes('Delta')) return raw > 0.001 ? '#2563eb' : raw < -0.001 ? '#7c3aed' : 'inherit'
  return 'inherit'
}

// BUY/SELL color triple — shared by LegButton, the Selected Legs badge, and saved-strategy chips
function actionStyle(action: Action) {
  const isBuy = action === 'BUY'
  return {
    border: isBuy ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)',
    color: isBuy ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)',
    background: isBuy ? 'var(--up-bg, #EBF5EF)' : 'var(--down-bg, #FAF0EE)',
  }
}

// Shared B/S leg-add button — used for CE, PE, and futures legs alike
function LegButton({ action, onClick }: { action: Action; onClick: () => void }) {
  const isBuy = action === 'BUY'
  const s = actionStyle(action)
  return (
    <button onClick={onClick}
      style={{
        fontSize: 12, padding: '1px 4px', borderRadius: 3,
        border: `1px solid ${s.border}`,
        color: s.color,
        background: s.background,
        cursor: 'pointer', lineHeight: 1.4,
      }}>
      {isBuy ? 'B' : 'S'}
    </button>
  )
}

function autoLabel(legs: Leg[], instrument: string): string {
  const inst = INSTRUMENTS.find(i => i.key === instrument)?.label ?? instrument
  const hasLongFut = legs.some(l => l.type === 'FUT' && l.action === 'BUY')
  const hasShortCall = legs.some(l => l.type === 'CE' && l.action === 'SELL')
  const hasLongPut = legs.some(l => l.type === 'PE' && l.action === 'BUY')
  if (legs.length === 3 && hasLongFut && hasShortCall && hasLongPut) return `${inst} Collar`
  if (legs.length === 2 && hasLongFut && hasShortCall) return `${inst} Covered Call`
  if (legs.length === 2 && hasLongFut && hasLongPut) return `${inst} Protective Put`
  if (legs.length === 2 && legs[0].type === 'CE' && legs[1].type === 'PE' && legs[0].action === 'BUY' && legs[1].action === 'BUY' && legs[0].strike === legs[1].strike) return `${inst} Straddle`
  if (legs.length === 2 && legs[0].type === 'CE' && legs[1].type === 'PE' && legs[0].action === 'BUY' && legs[1].action === 'BUY') return `${inst} Strangle`
  if (legs.length === 1 && legs[0].type === 'CE' && legs[0].action === 'BUY') return `${inst} Long Call`
  if (legs.length === 1 && legs[0].type === 'PE' && legs[0].action === 'BUY') return `${inst} Long Put`
  if (legs.length === 4) return `${inst} Iron Condor`
  if (legs.length === 2 && legs[0].type === 'CE' && legs[1].type === 'CE') return `${inst} Call Spread`
  if (legs.length === 2 && legs[0].type === 'PE' && legs[1].type === 'PE') return `${inst} Put Spread`
  return `${inst} Strategy`
}

// ── Template builder ──────────────────────────────────────────────────────────

function buildTemplateLegs(templateId: TemplateId, chain: ChainRow[], futurePrice: number, fallbackIV: number): Leg[] {
  const sorted = [...chain].sort((a, b) => Math.abs(a.strike - futurePrice) - Math.abs(b.strike - futurePrice))
  const atm = sorted[0]
  if (!atm) return []

  const strikes = chain.map(r => r.strike).sort((a, b) => a - b)
  const atmIdx  = strikes.indexOf(atm.strike)

  const getRow = (idx: number): ChainRow | undefined => chain.find(r => r.strike === strikes[idx])

  const otm1CE = getRow(atmIdx + 1)
  const otm2CE = getRow(atmIdx + 2)
  const otm1PE = getRow(atmIdx - 1)
  const otm2PE = getRow(atmIdx - 2)

  const makeLeg = (row: ChainRow, type: 'CE' | 'PE', action: 'BUY' | 'SELL'): Leg => ({
    strike:  row.strike,
    type,
    action,
    qty:     1,
    premium: row[type].ltp,
    iv:      (row[type].iv ?? fallbackIV) / 100,
  })

  const makeFutLeg = (action: Action): Leg => ({
    strike: futurePrice, type: 'FUT', action, qty: 1, premium: futurePrice, iv: 0,
  })

  switch (templateId) {
    case 'ATM_STRADDLE':
      return [makeLeg(atm, 'CE', 'BUY'), makeLeg(atm, 'PE', 'BUY')]

    case 'OTM_STRANGLE':
      if (!otm1CE || !otm1PE) return [makeLeg(atm, 'CE', 'BUY'), makeLeg(atm, 'PE', 'BUY')]
      return [makeLeg(otm1CE, 'CE', 'BUY'), makeLeg(otm1PE, 'PE', 'BUY')]

    case 'LONG_CALL':
      return [makeLeg(atm, 'CE', 'BUY')]

    case 'LONG_PUT':
      return [makeLeg(atm, 'PE', 'BUY')]

    case 'BULL_CALL_SPREAD':
      if (!otm1CE) return [makeLeg(atm, 'CE', 'BUY')]
      return [makeLeg(atm, 'CE', 'BUY'), makeLeg(otm1CE, 'CE', 'SELL')]

    case 'BEAR_PUT_SPREAD':
      if (!otm1PE) return [makeLeg(atm, 'PE', 'BUY')]
      return [makeLeg(atm, 'PE', 'BUY'), makeLeg(otm1PE, 'PE', 'SELL')]

    case 'IRON_CONDOR':
      if (!otm1CE || !otm2CE || !otm1PE || !otm2PE) return []
      return [
        makeLeg(otm1CE, 'CE', 'SELL'),
        makeLeg(otm2CE, 'CE', 'BUY'),
        makeLeg(otm1PE, 'PE', 'SELL'),
        makeLeg(otm2PE, 'PE', 'BUY'),
      ]

    case 'BULL_PUT_SPREAD':
      if (!otm1PE) return [makeLeg(atm, 'PE', 'SELL')]
      return [makeLeg(otm1PE, 'PE', 'SELL'), makeLeg(otm2PE ?? otm1PE, 'PE', 'BUY')]

    case 'BEAR_CALL_SPREAD':
      if (!otm1CE) return [makeLeg(atm, 'CE', 'SELL')]
      return [makeLeg(otm1CE, 'CE', 'SELL'), makeLeg(otm2CE ?? otm1CE, 'CE', 'BUY')]

    case 'COVERED_CALL':
      return [makeFutLeg('BUY'), makeLeg(atm, 'CE', 'SELL')]

    case 'PROTECTIVE_PUT':
      return [makeFutLeg('BUY'), makeLeg(atm, 'PE', 'BUY')]

    case 'COLLAR':
      return [makeFutLeg('BUY'), makeLeg(otm1CE ?? atm, 'CE', 'SELL'), makeLeg(otm1PE ?? atm, 'PE', 'BUY')]

    default:
      return []
  }
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadSaved(): SavedStrategy[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch { return [] }
}

function persistSaved(strategies: SavedStrategy[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(strategies)) } catch { /* quota */ }
}

// ── IV history chart — trend behind the regime banner ─────────────────────────

function fmtIVDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

interface IVHistoryTooltipProps {
  active?:  boolean
  payload?: { payload: { date: string; iv: number } }[]
  color: string
}

function IVHistoryTooltip({ active, payload, color }: IVHistoryTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--ink, #0E0D0A)', color: '#fff', border: '1px solid var(--ink-2, #3A3830)',
      padding: '6px 10px', borderRadius: 4, fontSize: 12,
    }}>
      <div style={{ opacity: 0.7, marginBottom: 2 }}>{fmtIVDate(d.date)}</div>
      <div style={{ fontWeight: 700, color }}>{d.iv}%</div>
    </div>
  )
}

interface PayoffTooltipProps {
  active?:     boolean
  payload?:    { dataKey: string; value: number; color: string; name: string }[]
  label?:      number
  netCostINR:  number
  futurePrice: number
  sigmaT:      number | null
}

// Shows ₹ + % P&L per line (the original ask), plus how many standard
// deviations the hovered price is from the current price — the piece a
// generic tooltip can't show, since it needs our own IV-regime math.
function PayoffTooltip({ active, payload, label, netCostINR, futurePrice, sigmaT }: PayoffTooltipProps) {
  if (!active || !payload?.length || label == null) return null
  const movePct = futurePrice > 0 ? ((label - futurePrice) / futurePrice) * 100 : null
  const sigmasAway = sigmaT && sigmaT > 0 && futurePrice > 0
    ? Math.log(label / futurePrice) / sigmaT
    : null
  return (
    <div style={{
      background: 'var(--ink, #0E0D0A)', color: '#fff', border: '1px solid var(--ink-2, #3A3830)',
      padding: '6px 10px', borderRadius: 4, fontSize: 12, minWidth: 160,
    }}>
      <div style={{ opacity: 0.7, marginBottom: 4 }}>
        F = ₹{fmt(label)}
        {movePct !== null && (
          <span style={{ color: movePct >= 0 ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)' }}>
            {' '}({movePct >= 0 ? '+' : ''}{movePct.toFixed(1)}%)
          </span>
        )}
        {sigmasAway !== null && (
          <span style={{ opacity: 0.6 }}> · {Math.abs(sigmasAway).toFixed(1)}σ {sigmasAway >= 0 ? 'above' : 'below'}</span>
        )}
      </div>
      {payload.map(p => {
        const v = Number(p.value)
        const pct = netCostINR !== 0 ? (v / Math.abs(netCostINR)) * 100 : null
        return (
          <div key={p.dataKey} style={{ fontWeight: 700, color: p.color }}>
            {p.name}: {v >= 0 ? '+' : ''}₹{fmt(v)}
            {pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)` : ''}
          </div>
        )
      })}
    </div>
  )
}

// Slim proportional strip from today to expiry, marking real upcoming events
// for the current commodity. Clicking one re-anchors the payoff chart's
// second line to that date instead of "now".
function EventTimeline({
  events, expiry, targetDate, onSelect,
}: {
  events: EventMapEntry[]
  expiry: string
  targetDate: string | null
  onSelect: (date: string | null) => void
}) {
  const now       = Date.now()
  const expiryMs  = new Date(expiry).getTime()
  const span      = Math.max(1, expiryMs - now)
  const impactColor: Record<string, string> = {
    high: 'var(--down, #B53A2A)', medium: 'var(--gold, #B5862A)', low: 'var(--ink-4, #B8B4A8)', context: 'var(--ink-4, #B8B4A8)', structural: 'var(--ink-4, #B8B4A8)',
  }
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
        <span>Today</span>
        <span>Expiry {new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div style={{ position: 'relative', height: 20, background: '#f3f4f6', borderRadius: 3 }}>
        {events.map(e => {
          const pct = Math.min(100, Math.max(0, ((new Date(e.next_release_utc).getTime() - now) / span) * 100))
          const selected = targetDate === e.next_release_utc
          return (
            <button
              key={e.id + e.next_release_utc}
              title={`${e.name} — ${new Date(e.next_release_utc).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}
              onClick={() => onSelect(selected ? null : e.next_release_utc)}
              style={{
                position: 'absolute', left: `${pct}%`, top: 2, transform: 'translateX(-50%)',
                width: selected ? 12 : 10, height: selected ? 12 : 10, borderRadius: '50%',
                background: impactColor[e.impact_tier] ?? 'var(--ink-4, #B8B4A8)',
                border: selected ? '2px solid var(--ink, #0E0D0A)' : '1px solid #fff',
                cursor: 'pointer', padding: 0,
              }}
            />
          )
        })}
      </div>
      {targetDate && (
        <button onClick={() => onSelect(null)}
          style={{ marginTop: 4, fontSize: 12, color: 'var(--gold-dark, #8B6520)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Reset to Today
        </button>
      )}
    </div>
  )
}

// Last 10 trading days of ATM IV, same convention as OptionChain.tsx's
// IVHistoryChart — real gaps (missed cron snapshot days) are left as gaps,
// never interpolated.
function IVHistorySparkline({ history, color }: { history: { date: string; iv: number }[]; color: string }) {
  const recent = history.slice(-10)
  if (recent.length < 2) {
    return (
      <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
        ATM IV trend chart returns once enough daily history has built up.
      </div>
    )
  }

  const ivValues = recent.map(d => d.iv)
  const minIV = Math.min(...ivValues)
  const maxIV = Math.max(...ivValues)
  const gradId = `grad-strategy-iv-${color.replace('#', '')}`

  return (
    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
        ATM IV — 10-Day
      </div>
      <div style={{ height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={recent} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0}    />
              </linearGradient>
            </defs>

            <XAxis dataKey="date" hide />
            <YAxis domain={[minIV * 0.98, maxIV * 1.02]} hide />

            <Tooltip
              content={<IVHistoryTooltip color={color} />}
              cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            <ReferenceLine y={recent[0].iv} stroke="#d1d5db" strokeDasharray="2 4" strokeWidth={0.8} />

            <Area
              type="monotone"
              dataKey="iv"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#${gradId})`}
              dot={{ r: 2.5, fill: color, stroke: '#f9fafb', strokeWidth: 1 }}
              activeDot={{ r: 3.5, fill: color, stroke: '#fff', strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StrategyBuilder({
  defaultInstrument = 'GOLD',
  marginByInstrument,
}: {
  defaultInstrument?: string
  marginByInstrument?: Record<string, string | null>
}) {
  const [instrument,    setInstrument]    = useState(defaultInstrument)
  const [chainData,     setChainData]     = useState<ChainData | null>(null)
  const [ivHistory,     setIvHistory]     = useState<{ date: string; iv: number }[]>([])
  const [legs,          setLegs]          = useState<Leg[]>([])
  const [tab,           setTab]           = useState<'build' | 'saved'>('build')
  const [saved,         setSaved]         = useState<SavedStrategy[]>([])
  const [savedPnls,     setSavedPnls]     = useState<Record<string, number | null>>({})
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)
  const [secondsAgo,    setSecondsAgo]    = useState(0)
  const [saveLabel,     setSaveLabel]     = useState('')
  const [riskBudget,    setRiskBudget]    = useState('')
  const [briefEdge, setBriefEdge] = useState<BriefEdge | null>(null)
  const [copied,    setCopied]    = useState(false)
  const [events,     setEvents]     = useState<EventMapEntry[]>([])
  const [targetDate, setTargetDate] = useState<string | null>(null)  // null = "now"
  // Cross-instrument/cross-expiry chain data for My Strategies P&L, keyed by
  // `${instrument}:${expiry}`. It's a ref (not state) so writes don't cause a
  // re-render on their own — chainVersion is bumped alongside every write so
  // the live-P&L effect below actually re-runs once fresh data lands.
  const allChainDataRef = useRef<Record<string, ChainData>>({})
  const [chainVersion, setChainVersion] = useState(0)

  const payoffWidth = PAYOFF_WIDTH_BY_INST[instrument] ?? 0.15
  const lotSize     = MCX_INSTRUMENTS[instrument]?.lotSize ?? 1
  const expiry      = chainData?.expiry ?? ''
  const expiries    = chainData?.expiries ?? []
  const chain       = chainData?.chain ?? []
  const futurePrice = chainData?.futurePrice ?? 0
  const r           = chainData?.riskFreeRate ?? 0.065
  const T           = expiry ? daysToExpiry(expiry) / 365 : 0

  // IV regime from history + current chain — only LIVE-tier sides, matching IVHistoryChart
  const atmRows  = chain.filter(r => r.isATM)
  const currentIV = (() => {
    const vals = atmRows.flatMap(r => [
      r.CE.tier === 'LIVE' ? r.CE.iv : null,
      r.PE.tier === 'LIVE' ? r.PE.iv : null,
    ]).filter((v): v is number => v != null && v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  })()
  const ivRegime: IVRegime | null = currentIV > 0 && ivHistory.length > 0
    ? computeIVRegime(ivHistory, currentIV)
    : null

  // Staleness counter
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo(lastFetchedAt ? Math.round((Date.now() - lastFetchedAt.getTime()) / 1000) : 0)
    }, 1000)
    return () => clearInterval(id)
  }, [lastFetchedAt])

  // Decode shared strategy from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('strategy')
    if (!encoded) return
    try {
      const decoded: Leg[] = JSON.parse(decodeURIComponent(escape(atob(encoded))))
      if (Array.isArray(decoded) && decoded.length > 0) setLegs(decoded)
    } catch {/* invalid URL param — ignore */}
  }, [])

  // Fetch chain + IV history
  const fetchData = useCallback(async (inst: string, exp?: string, preserveLegs = false) => {
    setLoading(true)
    setError(null)
    try {
      const chainUrl = `/api/options?instrument=${inst}${exp ? `&expiry=${exp}` : ''}`
      const ivUrl    = `/api/options/iv-history?instrument=${inst}`
      const [chainRes, ivRes] = await Promise.all([fetch(chainUrl), fetch(ivUrl)])

      // Set independently of the chain outcome below — these come from two
      // unrelated sources (Redis vs Kite), and a chain failure shouldn't
      // erase IV history that was fetched successfully in parallel.
      if (ivRes.ok) {
        const ivJson = await ivRes.json()
        setIvHistory(ivJson.history ?? [])
      }

      if (!chainRes.ok) throw new Error('Failed to load options chain')
      const chainJson = await chainRes.json()
      setChainData(chainJson)
      allChainDataRef.current[`${inst}:${chainJson.expiry}`] = chainJson
      setChainVersion(v => v + 1)
      setLastFetchedAt(new Date())
      if (!preserveLegs) setLegs([])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(instrument) }, [instrument, fetchData])

  // Auto-refresh every 60s when tab is visible, preserving legs
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && expiry) {
        fetchData(instrument, expiry, true)
      }
    }, 60000)
    return () => clearInterval(id)
  }, [instrument, expiry, fetchData])

  // Load saved strategies from localStorage on mount
  useEffect(() => { setSaved(loadSaved()) }, [])

  // Fetch today's Edge of Day for the selected instrument
  useEffect(() => {
    setBriefEdge(null)
    fetch(`/api/brief-edge?commodity=${instrument}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.edge) setBriefEdge(d) })
      .catch(() => {/* silent */})
  }, [instrument])

  // Fetch upcoming events for the selected instrument (used by the target-date timeline)
  useEffect(() => {
    setEvents([])
    setTargetDate(null)
    fetch(`/api/events?instrument=${instrument}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d?.events)) setEvents(d.events) })
      .catch(() => {/* silent */})
  }, [instrument])

  // Fetch cross-instrument/cross-expiry chains for My Strategies P&L when tab
  // switches to saved. Each saved strategy's OWN expiry is requested and
  // cached explicitly — never assumed to match whatever expiry is currently
  // selected on-screen, which used to silently price a saved strategy's legs
  // against a different contract month's premiums.
  useEffect(() => {
    if (tab !== 'saved' || saved.length === 0) return
    const needed = [...new Set(saved.map(s => `${s.instrument}:${s.expiry}`))]
      .filter(key => !allChainDataRef.current[key])
    needed.forEach(key => {
      const [inst, exp] = key.split(':')
      fetch(`/api/options?instrument=${inst}&expiry=${exp}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            allChainDataRef.current[`${inst}:${data.expiry}`] = data
            setChainVersion(v => v + 1)
          }
        })
        .catch(() => {/* silent */})
    })
  }, [tab, saved])

  // Compute live P&L for saved strategies using allChainDataRef
  useEffect(() => {
    if (saved.length === 0) return
    const pnls: Record<string, number | null> = {}
    for (const s of saved) {
      if (new Date(s.expiry) < new Date()) { pnls[s.id] = null; continue }
      const cd = allChainDataRef.current[`${s.instrument}:${s.expiry}`] ?? null
      if (!cd) { pnls[s.id] = null; continue }
      const ls = MCX_INSTRUMENTS[s.instrument]?.lotSize ?? 1
      const currentPnl = s.legs.reduce((sum, leg) => {
        const sign = leg.action === 'BUY' ? 1 : -1
        if (leg.type === 'FUT') {
          return sum + sign * leg.qty * ls * (cd.futurePrice - leg.premium)
        }
        const row = cd.chain.find(r => r.strike === leg.strike)
        if (!row) return sum
        const currentPremium = row[leg.type].ltp
        return sum + sign * leg.qty * ls * (currentPremium - leg.premium)
      }, 0)
      pnls[s.id] = currentPnl
    }
    setSavedPnls(pnls)
  }, [saved, chainVersion])

  // Payoff chart data — "today" line uses current live IV
  const fRange      = futurePrice > 0 ? buildFRange(futurePrice, payoffWidth, legs) : []
  const payoff: PayoffPoint[] = legs.length > 0 && futurePrice > 0
    ? computePayoff(legs, fRange, lotSize, T, r, currentIV > 0 ? currentIV : undefined)
    : []

  // ±1σ/±2σ expected-move cone from the site's own tracked IV — clamped to
  // the chart's visible price domain so it never overflows the axis. Also
  // supplies sigmaT for the lognormal-weighted Prob. of Profit below.
  const rawCone = computeExpectedMoveCone(futurePrice, currentIV, T)
  const cone = rawCone && fRange.length > 0
    ? {
        sigmaT:   rawCone.sigmaT,
        oneSigma: [Math.max(fRange[0], rawCone.oneSigma[0]), Math.min(fRange[fRange.length - 1], rawCone.oneSigma[1])] as [number, number],
        twoSigma: [Math.max(fRange[0], rawCone.twoSigma[0]), Math.min(fRange[fRange.length - 1], rawCone.twoSigma[1])] as [number, number],
      }
    : null

  const breakevens    = computeBreakevens(payoff)
  const maxProfitLoss = computeMaxProfitLoss(payoff)
  const pop = (payoff.length > 0 && cone)
    ? Math.round(computeProbOfProfit(payoff, breakevens, futurePrice, cone.sigmaT) * 100)
    : null
  const netGreeks     = legs.length > 0 && futurePrice > 0 && T > 0
    ? computeNetGreeks(legs, futurePrice, T, r, lotSize)
    : null
  const netCost    = computeNetCost(legs)
  const netCostINR = netCost * lotSize

  // P&L scenario table — pick 5 price points from payoff array. payoff is
  // sorted ascending by F but NOT uniformly spaced (buildFRange injects extra
  // points near strikes), so find the nearest real point rather than assuming
  // a uniform-index formula — that used to silently read the wrong price.
  const scenarios = (payoff.length > 0 && futurePrice > 0)
    ? [-0.10, -0.05, 0, 0.05, 0.10].map(pct => {
        const F  = futurePrice * (1 + pct)
        const pt = payoff.reduce((best, p) => Math.abs(p.F - F) < Math.abs(best.F - F) ? p : best, payoff[0])
        const pnlVal = pt.pnlExpiry
        // Guard against a near-zero (not just exact-zero) net cost producing
        // an arithmetically "correct" but meaningless percentage like +40000%.
        const pnlPct = Math.abs(netCostINR) > futurePrice * lotSize * 0.001
          ? (pnlVal / Math.abs(netCostINR) * 100)
          : null
        return { label: `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)}%`, F, pnl: pnlVal, pnlPct, isATM: pct === 0 }
      })
    : []

  // Risk budget sizing — scale the CURRENT leg structure (preserving any ratio
  // between legs, e.g. a 1x2 backspread) so its max loss matches the stated
  // budget, rather than setting every leg to the same absolute quantity.
  const riskScaleFactor = (riskBudget && maxProfitLoss.maxLoss !== null && maxProfitLoss.maxLoss < 0)
    ? Number(riskBudget) / Math.abs(maxProfitLoss.maxLoss)
    : null
  const suggestedLots = riskScaleFactor !== null ? Math.max(1, Math.round(riskScaleFactor)) : null

  const dte = expiry ? daysToExpiry(expiry) : 0

  // Target-date second line — defaults to "now" (T years out); clicking an
  // event marker on the timeline below re-anchors it to that event's date.
  const targetDaysOut = targetDate ? Math.max(0, (new Date(targetDate).getTime() - Date.now()) / 86400000) : 0
  const targetT        = targetDate ? Math.max(0, T - targetDaysOut / 365) : T
  const secondaryPayoff: PayoffPoint[] = targetDate && legs.length > 0 && futurePrice > 0
    ? computePayoff(legs, fRange, lotSize, targetT, r, currentIV > 0 ? currentIV : undefined)
    : payoff
  const secondaryLabel = targetDate
    ? `As of ${new Date(targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : `Today (${Math.round(dte)}d left)`

  const chartData = payoff.map((p, i) => ({
    F:      Math.round(p.F),
    Expiry: Math.round(p.pnlExpiry),
    AsOf:   targetT > 0 ? Math.round((secondaryPayoff[i] ?? p).pnlToday) : undefined,
  }))


  // Events between today and expiry, for the target-date timeline
  const upcomingEvents = expiry
    ? events.filter(e => {
        const t = new Date(e.next_release_utc).getTime()
        return t > Date.now() && t <= new Date(expiry).getTime()
      }).sort((a, b) => new Date(a.next_release_utc).getTime() - new Date(b.next_release_utc).getTime())
    : []

  function addLeg(row: ChainRow, type: 'CE' | 'PE', action: 'BUY' | 'SELL') {
    const side = row[type]
    if (side.ltp <= 0) return
    setLegs(prev => [
      ...prev,
      { strike: row.strike, type, action, qty: 1, premium: side.ltp, iv: (side.iv ?? currentIV) / 100 },
    ])
  }

  function addFutLeg(action: Action) {
    if (futurePrice <= 0) return
    setLegs(prev => [
      ...prev,
      { strike: futurePrice, type: 'FUT', action, qty: 1, premium: futurePrice, iv: 0 },
    ])
  }

  function removeLeg(idx: number) {
    setLegs(prev => prev.filter((_, i) => i !== idx))
  }

  function updateQty(idx: number, qty: number) {
    setLegs(prev => prev.map((l, i) => i === idx ? { ...l, qty: Math.max(1, qty) } : l))
  }

  // Lets a trader model a position they already hold (e.g. futures bought weeks
  // ago) instead of always being locked to the live price at the moment a leg
  // was added. For a FUT leg, `strike` mirrors `premium` purely for display —
  // keep them in sync so the saved-strategy chip renderer shows a consistent number.
  function updatePremium(idx: number, premium: number) {
    setLegs(prev => prev.map((l, i) => {
      if (i !== idx) return l
      const p = Math.max(0, premium)
      return l.type === 'FUT' ? { ...l, premium: p, strike: p } : { ...l, premium: p }
    }))
  }

  // Walks the full chain (not just the ±5-strike visible window) to the next
  // strike with a live quote in the given direction, skipping illiquid strikes
  // the same way the option-chain B/S buttons already refuse to render for a
  // zero-price cell.
  function findNextLiquidStrike(currentStrike: number, type: 'CE' | 'PE', direction: 1 | -1): ChainRow | null {
    const sortedStrikes = [...new Set(chain.map(r => r.strike))].sort((a, b) => a - b)
    const curIdx = sortedStrikes.indexOf(currentStrike)
    if (curIdx === -1) return null
    for (let i = curIdx + direction; i >= 0 && i < sortedStrikes.length; i += direction) {
      const row = chain.find(r => r.strike === sortedStrikes[i])
      if (row && row[type].ltp > 0) return row
    }
    return null
  }

  function stepStrike(idx: number, direction: 1 | -1) {
    setLegs(prev => prev.map((l, i) => {
      if (i !== idx || l.type === 'FUT') return l
      const next = findNextLiquidStrike(l.strike, l.type, direction)
      if (!next) return l
      const side = next[l.type]
      return { ...l, strike: next.strike, premium: side.ltp, iv: (side.iv ?? l.iv * 100) / 100 }
    }))
  }

  function applyRiskScale(factor: number) {
    setLegs(prev => prev.map(l => ({ ...l, qty: Math.max(1, Math.round(l.qty * factor)) })))
  }

  function toggleAction(idx: number) {
    setLegs(prev => prev.map((l, i) => i === idx ? { ...l, action: l.action === 'BUY' ? 'SELL' : 'BUY' } : l))
  }

  function loadTemplate(templateId: TemplateId) {
    const newLegs = buildTemplateLegs(templateId, chain, futurePrice, currentIV || 0)
    if (newLegs.length > 0) setLegs(newLegs)
  }

  function copyShareUrl() {
    if (legs.length === 0) return
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(legs))))
    const url = `${window.location.origin}/options/strategy?instrument=${instrument}&strategy=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {/* clipboard blocked */})
  }

  function saveStrategy() {
    if (legs.length === 0 || !expiry) return
    const strategy: SavedStrategy = {
      id:           crypto.randomUUID(),
      instrument,
      expiry,
      legs,
      entryDate:    new Date().toISOString(),
      entryFutures: futurePrice,
      label:        saveLabel.trim() || autoLabel(legs, instrument),
    }
    const updated = [strategy, ...saved]
    setSaved(updated)
    persistSaved(updated)
    setSaveLabel('')
  }

  function deleteSaved(id: string) {
    const updated = saved.filter(s => s.id !== id)
    setSaved(updated)
    persistSaved(updated)
  }

  const regimeColors: Record<string, string> = {
    CHEAP:  'var(--up, #1B7A4A)',
    NORMAL: 'var(--gold, #B5862A)',
    RICH:   'var(--down, #B53A2A)',
  }

  const circuitLimit = CIRCUIT_LIMITS[instrument] ?? 0.06

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Link href="/options" style={{ color: '#6b7280', fontSize: 16, textDecoration: 'none', lineHeight: 1 }}
            title="Back to Option Chain">
            ← Options
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>MCX Options Strategy Builder</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>
          Compose multi-leg strategies and visualise P&amp;L at expiry
        </p>
      </div>

      {/* Instrument selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {INSTRUMENTS.map(inst => (
          <button key={inst.key}
            onClick={() => { setInstrument(inst.key); setLegs([]) }}
            style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid',
              cursor: 'pointer', fontSize: 15, fontWeight: instrument === inst.key ? 700 : 400,
              borderColor: instrument === inst.key ? 'var(--gold, #B5862A)' : '#d1d5db',
              background: instrument === inst.key ? 'var(--gold, #B5862A)' : 'transparent',
              color: instrument === inst.key ? '#fff' : 'inherit',
            }}>
            {inst.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--down-bg, #FAF0EE)', border: '1px solid var(--down, #B53A2A)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: 'var(--down, #B53A2A)', fontSize: 15 }}>
          {error} — please try again in a moment.
        </div>
      )}

      {loading && <div style={{ color: '#6b7280', fontSize: 15, marginBottom: 12 }}>Loading chain…</div>}

      {/* IV Regime Banner */}
      {ivRegime && (
        <div style={{
          background: '#f9fafb', border: `1px solid ${regimeColors[ivRegime.regime]}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            background: regimeColors[ivRegime.regime], color: '#fff',
            borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 14,
          }}>
            {ivRegime.regime}
          </div>
          <div style={{ fontSize: 16 }}>
            <strong>IV {ivRegime.currentIV.toFixed(1)}%</strong>
            {' — '}{ivRegime.label}
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            IV Rank {ivRegime.ivRank}
          </div>
        </div>
      )}

      {ivRegime && ivHistory.length > 0 && (
        <IVHistorySparkline history={ivHistory} color={regimeColors[ivRegime.regime]} />
      )}

      {/* Quick Setup — all templates, no IV-based filtering */}
      {chainData && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Quick Setup</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6 }}>
            {([
              { id: 'ATM_STRADDLE',     name: 'ATM Straddle',      desc: 'Buy call + put, same strike — bet on a big move, either direction' },
              { id: 'OTM_STRANGLE',     name: 'OTM Strangle',      desc: 'Cheaper big-move bet than a straddle — needs a bigger move to profit' },
              { id: 'LONG_CALL',        name: 'Long Call',         desc: 'Bullish, limited risk, unlimited upside' },
              { id: 'LONG_PUT',         name: 'Long Put',          desc: 'Bearish, limited risk, large downside payoff' },
              { id: 'BULL_CALL_SPREAD', name: 'Bull Call Spread',  desc: 'Capped bullish bet — cheaper than a long call' },
              { id: 'BEAR_PUT_SPREAD',  name: 'Bear Put Spread',   desc: 'Capped bearish bet — cheaper than a long put' },
              { id: 'IRON_CONDOR',      name: 'Iron Condor',       desc: 'Profit if price stays in a range' },
              { id: 'BULL_PUT_SPREAD',  name: 'Bull Put Spread',   desc: 'Sell puts for credit — bullish, defined risk' },
              { id: 'BEAR_CALL_SPREAD', name: 'Bear Call Spread',  desc: 'Sell calls for credit — bearish, defined risk' },
              { id: 'COVERED_CALL',     name: 'Covered Call',      desc: 'Hold futures, sell a call — earn income on a position you hold' },
              { id: 'PROTECTIVE_PUT',   name: 'Protective Put',    desc: 'Hold futures, buy a put — insure against a drop' },
              { id: 'COLLAR',           name: 'Collar',            desc: 'Hold futures + sell call + buy put — cap both gains and losses' },
            ] as { id: TemplateId; name: string; desc: string }[]).map(t => (
              <button key={t.id} onClick={() => loadTemplate(t.id)}
                style={{
                  padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, lineHeight: 1.3 }}>{t.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            Or use B/S buttons in the chain below to add legs manually
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        {([['build', 'Strategy Builder'], ['saved', `My Strategies (${saved.length})`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400, fontSize: 16,
              borderBottom: tab === t ? '2px solid var(--gold, #B5862A)' : '2px solid transparent',
              color: tab === t ? 'var(--gold-dark, #8B6520)' : '#6b7280', marginBottom: -1,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Build Tab ── */}
      {tab === 'build' && chainData && (
        <>
          {/* Expiry selector + Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, color: '#6b7280' }}>Expiry:</span>
            <select value={expiry}
              onChange={e => { fetchData(instrument, e.target.value); setLegs([]) }}
              style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 15 }}>
              {expiries.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <span style={{ fontSize: 15, color: '#6b7280', marginLeft: 4 }}>
              Futures: <strong>₹{fmt(futurePrice)}</strong>
            </span>
            <span style={{ fontSize: 14, color: '#6b7280' }}>
              · Lot: <strong>{lotSize}</strong>
            </span>
            <button
              onClick={() => fetchData(instrument, expiry, true)}
              style={{
                marginLeft: 'auto', fontSize: 13, padding: '3px 10px', borderRadius: 5,
                border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#6b7280',
              }}>
              ↺ Refresh
            </button>
            {lastFetchedAt && (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)}m ago`}
              </span>
            )}
          </div>

          {/* Futures leg — its own row so it isn't buried inline with other header text */}
          {futurePrice > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Futures Position</span>
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                Add the underlying futures contract as a leg — for covered calls, protective puts, collars:
              </span>
              <LegButton action="BUY"  onClick={() => addFutLeg('BUY')} />
              <LegButton action="SELL" onClick={() => addFutLeg('SELL')} />
            </div>
          )}

          {/* Today's Edge of Day from the morning brief */}
          {briefEdge && (
            <div style={{ margin: '0 0 14px', padding: '10px 14px', background: '#FFFBF0', border: '0.5px solid rgba(181,134,42,0.3)', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', fontWeight: 700 }}>
                  Today&apos;s Edge
                </span>
                <a href={`/briefs/${briefEdge.urlSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9ca3af', textDecoration: 'none', letterSpacing: '0.04em' }}>
                  {briefEdge.date} →
                </a>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#48483A', lineHeight: 1.55 }}>{briefEdge.edge}</p>
              {briefEdge.resolution && briefEdge.edgeMetric && EDGE_METRIC_TO_INSTRUMENT[briefEdge.edgeMetric] === instrument && (
                <div style={{
                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                  color: '#fff',
                  background: { confirmed: 'var(--up, #1B7A4A)', rejected: 'var(--down, #B53A2A)', unresolved: 'var(--gold, #B5862A)' }[briefEdge.resolution.verdict],
                }}>
                  {briefEdge.edgeMetric.replace(/_/g, ' ')} {briefEdge.edgeCondition} {briefEdge.edgeLevel != null ? fmt(briefEdge.edgeLevel) : ''}
                  {' — '}
                  {{ confirmed: 'Confirmed ✓', rejected: 'Rejected ✗', unresolved: 'Pending —' }[briefEdge.resolution.verdict]}
                  {briefEdge.resolution.resolvedValue != null ? `, now ${fmt(briefEdge.resolution.resolvedValue)}` : ''}
                </div>
              )}
            </div>
          )}

          {/* Mini chain — ±5 strikes around ATM */}
          {(() => {
            let atmIdx = chain.findIndex(r => r.isATM)
            if (atmIdx === -1 && futurePrice > 0 && chain.length > 0) {
              atmIdx = chain.reduce(
                (best, row, i) =>
                  Math.abs(row.strike - futurePrice) < Math.abs(chain[best].strike - futurePrice) ? i : best,
                0,
              )
            }
            const start   = Math.max(0, atmIdx - 5)
            const end     = Math.min(chain.length - 1, atmIdx + 5)
            const visible = chain.slice(start, end + 1)
            return (
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE OI</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE IV%</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE Δ</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE LTP</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700 }}>Strike</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE LTP</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE Δ</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE IV%</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(row => (
                      <tr key={row.strike}
                        style={{
                          background: row.isATM ? 'var(--gold-pale, #F9F4EC)' : 'transparent',
                          borderBottom: '1px solid #f3f4f6',
                        }}>
                        {/* CE OI */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#9ca3af', fontSize: 13 }}>
                          {fmtOI(row.CE.oi)}
                        </td>
                        {/* CE IV */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.iv != null ? row.CE.iv.toFixed(1) : '—'}
                        </td>
                        {/* CE Delta */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.delta != null ? row.CE.delta.toFixed(2) : '—'}
                        </td>
                        {/* CE LTP + B/S */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700 }}>{row.CE.ltp > 0 ? fmt(row.CE.ltp) : '—'}</span>
                          {row.CE.ltp > 0 && (
                            <span style={{ marginLeft: 4, display: 'inline-flex', gap: 2 }}>
                              <LegButton action="BUY"  onClick={() => addLeg(row, 'CE', 'BUY')} />
                              <LegButton action="SELL" onClick={() => addLeg(row, 'CE', 'SELL')} />
                            </span>
                          )}
                        </td>
                        {/* Strike */}
                        <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: row.isATM ? 700 : 400 }}>
                          {fmt(row.strike)}
                        </td>
                        {/* PE LTP + B/S */}
                        <td style={{ padding: '5px 6px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                          {row.PE.ltp > 0 && (
                            <span style={{ marginRight: 4, display: 'inline-flex', gap: 2 }}>
                              <LegButton action="BUY"  onClick={() => addLeg(row, 'PE', 'BUY')} />
                              <LegButton action="SELL" onClick={() => addLeg(row, 'PE', 'SELL')} />
                            </span>
                          )}
                          <span style={{ fontWeight: 700 }}>{row.PE.ltp > 0 ? fmt(row.PE.ltp) : '—'}</span>
                        </td>
                        {/* PE Delta */}
                        <td style={{ padding: '5px 6px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.delta != null ? row.PE.delta.toFixed(2) : '—'}
                        </td>
                        {/* PE IV */}
                        <td style={{ padding: '5px 6px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.iv != null ? row.PE.iv.toFixed(1) : '—'}
                        </td>
                        {/* PE OI */}
                        <td style={{ padding: '5px 6px', textAlign: 'left', color: '#9ca3af', fontSize: 13 }}>
                          {fmtOI(row.PE.oi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {/* Leg table */}
          {legs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Selected Legs</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Action</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Strike</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Entry</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>IV%</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((leg, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '5px 8px' }}>
                        <button onClick={() => toggleAction(i)}
                          style={{
                            padding: '2px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer', fontSize: 13,
                            background: actionStyle(leg.action).background,
                            borderColor: actionStyle(leg.action).border,
                            color: actionStyle(leg.action).color, fontWeight: 600,
                          }}>
                          {leg.action}
                        </button>
                      </td>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--ink-2, #3A3830)' }}>
                        {leg.type}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        {leg.type === 'FUT' ? '—' : (() => {
                          const canDown = findNextLiquidStrike(leg.strike, leg.type, -1) !== null
                          const canUp   = findNextLiquidStrike(leg.strike, leg.type, 1) !== null
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <button onClick={() => stepStrike(i, -1)} disabled={!canDown}
                                style={{
                                  fontSize: 12, width: 16, height: 16, lineHeight: 1, padding: 0,
                                  borderRadius: 3, border: '1px solid #d1d5db', background: '#fff',
                                  color: '#6b7280', cursor: canDown ? 'pointer' : 'not-allowed',
                                  opacity: canDown ? 1 : 0.3,
                                }}>−</button>
                              <span>{fmt(leg.strike)}</span>
                              <button onClick={() => stepStrike(i, 1)} disabled={!canUp}
                                style={{
                                  fontSize: 12, width: 16, height: 16, lineHeight: 1, padding: 0,
                                  borderRadius: 3, border: '1px solid #d1d5db', background: '#fff',
                                  color: '#6b7280', cursor: canUp ? 'pointer' : 'not-allowed',
                                  opacity: canUp ? 1 : 0.3,
                                }}>+</button>
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        ₹<input type="number" min={0} step="0.05" value={leg.premium}
                          onChange={e => updatePremium(i, parseFloat(e.target.value) || 0)}
                          title="Edit to model a position entered at a different price than today's live quote"
                          className="no-spinner"
                          style={{ width: 88, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>
                        {leg.type === 'FUT' ? '—' : (leg.iv * 100).toFixed(1)}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <input type="number" min={1} max={100} value={leg.qty}
                          onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                          style={{ width: 48, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 14, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <button onClick={() => removeLeg(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Net Greeks — color-coded by sign */}
          {netGreeks && legs.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 14 }}>
              {[
                { label: 'Net Delta',    raw: netGreeks.delta,                       display: fmtGreek(netGreeks.delta, 2) },
                { label: 'Delta ₹ Exp', raw: netGreeks.delta * futurePrice,         display: fmtPnlAxis(Math.round(netGreeks.delta * futurePrice)) },
                { label: 'Net Gamma',   raw: netGreeks.gamma,                       display: fmtGreek(netGreeks.gamma, 4) },
                { label: 'Net Theta/day', raw: netGreeks.theta,                     display: fmtPnlAxis(Math.round(netGreeks.theta)) },
                { label: 'Net Vega/1%', raw: netGreeks.vega,                        display: fmtPnlAxis(Math.round(netGreeks.vega)) },
              ].map(g => (
                <div key={g.label}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 12px' }}>
                  <div style={{ color: '#6b7280', marginBottom: 2 }}>{g.label}</div>
                  <div style={{ fontWeight: 700, color: greekColor(g.label, g.raw) }}>{g.display}</div>
                </div>
              ))}
            </div>
          )}

          {/* Payoff chart */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Payoff Diagram</div>
              {cone && ivRegime && (
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                  Shaded: ±1σ/±2σ expected range · IV {currentIV.toFixed(1)}% ({ivRegime.regime.toLowerCase()}, {ivRegime.label})
                </div>
              )}
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
                  <XAxis dataKey="F" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v: number) => {
                    const n = Number(v)
                    if (futurePrice >= 10000) return `₹${Math.round(n / 1000)}K`
                    if (futurePrice >= 1000)  return `₹${(n / 1000).toFixed(1)}K`
                    return `₹${Math.round(n)}`
                  }} tick={{ fontSize: 12 }} interval="preserveStartEnd" tickCount={7} />
                  <YAxis tickFormatter={v => fmtPnlAxis(Number(v))} tick={{ fontSize: 12 }} width={68} />
                  <Tooltip content={<PayoffTooltip netCostINR={netCostINR} futurePrice={futurePrice} sigmaT={cone?.sigmaT ?? null} />} />
                  <Legend wrapperStyle={{ fontSize: 14 }} />
                  {cone && ivRegime && (
                    <>
                      <ReferenceArea x1={cone.twoSigma[0]} x2={cone.twoSigma[1]} fill={regimeColors[ivRegime.regime]} fillOpacity={0.06} ifOverflow="hidden" />
                      <ReferenceArea x1={cone.oneSigma[0]} x2={cone.oneSigma[1]} fill={regimeColors[ivRegime.regime]} fillOpacity={0.13} ifOverflow="hidden" />
                    </>
                  )}
                  <ReferenceLine y={0} stroke="var(--ink-4, #B8B4A8)" strokeDasharray="3 3" />
                  {/* Current price reference */}
                  {futurePrice > 0 && (
                    <ReferenceLine x={futurePrice} stroke="var(--border-2, #D4CFC0)" strokeDasharray="2 3" strokeWidth={1} />
                  )}
                  {/* Breakeven lines — no label; values shown in stats below. Exact
                      value now that the axis is numeric (no need to snap to a grid point). */}
                  {breakevens.map((be, i) => (
                    <ReferenceLine key={i} x={be} stroke="var(--gold, #B5862A)" strokeDasharray="4 2" strokeWidth={1.5} />
                  ))}
                  {/* "Today" drawn first so "At Expiry" paints on top when they
                      coincide exactly (e.g. a futures-only position has no time
                      value, so the two lines are pixel-identical) — otherwise
                      the fainter secondary line fully occludes the primary one. */}
                  {targetT > 0 && <Line type="monotone" dataKey="AsOf" stroke="var(--ink-3, #7A7668)" dot={false} strokeWidth={1.5}
                    strokeDasharray="5 3" name={secondaryLabel} />}
                  <Line type="monotone" dataKey="Expiry" stroke="var(--gold-dark, #8B6520)" dot={false} strokeWidth={2} name="At Expiry" />
                </LineChart>
              </ResponsiveContainer>
              {upcomingEvents.length > 0 && expiry && (
                <EventTimeline
                  events={upcomingEvents}
                  expiry={expiry}
                  targetDate={targetDate}
                  onSelect={setTargetDate}
                />
              )}
            </div>
          )}

          {/* P&L Scenario Table */}
          {scenarios.length > 0 && (
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>P&amp;L Scenarios at Expiry</div>
              <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 340 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ padding: '5px 12px', textAlign: 'left' }}>Move</th>
                    <th style={{ padding: '5px 12px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '5px 12px', textAlign: 'right' }}>P&amp;L</th>
                    {scenarios[0].pnlPct !== null && <th style={{ padding: '5px 12px', textAlign: 'right' }}>Return</th>}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map(s => (
                    <tr key={s.label}
                      style={{
                        background: s.isATM ? '#f9fafb' : 'transparent',
                        borderBottom: '1px solid #f3f4f6',
                        fontWeight: s.isATM ? 600 : 400,
                      }}>
                      <td style={{ padding: '5px 12px', color: '#6b7280' }}>{s.label}</td>
                      <td style={{ padding: '5px 12px', textAlign: 'right' }}>₹{fmt(Math.round(s.F))}</td>
                      <td style={{ padding: '5px 12px', textAlign: 'right', color: s.pnl >= 0 ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)' }}>
                        {s.pnl >= 0 ? '+' : ''}₹{fmt(Math.abs(Math.round(s.pnl)))}
                      </td>
                      {s.pnlPct !== null && (
                        <td style={{ padding: '5px 12px', textAlign: 'right', color: s.pnlPct >= 0 ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)' }}>
                          {s.pnlPct >= 0 ? '+' : ''}{s.pnlPct.toFixed(0)}%
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stats row */}
          {legs.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 15 }}>
              {[
                {
                  label: netCostINR >= 0 ? 'Net Debit' : 'Net Credit',
                  value: `₹${fmt(Math.abs(netCostINR))}`,
                  sub:   `per 1 lot (×${lotSize})`,
                  color: 'inherit',
                },
                ...(legs.some(l => l.type === 'FUT') ? [{
                  label: 'Approx Margin',
                  value: marginByInstrument?.[instrument] ?? '—',
                  sub:   'futures leg — SPAN + exposure',
                  color: 'inherit',
                }] : []),
                {
                  label: 'Max Profit',
                  value: fmtPnl(maxProfitLoss.maxProfit),
                  sub: '',
                  color: maxProfitLoss.maxProfit != null && maxProfitLoss.maxProfit > 0 ? 'var(--up, #1B7A4A)' : 'inherit',
                },
                {
                  label: 'Max Loss',
                  value: fmtPnl(maxProfitLoss.maxLoss),
                  sub: '',
                  color: maxProfitLoss.maxLoss != null && maxProfitLoss.maxLoss < 0 ? 'var(--down, #B53A2A)' : 'inherit',
                },
                ...(maxProfitLoss.maxProfit !== null && maxProfitLoss.maxLoss !== null && maxProfitLoss.maxLoss < 0
                  ? [{ label: 'Risk/Reward', value: `1 : ${(Math.abs(maxProfitLoss.maxProfit) / Math.abs(maxProfitLoss.maxLoss)).toFixed(2)}`, sub: '', color: 'inherit' }]
                  : []),
                {
                  label: 'Breakeven(s)',
                  value: breakevens.length > 0
                    ? breakevens.map(be => {
                        const pct = ((be - futurePrice) / futurePrice * 100)
                        return `₹${fmt(Math.round(be))} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
                      }).join(' / ')
                    : '—',
                  sub: '',
                  color: 'inherit',
                },
                ...(pop !== null ? [{
                  label: 'Prob. of Profit',
                  value: `~${pop}%`,
                  sub: 'at expiry',
                  color: pop >= 50 ? 'var(--up, #1B7A4A)' : '#6b7280',
                }] : []),
              ].map(s => (
                <div key={s.label}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', minWidth: 120 }}>
                  <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 2 }}>
                    {s.label === 'Approx Margin'
                      ? <Link href="/learn/mcx-margin-calculation" style={{ color: 'inherit', textDecoration: 'underline dotted' }}>{s.label}</Link>
                      : s.label}
                  </div>
                  <div style={{ fontWeight: 700, color: s.color }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Risk budget sizing */}
          {maxProfitLoss.maxLoss !== null && maxProfitLoss.maxLoss < 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: '#6b7280' }}>Risk budget ₹</span>
              <input
                type="number" min={0} placeholder="e.g. 50000"
                value={riskBudget}
                onChange={e => setRiskBudget(e.target.value)}
                style={{ width: 110, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 14 }}
              />
              {suggestedLots !== null && (
                <>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>→ <strong>{suggestedLots} lot{suggestedLots !== 1 ? 's' : ''}</strong></span>
                  <button
                    onClick={() => riskScaleFactor !== null && applyRiskScale(riskScaleFactor)}
                    style={{ fontSize: 14, padding: '4px 10px', borderRadius: 5, border: '1px solid var(--gold, #B5862A)',
                      background: 'var(--gold, #B5862A)', color: '#fff', cursor: 'pointer' }}>
                    Apply
                  </button>
                </>
              )}
            </div>
          )}

          {/* Save button */}
          {legs.length > 0 && (
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder={`Label (e.g. "${autoLabel(legs, instrument)}")`}
                value={saveLabel}
                onChange={e => setSaveLabel(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, minWidth: 200 }}
              />
              <button onClick={saveStrategy}
                style={{
                  padding: '8px 20px', background: 'var(--gold, #B5862A)', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, fontWeight: 600,
                }}>
                Save →
              </button>
              <button onClick={() => setLegs([])}
                style={{
                  padding: '8px 16px', background: 'none', color: '#6b7280',
                  border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 15,
                }}>
                Clear
              </button>
              <button onClick={copyShareUrl}
                style={{
                  padding: '8px 16px', background: 'none',
                  color: copied ? 'var(--up, #1B7A4A)' : '#6b7280',
                  border: `1px solid ${copied ? 'var(--up, #1B7A4A)' : '#d1d5db'}`,
                  borderRadius: 6, cursor: 'pointer', fontSize: 15,
                }}>
                {copied ? 'Link copied' : 'Share link'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Saved Strategies Tab ── */}
      {tab === 'saved' && (
        <div>
          {saved.length === 0 && (
            <div style={{ color: '#6b7280', fontSize: 16, padding: '24px 0' }}>
              No saved strategies yet. Build one and click &ldquo;Save →&rdquo;
            </div>
          )}
          {saved.map(s => {
            const expired  = new Date(s.expiry) < new Date()
            const livePnl  = savedPnls[s.id]
            const pnlColor = livePnl == null ? '#6b7280' : livePnl >= 0 ? 'var(--up, #1B7A4A)' : 'var(--down, #B53A2A)'
            const entryTotal = s.legs.reduce((sum, l) => sum + l.qty * (MCX_INSTRUMENTS[s.instrument]?.lotSize ?? 1) * l.premium * (l.action === 'BUY' ? 1 : -1), 0)
            return (
              <div key={s.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
                  marginBottom: 12, background: expired ? '#f9fafb' : '#fff',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {s.label ?? (MCX_INSTRUMENTS[s.instrument]?.label ?? s.instrument)}
                      {' '}
                      <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 14 }}>
                        expiry {s.expiry}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                      Entry {new Date(s.entryDate).toLocaleDateString('en-IN')} · F₀ ₹{fmt(s.entryFutures)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 14 }}>
                      {s.legs.map((leg, i) => (
                        <span key={i} style={{
                          marginRight: 6, padding: '1px 6px', borderRadius: 4,
                          background: actionStyle(leg.action).background,
                          color: actionStyle(leg.action).color,
                        }}>
                          {leg.action} {leg.qty}× {leg.type} {fmt(leg.strike)} @ {fmt(leg.premium)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {expired
                      ? <div style={{ color: '#9ca3af', fontSize: 14 }}>Expired</div>
                      : livePnl != null
                        ? (
                          <div>
                            <div style={{ fontWeight: 700, color: pnlColor, fontSize: 17 }}>
                              {livePnl >= 0 ? '+' : ''}₹{fmt(livePnl)}
                            </div>
                            {entryTotal !== 0 && (
                              <div style={{ fontSize: 13, color: pnlColor }}>
                                {(livePnl / Math.abs(entryTotal) * 100).toFixed(1)}%
                              </div>
                            )}
                            <div style={{ fontSize: 13, color: '#9ca3af' }}>live P&L</div>
                          </div>
                        )
                        : <div style={{ fontSize: 14, color: '#9ca3af' }}>loading…</div>
                    }
                    <button onClick={() => deleteSaved(s.id)}
                      style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

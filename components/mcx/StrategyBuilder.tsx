'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import {
  computePayoff, computeNetGreeks, computeBreakevens, computeMaxProfitLoss, computeNetCost,
  type Leg, type SavedStrategy, type PayoffPoint,
} from '@/lib/strategy'
import {
  computeIVRegime,
  type IVRegime, type TemplateId,
} from '@/lib/ivAnalysis'
import Link from 'next/link'
import { MCX_INSTRUMENTS } from '@/lib/options'

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

// ── Constants ─────────────────────────────────────────────────────────────────

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

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

function buildFRange(futurePrice: number, payoffWidth: number): number[] {
  return Array.from(
    { length: PAYOFF_POINTS },
    (_, i) => futurePrice * (1 - payoffWidth) + (i / (PAYOFF_POINTS - 1)) * futurePrice * 2 * payoffWidth,
  )
}

function greekColor(label: string, raw: number): string {
  if (label.includes('Theta')) return raw < 0 ? '#dc2626' : '#16a34a'
  if (label.includes('Vega'))  return raw < 0 ? '#dc2626' : '#16a34a'
  if (label.includes('Delta')) return raw > 0.001 ? '#2563eb' : raw < -0.001 ? '#7c3aed' : 'inherit'
  return 'inherit'
}

function autoLabel(legs: Leg[], instrument: string): string {
  const inst = INSTRUMENTS.find(i => i.key === instrument)?.label ?? instrument
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

// ── Main component ────────────────────────────────────────────────────────────

export default function StrategyBuilder({ defaultInstrument = 'GOLD' }: { defaultInstrument?: string }) {
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
  const [briefEdge, setBriefEdge] = useState<{ edge: string; title: string; urlSlug: string; date: string } | null>(null)
  const [copied,    setCopied]    = useState(false)
  // Cross-instrument chain data for My Strategies P&L
  const allChainDataRef = useRef<Record<string, ChainData>>({})

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
      if (!chainRes.ok) throw new Error('Failed to load options chain')
      const chainJson = await chainRes.json()
      setChainData(chainJson)
      allChainDataRef.current[inst] = chainJson
      setLastFetchedAt(new Date())
      if (!preserveLegs) setLegs([])
      if (ivRes.ok) {
        const ivJson = await ivRes.json()
        setIvHistory(ivJson.history ?? [])
      }
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

  // Fetch cross-instrument chains for My Strategies P&L when tab switches to saved
  useEffect(() => {
    if (tab !== 'saved' || saved.length === 0) return
    const needed = [...new Set(saved.map(s => s.instrument))].filter(
      inst => inst !== instrument && !allChainDataRef.current[inst],
    )
    needed.forEach(inst => {
      fetch(`/api/options?instrument=${inst}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) allChainDataRef.current[inst] = data })
        .catch(() => {/* silent */})
    })
  }, [tab, saved, instrument])

  // Compute live P&L for saved strategies using allChainDataRef
  useEffect(() => {
    if (saved.length === 0) return
    const pnls: Record<string, number | null> = {}
    for (const s of saved) {
      if (new Date(s.expiry) < new Date()) { pnls[s.id] = null; continue }
      const cd = allChainDataRef.current[s.instrument] ?? (s.instrument === instrument ? chainData : null)
      if (!cd) { pnls[s.id] = null; continue }
      const ls = MCX_INSTRUMENTS[s.instrument]?.lotSize ?? 1
      const currentPnl = s.legs.reduce((sum, leg) => {
        const row = cd.chain.find(r => r.strike === leg.strike)
        if (!row) return sum
        const currentPremium = row[leg.type].ltp
        const sign = leg.action === 'BUY' ? 1 : -1
        return sum + sign * leg.qty * ls * (currentPremium - leg.premium)
      }, 0)
      pnls[s.id] = currentPnl
    }
    setSavedPnls(pnls)
  }, [saved, chainData, instrument])

  // Payoff chart data — "today" line uses current live IV
  const fRange      = futurePrice > 0 ? buildFRange(futurePrice, payoffWidth) : []
  const payoff: PayoffPoint[] = legs.length > 0 && futurePrice > 0
    ? computePayoff(legs, fRange, lotSize, T, r, currentIV > 0 ? currentIV : undefined)
    : []

  const breakevens    = computeBreakevens(payoff)
  const maxProfitLoss = computeMaxProfitLoss(payoff)
  const pop = payoff.length > 0
    ? Math.round(payoff.filter(p => p.pnlExpiry >= 0).length / payoff.length * 100)
    : null
  const netGreeks     = legs.length > 0 && futurePrice > 0 && T > 0
    ? computeNetGreeks(legs, futurePrice, T, r, lotSize)
    : null
  const netCost    = computeNetCost(legs)
  const netCostINR = netCost * lotSize

  // P&L scenario table — pick 5 price points from payoff array
  const scenarios = (payoff.length > 0 && futurePrice > 0)
    ? [-0.10, -0.05, 0, 0.05, 0.10].map(pct => {
        const F   = futurePrice * (1 + pct)
        const idx = Math.round((pct + payoffWidth) / (2 * payoffWidth) * (PAYOFF_POINTS - 1))
        const pt  = payoff[Math.max(0, Math.min(PAYOFF_POINTS - 1, idx))]
        const pnlVal = pt?.pnlExpiry ?? 0
        const pnlPct = netCostINR !== 0 ? (pnlVal / Math.abs(netCostINR) * 100) : null
        return { label: `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)}%`, F, pnl: pnlVal, pnlPct, isATM: pct === 0 }
      })
    : []

  // Risk budget sizing
  const totalLots = legs.reduce((s, l) => s + l.qty, 0)
  const maxLossPerLot = (maxProfitLoss.maxLoss !== null && totalLots > 0)
    ? maxProfitLoss.maxLoss / totalLots
    : null
  const suggestedLots = (riskBudget && maxLossPerLot !== null && maxLossPerLot < 0)
    ? Math.max(1, Math.ceil(Number(riskBudget) / Math.abs(maxLossPerLot)))
    : null

  const chartData = payoff.map(p => ({
    F:      Math.round(p.F),
    Expiry: Math.round(p.pnlExpiry),
    Today:  T > 0 ? Math.round(p.pnlToday) : undefined,
  }))

  // Extra time-horizon lines (only when > 21 DTE)
  const dte = expiry ? daysToExpiry(expiry) : 0
  const payoff2wk: PayoffPoint[] = (dte > 21 && legs.length > 0 && futurePrice > 0)
    ? computePayoff(legs, fRange, lotSize, Math.max(0, T - 14 / 365), r, currentIV > 0 ? currentIV : undefined)
    : []
  const payoff1wk: PayoffPoint[] = (dte > 21 && legs.length > 0 && futurePrice > 0)
    ? computePayoff(legs, fRange, lotSize, Math.max(0, T - 7 / 365), r, currentIV > 0 ? currentIV : undefined)
    : []

  const chartDataFull = chartData.map((pt, i) => ({
    ...pt,
    TwoWeeks: payoff2wk[i] != null ? Math.round(payoff2wk[i].pnlToday) : undefined,
    OneWeek:  payoff1wk[i] != null ? Math.round(payoff1wk[i].pnlToday) : undefined,
  }))

  function addLeg(row: ChainRow, type: 'CE' | 'PE', action: 'BUY' | 'SELL') {
    const side = row[type]
    if (side.ltp <= 0) return
    setLegs(prev => [
      ...prev,
      { strike: row.strike, type, action, qty: 1, premium: side.ltp, iv: (side.iv ?? currentIV) / 100 },
    ])
  }

  function removeLeg(idx: number) {
    setLegs(prev => prev.filter((_, i) => i !== idx))
  }

  function updateQty(idx: number, qty: number) {
    setLegs(prev => prev.map((l, i) => i === idx ? { ...l, qty: Math.max(1, qty) } : l))
  }

  function applyAllQty(qty: number) {
    setLegs(prev => prev.map(l => ({ ...l, qty: Math.max(1, qty) })))
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
    CHEAP:  '#22c55e',
    NORMAL: '#eab308',
    RICH:   '#ef4444',
  }

  const circuitLimit = CIRCUIT_LIMITS[instrument] ?? 0.06

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Link href="/options" style={{ color: '#6b7280', fontSize: 14, textDecoration: 'none', lineHeight: 1 }}
            title="Back to Option Chain">
            ← Options
          </Link>
          <h1 className="sb-title" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>MCX Options Strategy Builder</h1>
        </div>
        <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
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
              cursor: 'pointer', fontSize: 13, fontWeight: instrument === inst.key ? 700 : 400,
              borderColor: instrument === inst.key ? '#6366f1' : '#d1d5db',
              background: instrument === inst.key ? '#6366f1' : 'transparent',
              color: instrument === inst.key ? '#fff' : 'inherit',
            }}>
            {inst.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>
          {error} — check that Kite credentials are configured.
        </div>
      )}

      {loading && <div style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Loading chain…</div>}

      {/* IV Regime Banner */}
      {ivRegime && (
        <div style={{
          background: '#f9fafb', border: `1px solid ${regimeColors[ivRegime.regime]}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{
            background: regimeColors[ivRegime.regime], color: '#fff',
            borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 12,
          }}>
            {ivRegime.regime}
          </div>
          <div style={{ fontSize: 14 }}>
            <strong>IV {ivRegime.currentIV.toFixed(1)}%</strong>
            {' — '}{ivRegime.label}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            IV Rank {ivRegime.ivRank}
          </div>
        </div>
      )}

      {/* Quick Setup — all templates, no IV-based filtering */}
      {chainData && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quick Setup</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { id: 'ATM_STRADDLE',     name: 'ATM Straddle'      },
              { id: 'OTM_STRANGLE',     name: 'OTM Strangle'      },
              { id: 'LONG_CALL',        name: 'Long Call'          },
              { id: 'LONG_PUT',         name: 'Long Put'           },
              { id: 'BULL_CALL_SPREAD', name: 'Bull Call Spread'   },
              { id: 'BEAR_PUT_SPREAD',  name: 'Bear Put Spread'    },
              { id: 'IRON_CONDOR',      name: 'Iron Condor'        },
              { id: 'BULL_PUT_SPREAD',  name: 'Bull Put Spread'    },
              { id: 'BEAR_CALL_SPREAD', name: 'Bear Call Spread'   },
            ] as { id: TemplateId; name: string }[]).map(t => (
              <button key={t.id} onClick={() => loadTemplate(t.id)}
                style={{
                  padding: '5px 10px', borderRadius: 5, border: '1px solid #d1d5db',
                  background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500,
                }}>
                {t.name}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
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
              fontWeight: tab === t ? 600 : 400, fontSize: 14,
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t ? '#4f46e5' : '#6b7280', marginBottom: -1,
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
            <span style={{ fontSize: 13, color: '#6b7280' }}>Expiry:</span>
            <select value={expiry}
              onChange={e => { fetchData(instrument, e.target.value); setLegs([]) }}
              style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 13 }}>
              {expiries.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
              Futures: <strong>₹{fmt(futurePrice)}</strong>
            </span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              · Lot: <strong>{lotSize}</strong>
            </span>
            <button
              onClick={() => fetchData(instrument, expiry, true)}
              style={{
                marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 5,
                border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', color: '#6b7280',
              }}>
              ↺ Refresh
            </button>
            {lastFetchedAt && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {secondsAgo < 60 ? `${secondsAgo}s ago` : `${Math.round(secondsAgo / 60)}m ago`}
              </span>
            )}
          </div>

          {/* Today's Edge of Day from the morning brief */}
          {briefEdge && (
            <div style={{ margin: '0 0 14px', padding: '10px 14px', background: '#FFFBF0', border: '0.5px solid rgba(181,134,42,0.3)', borderRadius: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8720A', fontWeight: 700 }}>
                  Today&apos;s Edge
                </span>
                <a href={`/briefs/${briefEdge.urlSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#9ca3af', textDecoration: 'none', letterSpacing: '0.04em' }}>
                  {briefEdge.date} →
                </a>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#48483A', lineHeight: 1.55 }}>{briefEdge.edge}</p>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      <th className="sb-hide-mobile" style={{ padding: '6px 6px', textAlign: 'right' }}>CE OI</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE IV%</th>
                      <th className="sb-hide-mobile" style={{ padding: '6px 6px', textAlign: 'right' }}>CE Δ</th>
                      <th style={{ padding: '6px 6px', textAlign: 'right' }}>CE LTP</th>
                      <th style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 700 }}>Strike</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE LTP</th>
                      <th className="sb-hide-mobile" style={{ padding: '6px 6px', textAlign: 'left' }}>PE Δ</th>
                      <th style={{ padding: '6px 6px', textAlign: 'left' }}>PE IV%</th>
                      <th className="sb-hide-mobile" style={{ padding: '6px 6px', textAlign: 'left' }}>PE OI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(row => (
                      <tr key={row.strike}
                        style={{
                          background: row.isATM ? '#eef2ff' : 'transparent',
                          borderBottom: '1px solid #f3f4f6',
                        }}>
                        {/* CE OI */}
                        <td className="sb-hide-mobile" style={{ padding: '5px 6px', textAlign: 'right', color: '#9ca3af', fontSize: 11 }}>
                          {fmtOI(row.CE.oi)}
                        </td>
                        {/* CE IV */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.iv != null ? row.CE.iv.toFixed(1) : '—'}
                        </td>
                        {/* CE Delta */}
                        <td className="sb-hide-mobile" style={{ padding: '5px 6px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.delta != null ? row.CE.delta.toFixed(2) : '—'}
                        </td>
                        {/* CE LTP + B/S */}
                        <td style={{ padding: '5px 6px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700 }}>{row.CE.ltp > 0 ? fmt(row.CE.ltp) : '—'}</span>
                          {row.CE.ltp > 0 && (
                            <span style={{ marginLeft: 4, display: 'inline-flex', gap: 2 }}>
                              <button className="sb-bs-btn" onClick={() => addLeg(row, 'CE', 'BUY')}
                                style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #16a34a',
                                  color: '#15803d', background: '#dcfce7', cursor: 'pointer', lineHeight: 1.4 }}>B</button>
                              <button className="sb-bs-btn" onClick={() => addLeg(row, 'CE', 'SELL')}
                                style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #dc2626',
                                  color: '#b91c1c', background: '#fee2e2', cursor: 'pointer', lineHeight: 1.4 }}>S</button>
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
                              <button className="sb-bs-btn" onClick={() => addLeg(row, 'PE', 'BUY')}
                                style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #16a34a',
                                  color: '#15803d', background: '#dcfce7', cursor: 'pointer', lineHeight: 1.4 }}>B</button>
                              <button className="sb-bs-btn" onClick={() => addLeg(row, 'PE', 'SELL')}
                                style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #dc2626',
                                  color: '#b91c1c', background: '#fee2e2', cursor: 'pointer', lineHeight: 1.4 }}>S</button>
                            </span>
                          )}
                          <span style={{ fontWeight: 700 }}>{row.PE.ltp > 0 ? fmt(row.PE.ltp) : '—'}</span>
                        </td>
                        {/* PE Delta */}
                        <td className="sb-hide-mobile" style={{ padding: '5px 6px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.delta != null ? row.PE.delta.toFixed(2) : '—'}
                        </td>
                        {/* PE IV */}
                        <td style={{ padding: '5px 6px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.iv != null ? row.PE.iv.toFixed(1) : '—'}
                        </td>
                        {/* PE OI */}
                        <td className="sb-hide-mobile" style={{ padding: '5px 6px', textAlign: 'left', color: '#9ca3af', fontSize: 11 }}>
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
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Selected Legs</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Action</th>
                    <th style={{ padding: '5px 8px', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Strike</th>
                    <th style={{ padding: '5px 8px', textAlign: 'right' }}>Entry</th>
                    <th className="sb-hide-mobile" style={{ padding: '5px 8px', textAlign: 'right' }}>IV%</th>
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
                            padding: '2px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer', fontSize: 11,
                            background: leg.action === 'BUY' ? '#dcfce7' : '#fee2e2',
                            borderColor: leg.action === 'BUY' ? '#16a34a' : '#dc2626',
                            color: leg.action === 'BUY' ? '#15803d' : '#b91c1c', fontWeight: 600,
                          }}>
                          {leg.action}
                        </button>
                      </td>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: leg.type === 'CE' ? '#4f46e5' : '#dc2626' }}>
                        {leg.type}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(leg.strike)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>₹{fmt(leg.premium)}</td>
                      <td className="sb-hide-mobile" style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>
                        {(leg.iv * 100).toFixed(1)}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <input type="number" min={1} max={100} value={leg.qty}
                          onChange={e => updateQty(i, parseInt(e.target.value) || 1)}
                          style={{ width: 48, padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, textAlign: 'right' }} />
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <button onClick={() => removeLeg(i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
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
          {chartDataFull.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Payoff Diagram</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartDataFull} margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
                  <XAxis dataKey="F" tickFormatter={(v: number) => {
                    const n = Number(v)
                    if (futurePrice >= 10000) return `₹${Math.round(n / 1000)}K`
                    if (futurePrice >= 1000)  return `₹${(n / 1000).toFixed(1)}K`
                    return `₹${Math.round(n)}`
                  }} tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={7} />
                  <YAxis tickFormatter={v => fmtPnlAxis(Number(v))} tick={{ fontSize: 10 }} width={68} />
                  <Tooltip
                    formatter={(v, name) => [`₹${fmt(Number(v))}`, String(name)]}
                    labelFormatter={v => `P = ₹${fmt(Number(v))}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                  {/* Current price reference */}
                  {futurePrice > 0 && (
                    <ReferenceLine x={futurePrice} stroke="#94a3b8" strokeDasharray="2 3" strokeWidth={1} />
                  )}
                  {/* Breakeven lines — no label; values shown in stats below */}
                  {breakevens.map((be, i) => (
                    <ReferenceLine key={i} x={Math.round(be)} stroke="#f97316" strokeDasharray="4 2" strokeWidth={1.5} />
                  ))}
                  <Line type="monotone" dataKey="Expiry" stroke="#6366f1" dot={false} strokeWidth={2} name="At Expiry" />
                  {T > 0 && <Line type="monotone" dataKey="Today" stroke="#22c55e" dot={false} strokeWidth={1.5}
                    strokeDasharray="5 3" name={`Today (${Math.round(dte)}d left)`} />}
                  {payoff2wk.length > 0 && <Line type="monotone" dataKey="TwoWeeks" stroke="#f59e0b" dot={false} strokeWidth={1}
                    strokeDasharray="4 4" name="−2 wks" />}
                  {payoff1wk.length > 0 && <Line type="monotone" dataKey="OneWeek" stroke="#fb923c" dot={false} strokeWidth={1}
                    strokeDasharray="2 4" name="−1 week" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* P&L Scenario Table */}
          {scenarios.length > 0 && (
            <div style={{ marginBottom: 16, overflowX: 'auto' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>P&amp;L Scenarios at Expiry</div>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 340 }}>
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
                      <td style={{ padding: '5px 12px', textAlign: 'right', color: s.pnl >= 0 ? '#16a34a' : '#dc2626' }}>
                        {s.pnl >= 0 ? '+' : ''}₹{fmt(Math.abs(Math.round(s.pnl)))}
                      </td>
                      {s.pnlPct !== null && (
                        <td style={{ padding: '5px 12px', textAlign: 'right', color: s.pnlPct >= 0 ? '#16a34a' : '#dc2626' }}>
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
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
              {[
                {
                  label: netCostINR >= 0 ? 'Net Debit' : 'Net Credit',
                  value: `₹${fmt(Math.abs(netCostINR))}`,
                  sub:   `per 1 lot (×${lotSize})`,
                  color: 'inherit',
                },
                {
                  label: 'Max Profit',
                  value: fmtPnl(maxProfitLoss.maxProfit),
                  sub: '',
                  color: maxProfitLoss.maxProfit != null && maxProfitLoss.maxProfit > 0 ? '#16a34a' : 'inherit',
                },
                {
                  label: 'Max Loss',
                  value: fmtPnl(maxProfitLoss.maxLoss),
                  sub: '',
                  color: maxProfitLoss.maxLoss != null && maxProfitLoss.maxLoss < 0 ? '#dc2626' : 'inherit',
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
                  color: pop >= 50 ? '#16a34a' : '#6b7280',
                }] : []),
              ].map(s => (
                <div key={s.label}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', minWidth: 120 }}>
                  <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontWeight: 700, color: s.color }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Risk budget sizing */}
          {maxLossPerLot !== null && maxLossPerLot < 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Risk budget ₹</span>
              <input
                type="number" min={0} placeholder="e.g. 50000"
                value={riskBudget}
                onChange={e => setRiskBudget(e.target.value)}
                style={{ width: 110, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12 }}
              />
              {suggestedLots !== null && (
                <>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>→ <strong>{suggestedLots} lot{suggestedLots !== 1 ? 's' : ''}</strong></span>
                  <button
                    onClick={() => applyAllQty(suggestedLots)}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 5, border: '1px solid #6366f1',
                      background: '#6366f1', color: '#fff', cursor: 'pointer' }}>
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
                className="sb-label-input"
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, minWidth: 200, flex: '1 1 auto' }}
              />
              <button onClick={saveStrategy}
                style={{
                  padding: '8px 20px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                Save →
              </button>
              <button onClick={() => setLegs([])}
                style={{
                  padding: '8px 16px', background: 'none', color: '#6b7280',
                  border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}>
                Clear
              </button>
              <button onClick={copyShareUrl}
                style={{
                  padding: '8px 16px', background: 'none',
                  color: copied ? '#16a34a' : '#6b7280',
                  border: `1px solid ${copied ? '#16a34a' : '#d1d5db'}`,
                  borderRadius: 6, cursor: 'pointer', fontSize: 13,
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
            <div style={{ color: '#6b7280', fontSize: 14, padding: '24px 0' }}>
              No saved strategies yet. Build one and click &ldquo;Save →&rdquo;
            </div>
          )}
          {saved.map(s => {
            const expired  = new Date(s.expiry) < new Date()
            const livePnl  = savedPnls[s.id]
            const pnlColor = livePnl == null ? '#6b7280' : livePnl >= 0 ? '#16a34a' : '#dc2626'
            const entryTotal = s.legs.reduce((sum, l) => sum + l.qty * (MCX_INSTRUMENTS[s.instrument]?.lotSize ?? 1) * l.premium * (l.action === 'BUY' ? 1 : -1), 0)
            return (
              <div key={s.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
                  marginBottom: 12, background: expired ? '#f9fafb' : '#fff',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {s.label ?? (MCX_INSTRUMENTS[s.instrument]?.label ?? s.instrument)}
                      {' '}
                      <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>
                        expiry {s.expiry}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Entry {new Date(s.entryDate).toLocaleDateString('en-IN')} · F₀ ₹{fmt(s.entryFutures)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      {s.legs.map((leg, i) => (
                        <span key={i} style={{
                          marginRight: 6, padding: '1px 6px', borderRadius: 4,
                          background: leg.action === 'BUY' ? '#dcfce7' : '#fee2e2',
                          color: leg.action === 'BUY' ? '#15803d' : '#b91c1c',
                        }}>
                          {leg.action} {leg.qty}× {leg.type} {fmt(leg.strike)} @ {fmt(leg.premium)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    {expired
                      ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Expired</div>
                      : livePnl != null
                        ? (
                          <div>
                            <div style={{ fontWeight: 700, color: pnlColor, fontSize: 15 }}>
                              {livePnl >= 0 ? '+' : ''}₹{fmt(livePnl)}
                            </div>
                            {entryTotal !== 0 && (
                              <div style={{ fontSize: 11, color: pnlColor }}>
                                {(livePnl / Math.abs(entryTotal) * 100).toFixed(1)}%
                              </div>
                            )}
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>live P&L</div>
                          </div>
                        )
                        : <div style={{ fontSize: 12, color: '#9ca3af' }}>loading…</div>
                    }
                    <button onClick={() => deleteSaved(s.id)}
                      style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 11 }}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SEBI Disclaimer */}
      <div style={{
        marginTop: 32, padding: '10px 14px',
        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6,
        fontSize: 11, color: '#9ca3af', lineHeight: 1.5,
      }}>
        <strong>Disclaimer:</strong> This tool is for educational and informational purposes only. It does not constitute investment advice or a recommendation to buy or sell any securities or commodity contracts. BhaavBrief is not a SEBI-registered Investment Adviser or Research Analyst. Option pricing shown is a mathematical model output — actual market prices may differ. Trading commodity derivatives involves substantial risk of loss.
      </div>

      <style>{`
        @media (max-width: 620px) {
          .sb-hide-mobile { display: none !important; }
          .sb-bs-btn { padding: 4px 8px !important; font-size: 12px !important; }
          .sb-title { font-size: 17px !important; }
          .sb-label-input { min-width: 0 !important; flex: 1 1 auto !important; }
        }
      `}</style>
    </div>
  )
}

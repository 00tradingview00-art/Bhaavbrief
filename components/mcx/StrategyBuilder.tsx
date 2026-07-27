'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ltp:   number
  iv:    number | null  // percentage e.g. 24.5
  delta: number | null
  gamma: number | null
  theta: number | null
  vega:  number | null
  tier:  'LIVE' | 'STALE' | 'JUNK'
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

const PAYOFF_POINTS = 101
const PAYOFF_WIDTH  = 0.15  // ±15% of ATM
const LS_KEY = 'bhaavbrief_strategies'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
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

function buildFRange(futurePrice: number): number[] {
  return Array.from(
    { length: PAYOFF_POINTS },
    (_, i) => futurePrice * (1 - PAYOFF_WIDTH) + (i / (PAYOFF_POINTS - 1)) * futurePrice * 2 * PAYOFF_WIDTH,
  )
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

export default function StrategyBuilder() {
  const [instrument,  setInstrument]  = useState('GOLD')
  const [chainData,   setChainData]   = useState<ChainData | null>(null)
  const [ivHistory,   setIvHistory]   = useState<{ date: string; iv: number }[]>([])
  const [legs,        setLegs]        = useState<Leg[]>([])
  const [tab,         setTab]         = useState<'build' | 'saved'>('build')
  const [saved,       setSaved]       = useState<SavedStrategy[]>([])
  const [savedPnls,   setSavedPnls]   = useState<Record<string, number | null>>({})
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const lotSize    = MCX_INSTRUMENTS[instrument]?.lotSize ?? 1
  const expiry     = chainData?.expiry ?? ''
  const expiries   = chainData?.expiries ?? []
  const chain      = chainData?.chain ?? []
  const futurePrice = chainData?.futurePrice ?? 0
  const r          = chainData?.riskFreeRate ?? 0.065
  const T          = expiry ? daysToExpiry(expiry) / 365 : 0

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

  // Fetch chain + IV history when instrument changes
  const fetchData = useCallback(async (inst: string, exp?: string) => {
    setLoading(true)
    setError(null)
    try {
      const chainUrl = `/api/options?instrument=${inst}${exp ? `&expiry=${exp}` : ''}`
      const ivUrl    = `/api/options/iv-history?instrument=${inst}`
      const [chainRes, ivRes] = await Promise.all([fetch(chainUrl), fetch(ivUrl)])
      if (!chainRes.ok) throw new Error('Failed to load options chain')
      const chainJson = await chainRes.json()
      setChainData(chainJson)
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

  // Load saved strategies from localStorage on mount
  useEffect(() => { setSaved(loadSaved()) }, [])

  // Compute live P&L for saved strategies
  useEffect(() => {
    if (saved.length === 0 || !chainData) return
    const pnls: Record<string, number | null> = {}
    for (const s of saved) {
      if (s.instrument !== instrument) { pnls[s.id] = null; continue }
      if (new Date(s.expiry) < new Date()) { pnls[s.id] = null; continue }
      const currentPnl = s.legs.reduce((sum, leg) => {
        const row = chainData.chain.find(r => r.strike === leg.strike)
        if (!row) return sum
        const currentPremium = row[leg.type].ltp
        const sign = leg.action === 'BUY' ? 1 : -1
        return sum + sign * leg.qty * lotSize * (currentPremium - leg.premium)
      }, 0)
      pnls[s.id] = currentPnl
    }
    setSavedPnls(pnls)
  }, [saved, chainData, instrument, lotSize])

  // Payoff chart data
  const fRange    = futurePrice > 0 ? buildFRange(futurePrice) : []
  const payoff: PayoffPoint[] = legs.length > 0 && futurePrice > 0
    ? computePayoff(legs, fRange, lotSize, T, r)
    : []

  const breakevens  = computeBreakevens(payoff)
  const maxProfitLoss = computeMaxProfitLoss(payoff)
  const netGreeks   = legs.length > 0 && futurePrice > 0 && T > 0
    ? computeNetGreeks(legs, futurePrice, T, r, lotSize)
    : null
  const netCost     = computeNetCost(legs)
  const netCostINR  = netCost * lotSize

  const chartData = payoff.map(p => ({
    F:       Math.round(p.F),
    Expiry:  Math.round(p.pnlExpiry),
    Today:   T > 0 ? Math.round(p.pnlToday) : undefined,
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

  function toggleAction(idx: number) {
    setLegs(prev => prev.map((l, i) => i === idx ? { ...l, action: l.action === 'BUY' ? 'SELL' : 'BUY' } : l))
  }

  function loadTemplate(templateId: TemplateId) {
    const newLegs = buildTemplateLegs(templateId, chain, futurePrice, currentIV || 0)
    if (newLegs.length > 0) setLegs(newLegs)
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
    }
    const updated = [strategy, ...saved]
    setSaved(updated)
    persistSaved(updated)
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
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>MCX Options Strategy Builder</h1>
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
            Or click LTP cells in the chain below to add legs manually
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
          {/* Expiry selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Expiry:</span>
            <select value={expiry}
              onChange={e => { fetchData(instrument, e.target.value); setLegs([]) }}
              style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #d1d5db', fontSize: 13 }}>
              {expiries.map(ex => <option key={ex} value={ex}>{ex}</option>)}
            </select>
            <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>
              Futures: <strong>₹{fmt(futurePrice)}</strong>
            </span>
          </div>

          {/* Mini chain — ±5 strikes around ATM */}
          {(() => {
            let atmIdx = chain.findIndex(r => r.isATM)
            // Safety net: isATM may be missing in stale/partial responses; find nearest strike
            if (atmIdx === -1 && futurePrice > 0 && chain.length > 0) {
              atmIdx = chain.reduce(
                (best, row, i) =>
                  Math.abs(row.strike - futurePrice) < Math.abs(chain[best].strike - futurePrice) ? i : best,
                0,
              )
            }
            const start  = Math.max(0, atmIdx - 5)
            const end    = Math.min(chain.length - 1, atmIdx + 5)
            const visible = chain.slice(start, end + 1)
            return (
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>CE IV%</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>CE LTP</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>CE Delta</th>
                      <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>Strike</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>PE Delta</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>PE LTP</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>PE IV%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(row => (
                      <tr key={row.strike}
                        style={{
                          background: row.isATM ? '#eef2ff' : 'transparent',
                          borderBottom: '1px solid #f3f4f6',
                        }}>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.iv != null ? row.CE.iv.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                          <span
                            title="Click: BUY CE | Shift+click: SELL CE"
                            style={{ cursor: 'pointer', fontWeight: 700, textDecoration: 'underline dotted' }}
                            onClick={e => addLeg(row, 'CE', e.shiftKey ? 'SELL' : 'BUY')}>
                            {row.CE.ltp > 0 ? fmt(row.CE.ltp) : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>
                          {row.CE.delta != null ? row.CE.delta.toFixed(2) : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: row.isATM ? 700 : 400 }}>
                          {fmt(row.strike)}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.delta != null ? row.PE.delta.toFixed(2) : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'left' }}>
                          <span
                            title="Click: BUY PE | Shift+click: SELL PE"
                            style={{ cursor: 'pointer', fontWeight: 700, textDecoration: 'underline dotted' }}
                            onClick={e => addLeg(row, 'PE', e.shiftKey ? 'SELL' : 'BUY')}>
                            {row.PE.ltp > 0 ? fmt(row.PE.ltp) : '—'}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'left', color: '#6b7280' }}>
                          {row.PE.iv != null ? row.PE.iv.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Click LTP to add BUY leg · Shift+click to add SELL leg
                </div>
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
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>
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

          {/* Net Greeks */}
          {netGreeks && legs.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 12 }}>
              {[
                { label: 'Net Delta', value: fmtGreek(netGreeks.delta, 2) },
                { label: 'Net Gamma', value: fmtGreek(netGreeks.gamma, 4) },
                { label: 'Net Theta/day', value: `₹${fmtGreek(netGreeks.theta, 0)}` },
                { label: 'Net Vega/1%', value: `₹${fmtGreek(netGreeks.vega, 0)}` },
              ].map(g => (
                <div key={g.label}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 12px' }}>
                  <div style={{ color: '#6b7280', marginBottom: 2 }}>{g.label}</div>
                  <div style={{ fontWeight: 700 }}>{g.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Payoff chart */}
          {chartData.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Payoff Diagram</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 10 }}>
                  <XAxis dataKey="F" tickFormatter={v => `₹${Math.round(Number(v) / 1000)}K`} tick={{ fontSize: 10 }} interval="preserveStartEnd" tickCount={7} />
                  <YAxis tickFormatter={v => fmtPnlAxis(Number(v))} tick={{ fontSize: 10 }} width={68} />
                  <Tooltip
                    formatter={(v, name) => [`₹${fmt(Number(v))}`, String(name)]}
                    labelFormatter={v => `P = ₹${fmt(Number(v))}`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                  {breakevens.map((be, i) => (
                    <ReferenceLine key={i} x={Math.round(be)} stroke="#f59e0b"
                      strokeDasharray="4 2" label={{ value: `BE ${fmt(Math.round(be))}`, fontSize: 10, fill: '#f59e0b' }} />
                  ))}
                  <Line type="monotone" dataKey="Expiry" stroke="#6366f1" dot={false} strokeWidth={2} name="At Expiry" />
                  {T > 0 && <Line type="monotone" dataKey="Today" stroke="#22c55e" dot={false} strokeWidth={1.5}
                    strokeDasharray="5 3" name={`Today (${Math.round(daysToExpiry(expiry))}d left)`} />}
                </LineChart>
              </ResponsiveContainer>
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
                },
                { label: 'Max Profit', value: fmtPnl(maxProfitLoss.maxProfit), sub: '' },
                { label: 'Max Loss',   value: fmtPnl(maxProfitLoss.maxLoss),   sub: '' },
                {
                  label: 'Breakeven(s)',
                  value: breakevens.length > 0 ? breakevens.map(be => `₹${fmt(Math.round(be))}`).join(' / ') : '—',
                  sub: '',
                },
              ].map(s => (
                <div key={s.label}
                  style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 14px', minWidth: 120 }}>
                  <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontWeight: 700 }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Save button */}
          {legs.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <button onClick={saveStrategy}
                style={{
                  padding: '8px 20px', background: '#6366f1', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>
                Save Strategy →
              </button>
              <button onClick={() => setLegs([])}
                style={{
                  marginLeft: 8, padding: '8px 16px', background: 'none', color: '#6b7280',
                  border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                }}>
                Clear
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
              No saved strategies yet. Build one and click &ldquo;Save Strategy →&rdquo;
            </div>
          )}
          {saved.map(s => {
            const expired = new Date(s.expiry) < new Date()
            const livePnl = savedPnls[s.id]
            const pnlColor = livePnl == null ? '#6b7280' : livePnl >= 0 ? '#16a34a' : '#dc2626'
            return (
              <div key={s.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px',
                  marginBottom: 12, background: expired ? '#f9fafb' : '#fff',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {MCX_INSTRUMENTS[s.instrument]?.label ?? s.instrument}
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
                  <div style={{ textAlign: 'right' }}>
                    {expired
                      ? <div style={{ color: '#9ca3af', fontSize: 12 }}>Expired</div>
                      : livePnl != null && s.instrument === instrument
                        ? (
                          <div>
                            <div style={{ fontWeight: 700, color: pnlColor, fontSize: 15 }}>
                              {livePnl >= 0 ? '+' : ''}₹{fmt(livePnl)}
                            </div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>live P&L</div>
                          </div>
                        )
                        : <div style={{ fontSize: 12, color: '#9ca3af' }}>select instrument to see P&L</div>
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
    </div>
  )
}

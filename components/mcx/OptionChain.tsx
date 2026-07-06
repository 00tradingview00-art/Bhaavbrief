'use client'

import { useState, useEffect, useCallback } from 'react'

const RISK_FREE_RATE = 0.065

const INSTRUMENTS = [
  { key: 'GOLD',        label: 'Gold',        unit: '10g'   },
  { key: 'SILVER',      label: 'Silver',       unit: '1kg'   },
  { key: 'CRUDEOIL',    label: 'Crude Oil',    unit: 'bbl'   },
  { key: 'NATURALGAS',  label: 'Natural Gas',  unit: 'mmBtu' },
  { key: 'COPPER',      label: 'Copper',       unit: 'kg'    },
]

const GREEK_COLS = ['iv', 'delta', 'theta', 'vega'] as const
type GreekKey = typeof GREEK_COLS[number]

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionSide {
  symbol:   string | null
  ltp:      number
  oi:       number
  oiChange: number
  volume:   number
  iv:       number | null
  delta:    number | null
  gamma:    number | null
  theta:    number | null
  vega:     number | null
}

interface ChainRow {
  strike:   number
  isATM:    boolean
  isITM_CE: boolean
  isITM_PE: boolean
  CE:       OptionSide
  PE:       OptionSide
}

interface AAVResult {
  '5d':  number | null
  '10d': number | null
  '20d': number | null
  '40d': number | null
  '60d': number | null
}

interface OptionsData {
  instrument:  string
  expiry:      string
  expiries:    string[]
  futurePrice: number
  maxPain:     number
  pcr:         number
  ivix:        number | null
  aav:         AAVResult
  volPremium:  number | null
  marketOpen:  boolean
  chain:       ChainRow[]
  lastUpdated: string
  fromCache:   boolean
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtOI(n: number): string {
  if (!n) return '—'
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OIBar({ oi, maxOI, side }: { oi: number; maxOI: number; side: 'CE' | 'PE' }) {
  const pct = maxOI > 0 ? Math.min((oi / maxOI) * 100, 100) : 0
  return (
    <div className="relative h-1 w-full bg-gray-800 rounded overflow-hidden mt-1">
      <div
        className={`absolute top-0 h-full rounded ${side === 'CE' ? 'bg-red-500 left-0' : 'bg-green-500 right-0'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function PCRBadge({ pcr }: { pcr: number }) {
  const label = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral'
  const color  = pcr > 1.2
    ? 'text-green-400 border-green-700'
    : pcr < 0.8
    ? 'text-red-400 border-red-700'
    : 'text-yellow-400 border-yellow-700'
  return (
    <span className={`text-xs border px-2 py-0.5 rounded-full font-mono ${color}`}>
      PCR {pcr} · {label}
    </span>
  )
}

function SampleChainPreview() {
  const rows = [74000, 74500, 75000, 75500, 76000]
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-gray-500 border-b border-gray-800">
          <th className="px-2 py-2 text-right">CE OI</th>
          <th className="px-2 py-2 text-right text-red-400">CE LTP</th>
          <th className="px-3 py-2 text-center">Strike</th>
          <th className="px-2 py-2 text-left text-green-400">PE LTP</th>
          <th className="px-2 py-2 text-left">PE OI</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(s => (
          <tr key={s} className={s === 75000 ? 'bg-amber-950/40' : ''}>
            <td className="px-2 py-1.5 text-right text-gray-400">32K</td>
            <td className="px-2 py-1.5 text-right text-red-400">{s === 75000 ? '480' : s < 75000 ? '820' : '180'}</td>
            <td className={`px-3 py-1.5 text-center font-bold ${s === 75000 ? 'text-amber-400' : 'text-white'}`}>{s}</td>
            <td className="px-2 py-1.5 text-left text-green-400">{s === 75000 ? '460' : s > 75000 ? '780' : '160'}</td>
            <td className="px-2 py-1.5 text-left text-gray-400">28K</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  isPro: boolean
}

export default function OptionChain({ isPro }: Props) {
  const [instrument, setInstrument] = useState('GOLD')
  const [expiry, setExpiry]         = useState<string | null>(null)
  const [data, setData]             = useState<OptionsData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [showGreeks, setShowGreeks] = useState(false)
  const [showAAV, setShowAAV]       = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ instrument })
      if (expiry) params.set('expiry', expiry)
      const res = await fetch(`/api/options?${params}`)
      if (!res.ok) throw new Error((await res.json() as { error: string }).error)
      const json = await res.json() as OptionsData
      setData(json)
      setLastRefresh(new Date())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [instrument, expiry])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => { setExpiry(null) }, [instrument])

  if (!isPro) {
    return (
      <div className="relative select-none">
        <div className="blur-sm pointer-events-none opacity-60 overflow-hidden max-h-64">
          <SampleChainPreview />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl z-10">
          <div className="text-center px-6">
            <p className="text-2xl mb-2">🔒</p>
            <h3 className="text-white font-semibold text-lg mb-1">BhaavBrief Pro</h3>
            <p className="text-gray-400 text-sm mb-4">
              MCX Option Chain with live Greeks, iVIX, Max Pain & PCR
            </p>
            <a
              href="/pro"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold px-5 py-2 rounded-lg transition"
            >
              Upgrade to Pro →
            </a>
          </div>
        </div>
      </div>
    )
  }

  const maxCEOI = data ? Math.max(...data.chain.map(r => r.CE.oi)) : 1
  const maxPEOI = data ? Math.max(...data.chain.map(r => r.PE.oi)) : 1

  const volPremiumColor = data?.volPremium == null
    ? 'text-gray-400'
    : data.volPremium > 2
    ? 'text-amber-400'     // options expensive — IV > RV significantly
    : data.volPremium < -2
    ? 'text-green-400'     // options cheap
    : 'text-gray-300'

  return (
    <div className="font-mono text-sm text-gray-200 bg-gray-950 rounded-xl border border-gray-800 overflow-hidden">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex gap-1">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.key}
              onClick={() => setInstrument(inst.key)}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                instrument === inst.key
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {inst.label}
            </button>
          ))}
        </div>

        {data?.expiries && (
          <select
            value={expiry || data.expiry}
            onChange={e => setExpiry(e.target.value)}
            className="bg-gray-800 text-gray-200 text-xs rounded px-2 py-1 border border-gray-700"
          >
            {data.expiries.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setShowGreeks(g => !g)}
          className={`text-xs px-2 py-1 rounded border transition ${
            showGreeks ? 'border-amber-500 text-amber-400' : 'border-gray-700 text-gray-500 hover:text-gray-300'
          }`}
        >
          Greeks {showGreeks ? '▲' : '▼'}
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition"
        >
          {loading
            ? '↻ Loading...'
            : `↻ ${lastRefresh
                ? lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : 'Refresh'}`}
        </button>
      </div>

      {/* Analytics bar — primary */}
      {data && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-900/60 text-xs">
          <span className="text-gray-400">
            Futures: <span className="text-white font-semibold">₹{fmt(data.futurePrice)}</span>
          </span>
          <span className="text-gray-400">
            Max Pain: <span className="text-amber-400 font-semibold">₹{fmt(data.maxPain, 0)}</span>
          </span>
          <PCRBadge pcr={data.pcr} />

          {/* MCX iVIX */}
          {data.ivix != null && (
            <span className="text-gray-400">
              iVIX: <span className="text-purple-300 font-semibold">{data.ivix}</span>
            </span>
          )}

          {/* AAV 20d — expandable */}
          {data.aav['20d'] != null && (
            <button
              onClick={() => setShowAAV(v => !v)}
              className="text-gray-400 hover:text-gray-200 transition"
            >
              AAV(20d): <span className="text-blue-300 font-semibold">{data.aav['20d']}</span>
              <span className="ml-1 text-gray-600">{showAAV ? '▲' : '▼'}</span>
            </button>
          )}

          {/* Vol premium */}
          {data.volPremium != null && (
            <span className="text-gray-400">
              Vol Premium:{' '}
              <span className={`font-semibold ${volPremiumColor}`}>
                {data.volPremium > 0 ? '+' : ''}{data.volPremium}
              </span>
            </span>
          )}

          <span className={`text-xs ${data.marketOpen ? 'text-green-400' : 'text-red-400'}`}>
            ● {data.marketOpen ? 'Live' : 'Closed'}
          </span>
        </div>
      )}

      {/* AAV expanded row */}
      {data && showAAV && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-1.5 border-b border-gray-800 bg-gray-900/30 text-[11px]">
          <span className="text-gray-500 font-semibold">AAV →</span>
          {(['5d', '10d', '20d', '40d', '60d'] as const).map(w => (
            <span key={w} className="text-gray-400">
              {w}: <span className={`font-semibold ${w === '20d' ? 'text-blue-300' : 'text-gray-300'}`}>
                {data.aav[w] != null ? data.aav[w] : '—'}
              </span>
            </span>
          ))}
          <span className="text-gray-600 text-[10px] ml-auto">√252 annualization · MCX convention</span>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-red-400 text-xs">{error}</div>
      )}

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                {showGreeks && GREEK_COLS.map(g => (
                  <th key={`ce-${g}`} className="px-2 py-2 text-right text-[10px] uppercase">{g}</th>
                ))}
                <th className="px-2 py-2 text-right">CE Vol</th>
                <th className="px-2 py-2 text-right">CE OI</th>
                <th className="px-2 py-2 text-right text-red-400">CE LTP</th>
                <th className="px-3 py-2 text-center text-white">Strike</th>
                <th className="px-2 py-2 text-left text-green-400">PE LTP</th>
                <th className="px-2 py-2 text-left">PE OI</th>
                <th className="px-2 py-2 text-left">PE Vol</th>
                {showGreeks && GREEK_COLS.map(g => (
                  <th key={`pe-${g}`} className="px-2 py-2 text-left text-[10px] uppercase">{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.chain.map(row => {
                const isATM      = row.isATM
                const maxPainRow = row.strike === data.maxPain
                const rowBg      = isATM
                  ? 'bg-amber-950/40 border-y border-amber-800/40'
                  : maxPainRow
                  ? 'bg-indigo-950/30'
                  : ''

                const greekVal = (side: OptionSide, g: GreekKey): string => {
                  if (g === 'iv') return side.iv != null ? `${side.iv}%` : '—'
                  const v = side[g]
                  return v != null ? fmt(v, 3) : '—'
                }

                return (
                  <tr key={row.strike} className={`hover:bg-gray-800/40 transition ${rowBg}`}>
                    {showGreeks && GREEK_COLS.map(g => (
                      <td key={`ce-${g}`} className={`px-2 py-1.5 text-right text-gray-400 ${row.isITM_CE ? 'bg-red-950/20' : ''}`}>
                        {greekVal(row.CE, g)}
                      </td>
                    ))}

                    <td className={`px-2 py-1.5 text-right text-gray-400 ${row.isITM_CE ? 'bg-red-950/20' : ''}`}>
                      {fmtOI(row.CE.volume)}
                    </td>

                    <td className={`px-2 py-1.5 text-right ${row.isITM_CE ? 'bg-red-950/20' : ''}`}>
                      <div className="text-gray-300">{fmtOI(row.CE.oi)}</div>
                      <OIBar oi={row.CE.oi} maxOI={maxCEOI} side="CE" />
                    </td>

                    <td className={`px-2 py-1.5 text-right font-semibold text-red-400 ${row.isITM_CE ? 'bg-red-950/20' : ''}`}>
                      {row.CE.ltp > 0 ? fmt(row.CE.ltp) : '—'}
                    </td>

                    <td className={`px-3 py-1.5 text-center font-bold ${
                      isATM ? 'text-amber-400' : maxPainRow ? 'text-indigo-400' : 'text-white'
                    }`}>
                      {fmt(row.strike, 0)}
                      {isATM      && <span className="ml-1 text-[9px] text-amber-500">ATM</span>}
                      {maxPainRow && <span className="ml-1 text-[9px] text-indigo-400">MP</span>}
                    </td>

                    <td className={`px-2 py-1.5 text-left font-semibold text-green-400 ${row.isITM_PE ? 'bg-green-950/20' : ''}`}>
                      {row.PE.ltp > 0 ? fmt(row.PE.ltp) : '—'}
                    </td>

                    <td className={`px-2 py-1.5 text-left ${row.isITM_PE ? 'bg-green-950/20' : ''}`}>
                      <div className="text-gray-300">{fmtOI(row.PE.oi)}</div>
                      <OIBar oi={row.PE.oi} maxOI={maxPEOI} side="PE" />
                    </td>

                    <td className={`px-2 py-1.5 text-left text-gray-400 ${row.isITM_PE ? 'bg-green-950/20' : ''}`}>
                      {fmtOI(row.PE.volume)}
                    </td>

                    {showGreeks && GREEK_COLS.map(g => (
                      <td key={`pe-${g}`} className={`px-2 py-1.5 text-left text-gray-400 ${row.isITM_PE ? 'bg-green-950/20' : ''}`}>
                        {greekVal(row.PE, g)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-2 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between">
        <span>Black-76 model · {RISK_FREE_RATE * 100}% risk-free · 3-min refresh</span>
        <span>Source: Kite Connect · MCX</span>
      </div>
    </div>
  )
}

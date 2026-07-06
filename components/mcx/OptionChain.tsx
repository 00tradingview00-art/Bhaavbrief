'use client'

import { useState, useEffect, useCallback } from 'react'

const RISK_FREE_RATE = 0.065

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'       },
  { key: 'SILVER',     label: 'Silver'     },
  { key: 'CRUDEOIL',   label: 'Crude Oil'  },
  { key: 'NATURALGAS', label: 'Nat Gas'    },
  { key: 'COPPER',     label: 'Copper'     },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionSide {
  symbol: string | null; ltp: number; oi: number; oiChange: number
  volume: number; iv: number | null; delta: number | null
  gamma: number | null; theta: number | null; vega: number | null
}
interface ChainRow {
  strike: number; isATM: boolean; isITM_CE: boolean; isITM_PE: boolean
  CE: OptionSide; PE: OptionSide
}
interface AAVResult {
  '5d': number|null; '10d': number|null; '20d': number|null
  '40d': number|null; '60d': number|null
}
interface OptionsData {
  instrument: string; expiry: string; expiries: string[]
  futurePrice: number; maxPain: number; pcr: number
  ivix: number|null; aav: AAVResult; volPremium: number|null
  marketOpen: boolean; chain: ChainRow[]; lastUpdated: string
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtINR(n: number|null|undefined, dec = 0) {
  if (n == null || isNaN(n)) return '—'
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtNum(n: number|null|undefined, dec = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtOI(n: number) {
  if (!n) return '—'
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L'
  if (n >= 1000)   return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// ── OI bar ────────────────────────────────────────────────────────────────────

function OIBar({ oi, max, side }: { oi: number; max: number; side: 'CE'|'PE' }) {
  const pct = max > 0 ? Math.min((oi / max) * 100, 100) : 0
  return (
    <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginTop: 3, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%', borderRadius: 2,
        width: `${pct}%`,
        background: side === 'CE' ? '#ef4444' : '#22c55e',
        [side === 'CE' ? 'right' : 'left']: 0,
      }} />
    </div>
  )
}

// ── PCR badge ─────────────────────────────────────────────────────────────────

function PCRBadge({ pcr }: { pcr: number }) {
  const label = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral'
  const color = pcr > 1.2 ? '#22c55e' : pcr < 0.8 ? '#ef4444' : '#f59e0b'
  return (
    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, border: `1px solid ${color}40`, padding: '1px 8px', borderRadius: 20 }}>
      PCR {pcr} · {label}
    </span>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function OptionChain({ isPro }: { isPro: boolean }) {
  const [instrument, setInstrument] = useState('GOLD')
  const [expiry, setExpiry]         = useState<string|null>(null)
  const [data, setData]             = useState<OptionsData|null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string|null>(null)
  const [showGreeks, setShowGreeks] = useState(false)
  const [showAAV, setShowAAV]       = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date|null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ instrument })
      if (expiry) params.set('expiry', expiry)
      const res = await fetch(`/api/options?${params}`)
      if (!res.ok) throw new Error(((await res.json()) as { error: string }).error)
      setData(await res.json())
      setLastRefresh(new Date())
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }, [instrument, expiry])

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 3 * 60 * 1000); return () => clearInterval(t) }, [fetchData])
  useEffect(() => { setExpiry(null) }, [instrument])

  if (!isPro) {
    return (
      <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ filter: 'blur(4px)', opacity: 0.5, pointerEvents: 'none', maxHeight: 200, overflow: 'hidden', background: '#0d0d0d', padding: 24 }}>
          <div style={{ color: '#888', fontFamily: 'var(--font-mono)', fontSize: 12 }}>CE LTP · Strike · PE LTP</div>
          {[116500, 117000, 117500, 118000].map(s => (
            <div key={s} style={{ display: 'flex', gap: 40, padding: '4px 0', color: '#666', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span style={{ color: '#ef4444' }}>{(28000 - (s - 116500) / 10).toFixed(0)}</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{s.toLocaleString('en-IN')}</span>
              <span style={{ color: '#22c55e' }}>{((s - 116500) / 10 + 1).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>BhaavBrief Pro</div>
            <div style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>MCX Option Chain with live Greeks, iVIX, Max Pain & PCR</div>
            <a href="/pro" style={{ display: 'inline-block', background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 20px', borderRadius: 6, textDecoration: 'none' }}>Upgrade to Pro →</a>
          </div>
        </div>
      </div>
    )
  }

  const maxCEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.CE.oi), 1) : 1
  const maxPEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.PE.oi), 1) : 1

  const vpColor = data?.volPremium == null ? '#999'
    : data.volPremium > 2 ? '#f59e0b'
    : data.volPremium < -2 ? '#22c55e' : '#ccc'

  return (
    <div style={{ background: '#0d0d0d', borderRadius: 10, border: '1px solid #222', overflow: 'hidden', fontFamily: 'var(--font-mono)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, background: '#111' }}>

        {/* Instrument tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {INSTRUMENTS.map(({ key, label }) => (
            <button key={key} onClick={() => setInstrument(key)} style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              border: instrument === key ? '1px solid #f59e0b' : '1px solid #333',
              background: instrument === key ? '#f59e0b' : 'transparent',
              color: instrument === key ? '#000' : '#888',
              transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {/* Expiry */}
        {data?.expiries && (
          <select value={expiry || data.expiry} onChange={e => setExpiry(e.target.value)} style={{
            background: '#1a1a1a', color: '#ccc', border: '1px solid #333',
            borderRadius: 5, padding: '4px 8px', fontSize: 12,
          }}>
            {data.expiries.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}

        {/* Greeks toggle */}
        <button onClick={() => setShowGreeks(g => !g)} style={{
          padding: '4px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
          border: showGreeks ? '1px solid #f59e0b' : '1px solid #333',
          background: 'transparent', color: showGreeks ? '#f59e0b' : '#666',
        }}>
          Greeks {showGreeks ? '▲' : '▼'}
        </button>

        {/* Refresh */}
        <button onClick={fetchData} disabled={loading} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#555', fontSize: 11, cursor: 'pointer' }}>
          {loading ? '↻ Loading…' : `↻ ${lastRefresh ? lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}`}
        </button>
      </div>

      {/* ── Analytics bar ── */}
      {data && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a1a', background: '#111', display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'center', fontSize: 12 }}>
          <span style={{ color: '#666' }}>Futures <span style={{ color: '#fff', fontWeight: 600 }}>{fmtINR(data.futurePrice)}</span></span>
          <span style={{ color: '#666' }}>Max Pain <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtINR(data.maxPain)}</span></span>
          <PCRBadge pcr={data.pcr} />
          {data.ivix != null && <span style={{ color: '#666' }}>iVIX <span style={{ color: '#a78bfa', fontWeight: 600 }}>{data.ivix}</span></span>}
          {data.aav['20d'] != null && (
            <span style={{ color: '#666', cursor: 'pointer' }} onClick={() => setShowAAV(v => !v)}>
              AAV(20d) <span style={{ color: '#60a5fa', fontWeight: 600 }}>{data.aav['20d']}</span>
              <span style={{ color: '#444', marginLeft: 4 }}>{showAAV ? '▲' : '▼'}</span>
            </span>
          )}
          {data.volPremium != null && (
            <span style={{ color: '#666' }}>Vol Premium <span style={{ color: vpColor, fontWeight: 600 }}>{data.volPremium > 0 ? '+' : ''}{data.volPremium}</span></span>
          )}
          <span style={{ color: data.marketOpen ? '#22c55e' : '#ef4444', fontSize: 11 }}>● {data.marketOpen ? 'Live' : 'Closed'}</span>
        </div>
      )}

      {/* ── AAV expanded ── */}
      {data && showAAV && (
        <div style={{ padding: '6px 16px', borderBottom: '1px solid #1a1a1a', background: '#0f0f0f', display: 'flex', gap: 20, fontSize: 11, color: '#555' }}>
          <span style={{ color: '#444', fontWeight: 600 }}>AAV →</span>
          {(['5d','10d','20d','40d','60d'] as const).map(w => (
            <span key={w}>
              {w}: <span style={{ color: w === '20d' ? '#60a5fa' : '#888', fontWeight: 600 }}>{data.aav[w] ?? '—'}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && <div style={{ padding: '10px 16px', color: '#ef4444', fontSize: 12 }}>{error}</div>}

      {/* ── Table ── */}
      {data?.chain && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a', color: '#444' }}>
                {showGreeks && ['IV','Δ','Θ','Vega'].map(g => (
                  <th key={`ch-${g}`} style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600 }}>{g}</th>
                ))}
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10 }}>Vol</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10 }}>OI</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', color: '#ef4444', fontSize: 10, fontWeight: 700 }}>CE LTP</th>
                <th style={{ padding: '6px 16px', textAlign: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>Strike</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', color: '#22c55e', fontSize: 10, fontWeight: 700 }}>PE LTP</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10 }}>OI</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10 }}>Vol</th>
                {showGreeks && ['IV','Δ','Θ','Vega'].map(g => (
                  <th key={`ph-${g}`} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600 }}>{g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.chain.map(row => {
                const isATM = row.isATM
                const isMP  = row.strike === data.maxPain
                const rowBg = isATM ? '#1a1500' : isMP ? '#0f0f1a' : 'transparent'
                const ceBg  = row.isITM_CE ? '#1a0a0a' : 'transparent'
                const peBg  = row.isITM_PE ? '#0a1a0a' : 'transparent'

                const greek = (side: OptionSide, key: 'iv'|'delta'|'theta'|'vega') => {
                  if (key === 'iv') return side.iv != null ? side.iv + '%' : '—'
                  const v = side[key]
                  return v != null ? fmtNum(v, 3) : '—'
                }

                return (
                  <tr key={row.strike} style={{ borderBottom: '1px solid #111', background: rowBg }}>
                    {showGreeks && (['iv','delta','theta','vega'] as const).map(g => (
                      <td key={`cg-${g}`} style={{ padding: '5px 8px', textAlign: 'right', color: '#555', background: ceBg }}>{greek(row.CE, g)}</td>
                    ))}
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#444', background: ceBg }}>{fmtOI(row.CE.volume)}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', background: ceBg }}>
                      <span style={{ color: '#666' }}>{fmtOI(row.CE.oi)}</span>
                      <OIBar oi={row.CE.oi} max={maxCEOI} side="CE" />
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600, color: row.CE.ltp > 0 ? '#ef4444' : '#333', background: ceBg }}>
                      {row.CE.ltp > 0 ? fmtNum(row.CE.ltp) : '—'}
                    </td>

                    {/* Strike */}
                    <td style={{ padding: '5px 16px', textAlign: 'center', fontWeight: 700, borderLeft: '1px solid #1a1a1a', borderRight: '1px solid #1a1a1a' }}>
                      <span style={{ color: isATM ? '#f59e0b' : isMP ? '#818cf8' : '#fff' }}>
                        {Number(row.strike).toLocaleString('en-IN')}
                      </span>
                      {isATM && <span style={{ display: 'block', fontSize: 9, color: '#f59e0b', marginTop: 1 }}>ATM</span>}
                      {isMP  && <span style={{ display: 'block', fontSize: 9, color: '#818cf8', marginTop: 1 }}>MP</span>}
                    </td>

                    <td style={{ padding: '5px 10px', textAlign: 'left', fontWeight: 600, color: row.PE.ltp > 0 ? '#22c55e' : '#333', background: peBg }}>
                      {row.PE.ltp > 0 ? fmtNum(row.PE.ltp) : '—'}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'left', background: peBg }}>
                      <span style={{ color: '#666' }}>{fmtOI(row.PE.oi)}</span>
                      <OIBar oi={row.PE.oi} max={maxPEOI} side="PE" />
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'left', color: '#444', background: peBg }}>{fmtOI(row.PE.volume)}</td>
                    {showGreeks && (['iv','delta','theta','vega'] as const).map(g => (
                      <td key={`pg-${g}`} style={{ padding: '5px 8px', textAlign: 'left', color: '#555', background: peBg }}>{greek(row.PE, g)}</td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#333' }}>
        <span>Black-76 · {RISK_FREE_RATE * 100}% RFR · 30s CDN cache</span>
        <span>Kite Connect · MCX</span>
      </div>
    </div>
  )
}

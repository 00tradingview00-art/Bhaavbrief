'use client'

import { useState, useEffect, useCallback } from 'react'

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'        },
  { key: 'SILVER',     label: 'Silver'      },
  { key: 'CRUDEOIL',   label: 'Crude Oil'   },
  { key: 'NATURALGAS', label: 'Nat Gas'     },
  { key: 'COPPER',     label: 'Copper'      },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionSide {
  symbol: string | null; ltp: number; absChng: number; oi: number
  oiChange: number; volume: number; iv: number | null
  delta: number | null; gamma: number | null; theta: number | null; vega: number | null
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

// ── Small helpers ─────────────────────────────────────────────────────────────

const fmtINR = (n: number|null|undefined, dec = 0) =>
  n == null || isNaN(n) ? '—' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtNum = (n: number|null|undefined, dec = 2) =>
  n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtOI = (n: number) =>
  !n ? '—' : n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)

const fmtChng = (n: number) =>
  !n ? '—' : (n > 0 ? '+' : '') + fmtNum(n, 2)

// ── OI bar ────────────────────────────────────────────────────────────────────

function OIBar({ oi, max, side }: { oi: number; max: number; side: 'CE'|'PE' }) {
  const pct = max > 0 ? Math.min((oi / max) * 100, 100) : 0
  return (
    <div style={{ height: 2, background: '#e5e7eb', borderRadius: 2, marginTop: 3, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%', width: `${pct}%`,
        background: side === 'CE' ? '#ef4444' : '#16a34a', borderRadius: 2,
        [side === 'CE' ? 'right' : 'left']: 0,
      }} />
    </div>
  )
}

// ── PCR badge ─────────────────────────────────────────────────────────────────

function PCRBadge({ pcr }: { pcr: number }) {
  const label = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral'
  const color = pcr > 1.2 ? '#16a34a' : pcr < 0.8 ? '#dc2626' : '#b45309'
  return (
    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color, border: `1px solid ${color}50`, padding: '1px 8px', borderRadius: 20 }}>
      PCR {pcr} · {label}
    </span>
  )
}

// ── Cell: LTP + chng ─────────────────────────────────────────────────────────

function LTPCell({ ltp, chng, align }: { ltp: number; chng: number; align: 'left'|'right' }) {
  if (!ltp) return <td style={{ padding: '5px 8px', textAlign: align, color: '#9ca3af', fontSize: 12 }}>—</td>
  const chngColor = chng > 0 ? '#16a34a' : chng < 0 ? '#dc2626' : '#374151'
  return (
    <td style={{ padding: '5px 8px', textAlign: align }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: '#1d4ed8', fontFamily: 'var(--font-mono)' }}>{fmtNum(ltp)}</div>
      {chng !== 0 && <div style={{ fontSize: 10, color: chngColor, fontFamily: 'var(--font-mono)' }}>{fmtChng(chng)}</div>}
    </td>
  )
}

// ── Cell: OI ──────────────────────────────────────────────────────────────────

function OICell({ oi, oiChange, max, side, align }: { oi: number; oiChange: number; max: number; side: 'CE'|'PE'; align: 'left'|'right' }) {
  const oiChColor = oiChange > 0 ? '#16a34a' : oiChange < 0 ? '#dc2626' : '#9ca3af'
  return (
    <td style={{ padding: '5px 8px', textAlign: align, minWidth: 56 }}>
      <div style={{ fontSize: 12, color: '#111827', fontFamily: 'var(--font-mono)' }}>{fmtOI(oi)}</div>
      {oiChange !== 0 && <div style={{ fontSize: 10, color: oiChColor, fontFamily: 'var(--font-mono)' }}>{oiChange > 0 ? '+' : ''}{fmtOI(Math.abs(oiChange))}</div>}
      <OIBar oi={oi} max={max} side={side} />
    </td>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

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
        <div style={{ filter: 'blur(4px)', opacity: 0.5, pointerEvents: 'none', maxHeight: 200, overflow: 'hidden', background: '#fff', padding: 24 }}>
          <div style={{ color: '#9ca3af', fontFamily: 'var(--font-mono)', fontSize: 12 }}>OI · Volume · LTP · IV%</div>
          {[116500, 117000, 117500, 118000].map(s => (
            <div key={s} style={{ display: 'flex', gap: 40, padding: '4px 0', color: '#666', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <span style={{ color: '#dc2626' }}>{(28000 - (s - 116500) / 10).toFixed(0)}</span>
              <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{s.toLocaleString('en-IN')}</span>
              <span style={{ color: '#16a34a' }}>{((s - 116500) / 10 + 1).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)' }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔒</div>
            <div style={{ color: '#111', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>BhaavBrief Pro</div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>MCX Option Chain — live Greeks, iVIX, Max Pain & PCR</div>
            <a href="/pro" style={{ display: 'inline-block', background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 13, padding: '8px 20px', borderRadius: 6, textDecoration: 'none' }}>Upgrade to Pro →</a>
          </div>
        </div>
      </div>
    )
  }

  const maxCEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.CE.oi), 1) : 1
  const maxPEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.PE.oi), 1) : 1

  const vpColor = data?.volPremium == null ? '#6b7280'
    : data.volPremium > 2 ? '#b45309'
    : data.volPremium < -2 ? '#16a34a' : '#6b7280'

  const TH = ({ children, align = 'right', style }: { children: React.ReactNode; align?: 'left'|'right'|'center'; style?: React.CSSProperties }) => (
    <th style={{ padding: '6px 8px', textAlign: align, fontSize: 10, fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap', borderBottom: '2px solid #e5e7eb', ...style }}>{children}</th>
  )

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', fontFamily: 'inherit' }}>

      {/* ── Controls ── */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: 'var(--surface-2, #f9f8f4)' }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {INSTRUMENTS.map(({ key, label }) => (
            <button key={key} onClick={() => setInstrument(key)} style={{
              padding: '4px 11px', fontSize: 12, fontWeight: 600, borderRadius: 5, cursor: 'pointer',
              border: instrument === key ? '1px solid var(--gold)' : '1px solid var(--border)',
              background: instrument === key ? 'var(--gold)' : 'transparent',
              color: instrument === key ? '#000' : 'var(--ink-3)',
            }}>{label}</button>
          ))}
        </div>
        {data?.expiries && (
          <select value={expiry || data.expiry} onChange={e => setExpiry(e.target.value)} style={{
            background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)',
            borderRadius: 5, padding: '4px 8px', fontSize: 12,
          }}>
            {data.expiries.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        <button onClick={() => setShowGreeks(g => !g)} style={{
          padding: '4px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
          border: '1px solid var(--border)', background: showGreeks ? '#eff6ff' : 'transparent',
          color: showGreeks ? '#1d4ed8' : 'var(--ink-3)',
        }}>Greeks {showGreeks ? '▲' : '▼'}</button>
        <button onClick={fetchData} disabled={loading} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-4)', fontSize: 11, cursor: 'pointer' }}>
          {loading ? '↻ Loading…' : `↻ ${lastRefresh ? lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Refresh'}`}
        </button>
      </div>

      {/* ── Analytics bar ── */}
      {data && (
        <div style={{ padding: '7px 14px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '5px 18px', alignItems: 'center', fontSize: 12, background: '#fefcf3' }}>
          <span style={{ color: 'var(--ink-3)' }}>Underlying <span style={{ color: 'var(--ink)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmtINR(data.futurePrice)}</span></span>
          <span style={{ color: 'var(--ink-3)' }}>Max Pain <span style={{ color: '#b45309', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{fmtINR(data.maxPain)}</span></span>
          <PCRBadge pcr={data.pcr} />
          {data.ivix != null && <span style={{ color: 'var(--ink-3)' }}>iVIX <span style={{ color: '#7c3aed', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.ivix}</span></span>}
          {data.aav['20d'] != null && (
            <span style={{ color: 'var(--ink-3)', cursor: 'pointer' }} onClick={() => setShowAAV(v => !v)}>
              AAV(20d) <span style={{ color: '#0369a1', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.aav['20d']}</span>
              <span style={{ color: 'var(--ink-4)', marginLeft: 3 }}>{showAAV ? '▲' : '▼'}</span>
            </span>
          )}
          {data.volPremium != null && <span style={{ color: 'var(--ink-3)' }}>Vol Premium <span style={{ color: vpColor, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.volPremium > 0 ? '+' : ''}{data.volPremium}</span></span>}
          <span style={{ marginLeft: 'auto', color: data.marketOpen ? '#16a34a' : '#9ca3af', fontSize: 11 }}>● {data.marketOpen ? 'Live' : 'Closed'}</span>
        </div>
      )}

      {/* ── AAV expanded ── */}
      {data && showAAV && (
        <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 18, fontSize: 11, background: '#f0f9ff', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af', fontWeight: 600 }}>Annualized Actual Volatility →</span>
          {(['5d','10d','20d','40d','60d'] as const).map(w => (
            <span key={w} style={{ color: '#6b7280' }}>{w}: <span style={{ color: w === '20d' ? '#0369a1' : '#374151', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{data.aav[w] ?? '—'}</span></span>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', color: '#dc2626', fontSize: 12 }}>{error}</div>}

      {/* ── ITM legend ── */}
      {data?.chain && (
        <div style={{ padding: '4px 14px', borderBottom: '1px solid #fde68a', background: '#fefce8', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#92400e' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef08a', border: '1px solid #fbbf24', borderRadius: 2 }} />
          Highlighted rows are in-the-money
        </div>
      )}

      {/* ── Table ── */}
      {data?.chain && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'inherit' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th colSpan={showGreeks ? 6 : 3} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#dc2626', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb', borderRight: '2px solid #d1d5db' }}>CALLS</th>
                <th style={{ padding: '6px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb' }}>STRIKE</th>
                <th colSpan={showGreeks ? 6 : 3} style={{ padding: '6px 8px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#16a34a', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb', borderLeft: '2px solid #d1d5db' }}>PUTS</th>
              </tr>
              <tr style={{ background: '#f9fafb' }}>
                <TH align="right">OI</TH>
                <TH align="right">Vol</TH>
                <TH align="right" style={{ borderRight: '2px solid #d1d5db' }}>LTP</TH>
                {showGreeks && <><TH align="right">IV</TH><TH align="right">Delta</TH><TH align="right">Theta</TH></>}
                <TH align="center" style={{ color: '#1d4ed8', minWidth: 85, fontWeight: 700 }}>Price</TH>
                {showGreeks && <><TH align="left">Delta</TH><TH align="left">Theta</TH><TH align="left">IV</TH></>}
                <TH align="left" style={{ borderLeft: '2px solid #d1d5db' }}>LTP</TH>
                <TH align="left">Vol</TH>
                <TH align="left">OI</TH>
              </tr>
            </thead>
            <tbody>
              {data.chain.map(row => {
                const isATM = row.isATM
                const isMP  = row.strike === data.maxPain
                const itmCEBg = row.isITM_CE ? '#fef9c3' : 'transparent'
                const itmPEBg = row.isITM_PE ? '#fef9c3' : 'transparent'
                const strikeBg = isATM ? '#fef3c7' : isMP ? '#f5f3ff' : (row.isITM_CE || row.isITM_PE) ? '#fef9c3' : 'transparent'

                const iv = (side: OptionSide) => side.iv != null ? side.iv + '%' : '—'
                const gv = (side: OptionSide, k: 'delta'|'theta') => side[k] != null ? fmtNum(side[k]!, 3) : '—'

                return (
                  <tr key={row.strike} style={{
                    borderBottom: '1px solid #f3f4f6',
                    borderTop: isATM ? '2px solid #fbbf24' : undefined,
                  }}>
                    {/* CE: OI */}
                    <OICell oi={row.CE.oi} oiChange={row.CE.oiChange} max={maxCEOI} side="CE" align="right" />
                    {/* CE: Vol */}
                    <td style={{ padding: '5px 8px', textAlign: 'right', background: itmCEBg, fontFamily: 'var(--font-mono)', color: '#374151' }}>{fmtOI(row.CE.volume)}</td>
                    {/* CE: LTP */}
                    <LTPCell ltp={row.CE.ltp} chng={row.CE.absChng} align="right" />
                    {/* CE: Greeks */}
                    {showGreeks && (
                      <>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, color: '#6b7280', background: itmCEBg, fontFamily: 'var(--font-mono)' }}>{iv(row.CE)}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, color: '#6b7280', background: itmCEBg, fontFamily: 'var(--font-mono)' }}>{gv(row.CE, 'delta')}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontSize: 11, color: '#6b7280', background: itmCEBg, fontFamily: 'var(--font-mono)', borderRight: '2px solid #d1d5db' }}>{gv(row.CE, 'theta')}</td>
                      </>
                    )}
                    {/* Strike */}
                    <td style={{ padding: '5px 12px', textAlign: 'center', fontWeight: 700, background: strikeBg, borderLeft: showGreeks ? 'none' : '2px solid #d1d5db', borderRight: showGreeks ? 'none' : '2px solid #d1d5db' }}>
                      <span style={{ color: isATM ? '#92400e' : isMP ? '#5b21b6' : '#1d4ed8', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {Number(row.strike).toLocaleString('en-IN')}
                      </span>
                      {isATM && <div style={{ fontSize: 9, color: '#92400e', fontWeight: 700, marginTop: 1 }}>ATM</div>}
                      {isMP  && <div style={{ fontSize: 9, color: '#5b21b6', fontWeight: 700, marginTop: 1 }}>MAX PAIN</div>}
                    </td>
                    {/* PE: Greeks */}
                    {showGreeks && (
                      <>
                        <td style={{ padding: '5px 8px', textAlign: 'left', fontSize: 11, color: '#6b7280', background: itmPEBg, fontFamily: 'var(--font-mono)', borderLeft: '2px solid #d1d5db' }}>{gv(row.PE, 'delta')}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'left', fontSize: 11, color: '#6b7280', background: itmPEBg, fontFamily: 'var(--font-mono)' }}>{gv(row.PE, 'theta')}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'left', fontSize: 11, color: '#6b7280', background: itmPEBg, fontFamily: 'var(--font-mono)' }}>{iv(row.PE)}</td>
                      </>
                    )}
                    {/* PE: LTP */}
                    <LTPCell ltp={row.PE.ltp} chng={row.PE.absChng} align="left" />
                    {/* PE: Vol */}
                    <td style={{ padding: '5px 8px', textAlign: 'left', background: itmPEBg, fontFamily: 'var(--font-mono)', color: '#374151' }}>{fmtOI(row.PE.volume)}</td>
                    {/* PE: OI */}
                    <OICell oi={row.PE.oi} oiChange={row.PE.oiChange} max={maxPEOI} side="PE" align="left" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '7px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-4)', background: 'var(--surface-2, #f9f8f4)' }}>
        <span>Black-76 model · 6.5% RFR · 30s cache</span>
        <span>Not investment advice</span>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'

const INSTRUMENTS = [
  { key: 'GOLD',       label: 'Gold'      },
  { key: 'SILVER',     label: 'Silver'    },
  { key: 'CRUDEOIL',   label: 'Crude Oil' },
  { key: 'NATURALGAS', label: 'Nat Gas'   },
  { key: 'COPPER',     label: 'Copper'    },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionSide {
  symbol: string|null; ltp: number; absChng: number; oi: number
  oiChange: number; volume: number; iv: number|null
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
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtINR = (n: number|null|undefined, dec = 0) =>
  n == null || isNaN(n) ? '·' : '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtN = (n: number|null|undefined, dec = 2) =>
  n == null || isNaN(n) ? '·' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec })

const fmtOI = (n: number) =>
  !n ? '·' : n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)

// ── Design tokens (matching bhaav.css) ────────────────────────────────────────

const T = {
  ink:       'var(--ink)',
  ink2:      'var(--ink-2)',
  ink3:      'var(--ink-3)',
  ink4:      'var(--ink-4)',
  surface:   'var(--surface)',
  surface2:  'var(--surface-2)',
  surface3:  'var(--surface-3)',
  border:    'var(--border)',
  border2:   'var(--border-2)',
  gold:      'var(--gold)',
  goldPale:  'var(--gold-pale)',
  up:        'var(--up)',
  upBg:      'var(--up-bg)',
  down:      'var(--down)',
  downBg:    'var(--down-bg)',
  mono:      'var(--font-sans)',
  sans:      'var(--font-sans)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OIBar({ oi, max, side }: { oi: number; max: number; side: 'CE'|'PE' }) {
  const pct = max > 0 ? Math.min((oi / max) * 100, 100) : 0
  return (
    <div style={{ height: 2, background: T.border, borderRadius: 1, marginTop: 4, overflow: 'hidden', position: 'relative' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%', width: `${pct}%`,
        background: side === 'CE' ? T.down : T.up, borderRadius: 1,
        [side === 'CE' ? 'right' : 'left']: 0,
      }} />
    </div>
  )
}

function MetricPill({ label, value, color, onClick, expand }: { label: string; value: React.ReactNode; color?: string; onClick?: () => void; expand?: boolean }) {
  return (
    <div onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 1, padding: '5px 14px', borderRight: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink4, fontFamily: T.sans, fontWeight: 500 }}>
        {label}{expand != null && <span style={{ marginLeft: 4 }}>{expand ? '▲' : '▼'}</span>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color ?? T.ink, fontFamily: T.mono, lineHeight: 1.2 }}>{value}</span>
    </div>
  )
}

function PCRChip({ pcr }: { pcr: number }) {
  const label = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral'
  const color = pcr > 1.2 ? T.up : pcr < 0.8 ? T.down : 'var(--saffron)'
  const bg    = pcr > 1.2 ? T.upBg : pcr < 0.8 ? T.downBg : T.goldPale
  return (
    <div style={{ padding: '5px 14px', borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink4, fontFamily: T.sans, fontWeight: 500 }}>PCR</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, fontFamily: T.mono }}>{pcr}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, padding: '1px 6px', borderRadius: 3 }}>{label}</span>
      </span>
    </div>
  )
}

function LTPCell({ ltp, chng, itm, align }: { ltp: number; chng: number; itm: boolean; align: 'left'|'right' }) {
  const itmBg = itm ? T.goldPale : 'transparent'
  const numStyle: React.CSSProperties = { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }
  if (!ltp) return <td style={{ padding: '7px 10px', textAlign: align, background: itmBg, color: T.ink4, ...numStyle, fontSize: 12 }}>·</td>
  const chngColor = chng > 0 ? T.up : chng < 0 ? T.down : T.ink3
  const chngStr   = chng > 0 ? `+${fmtN(chng)}` : chng < 0 ? fmtN(chng) : null
  return (
    <td style={{ padding: '7px 10px', textAlign: align, background: itmBg }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: T.ink, ...numStyle }}>{fmtN(ltp)}</div>
      {chngStr && <div style={{ fontSize: 10, color: chngColor, ...numStyle, marginTop: 1 }}>{chngStr}</div>}
    </td>
  )
}

function OICell({ oi, oiChange, max, side, itm, align }: { oi: number; oiChange: number; max: number; side: 'CE'|'PE'; itm: boolean; align: 'left'|'right' }) {
  const itmBg     = itm ? T.goldPale : 'transparent'
  const chngColor = oiChange > 0 ? T.up : oiChange < 0 ? T.down : T.ink4
  const chngStr   = oiChange !== 0 ? (oiChange > 0 ? '+' : '') + fmtOI(Math.abs(oiChange)) : null
  const numStyle: React.CSSProperties = { fontFamily: T.mono, fontVariantNumeric: 'tabular-nums' }
  return (
    <td style={{ padding: '7px 10px', textAlign: align, background: itmBg, minWidth: 62 }}>
      <div style={{ fontSize: 12, color: T.ink2, ...numStyle }}>{fmtOI(oi)}</div>
      {chngStr && <div style={{ fontSize: 10, color: chngColor, ...numStyle, marginTop: 1 }}>{chngStr}</div>}
      <OIBar oi={oi} max={max} side={side} />
    </td>
  )
}

function GreekCell({ value, itm, align }: { value: number|null; itm: boolean; align: 'left'|'right' }) {
  return (
    <td style={{ padding: '7px 10px', textAlign: align, background: itm ? T.goldPale : 'transparent', color: T.ink3, fontFamily: T.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
      {value != null ? fmtN(value, 3) : '·'}
    </td>
  )
}

function IVCell({ iv, itm, align }: { iv: number|null; itm: boolean; align: 'left'|'right' }) {
  return (
    <td style={{ padding: '7px 10px', textAlign: align, background: itm ? T.goldPale : 'transparent', color: T.ink3, fontFamily: T.mono, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
      {iv != null ? iv + '%' : '·'}
    </td>
  )
}

// Column header helper
function TH({ children, align = 'right', style }: { children: React.ReactNode; align?: 'left'|'right'|'center'; style?: React.CSSProperties }) {
  return (
    <th style={{
      padding: '5px 10px', textAlign: align, fontSize: 10, fontWeight: 500,
      color: T.ink3, whiteSpace: 'nowrap', fontFamily: T.sans,
      letterSpacing: '0.03em', borderBottom: `1px solid ${T.border}`,
      background: T.surface2, ...style
    }}>{children}</th>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

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
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border}` }}>
        <div style={{ filter: 'blur(5px)', opacity: 0.4, pointerEvents: 'none', maxHeight: 180, overflow: 'hidden', background: T.surface, padding: 24 }}>
          {[116500, 117000, 117500, 118000].map(s => (
            <div key={s} style={{ display: 'flex', gap: 40, padding: '5px 0', borderBottom: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ color: T.down }}>28{(116500 - s) / 100 + 28}</span>
              <span style={{ color: T.ink, fontWeight: 600 }}>{s.toLocaleString('en-IN')}</span>
              <span style={{ color: T.up }}>1.{(s - 116000) / 500}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.88)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 600, color: T.ink, marginBottom: 6 }}>BhaavBrief Pro</div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.ink3, marginBottom: 20 }}>Live MCX option chain — Greeks, iVIX, Max Pain, PCR</div>
            <a href="/pro" style={{ display: 'inline-block', background: T.gold, color: '#fff', fontFamily: T.sans, fontWeight: 600, fontSize: 13, padding: '9px 22px', borderRadius: 5, textDecoration: 'none' }}>Upgrade to Pro →</a>
          </div>
        </div>
      </div>
    )
  }

  const maxCEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.CE.oi), 1) : 1
  const maxPEOI = data?.chain?.length ? Math.max(...data.chain.map(r => r.PE.oi), 1) : 1

  const vpColor = data?.volPremium == null ? T.ink3
    : data.volPremium > 2 ? 'var(--saffron)'
    : data.volPremium < -2 ? T.up : T.ink3

  const vpStr = data?.volPremium != null
    ? (data.volPremium > 0 ? '+' : '') + data.volPremium
    : '—'

  return (
    <div style={{ background: T.surface, borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden', fontFamily: T.sans, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

      {/* ── Controls ── */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', background: T.surface2 }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {INSTRUMENTS.map(({ key, label }) => (
            <button key={key} onClick={() => setInstrument(key)} style={{
              padding: '5px 12px', fontSize: 12, fontWeight: 500, borderRadius: 5,
              cursor: 'pointer', fontFamily: T.sans, letterSpacing: '0.01em',
              border: instrument === key ? `1px solid ${T.gold}` : `1px solid ${T.border}`,
              background: instrument === key ? T.gold : 'transparent',
              color: instrument === key ? '#fff' : T.ink3,
              transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {data?.expiries && (
          <select value={expiry || data.expiry} onChange={e => setExpiry(e.target.value)} style={{
            background: T.surface, color: T.ink2, border: `1px solid ${T.border}`,
            borderRadius: 5, padding: '5px 8px', fontSize: 12, fontFamily: T.sans,
          }}>
            {data.expiries.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}

        <button onClick={() => setShowGreeks(g => !g)} style={{
          padding: '5px 12px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
          fontFamily: T.sans, border: `1px solid ${T.border}`,
          background: showGreeks ? T.goldPale : 'transparent',
          color: showGreeks ? T.gold : T.ink3,
        }}>
          Greeks {showGreeks ? '▲' : '▼'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: T.ink4, fontFamily: T.mono }}>
              {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          )}
          <button onClick={fetchData} disabled={loading} style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: 4,
            color: T.ink3, fontSize: 11, cursor: 'pointer', padding: '3px 8px', fontFamily: T.sans,
          }}>
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Analytics strip ── */}
      {data && (
        <div style={{ borderBottom: `1px solid ${T.border}`, display: 'flex', overflowX: 'auto', background: T.surface }}>
          <MetricPill label="Underlying" value={fmtINR(data.futurePrice)} />
          <MetricPill label="Max Pain" value={fmtINR(data.maxPain)} color={T.gold} />
          <PCRChip pcr={data.pcr} />
          {data.ivix != null && <MetricPill label="iVIX" value={data.ivix} color="#6941c6" />}
          {data.aav['20d'] != null && (
            <MetricPill label="AAV 20d" value={data.aav['20d']} color="#0369a1"
              onClick={() => setShowAAV(v => !v)} expand={showAAV} />
          )}
          {data.volPremium != null && <MetricPill label="Vol Premium" value={vpStr} color={vpColor} />}
          <div style={{ padding: '5px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, marginLeft: 'auto' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.ink4, fontFamily: T.sans, fontWeight: 500 }}>Status</span>
            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: T.mono, color: data.marketOpen ? T.up : T.ink4 }}>
              ● {data.marketOpen ? 'Live' : 'Closed'}
            </span>
          </div>
        </div>
      )}

      {/* ── AAV breakdown ── */}
      {data && showAAV && (
        <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: '4px 24px', alignItems: 'center', background: T.surface2 }}>
          <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Annualized Actual Vol</span>
          {(['5d','10d','20d','40d','60d'] as const).map(w => (
            <span key={w} style={{ fontFamily: T.mono, fontSize: 12 }}>
              <span style={{ color: T.ink4, fontSize: 10 }}>{w} </span>
              <span style={{ color: w === '20d' ? '#0369a1' : T.ink2, fontWeight: 600 }}>{data.aav[w] ?? '—'}</span>
            </span>
          ))}
        </div>
      )}

      {error && <div style={{ padding: '10px 14px', color: T.down, fontSize: 12, fontFamily: T.sans }}>{error}</div>}

      {/* ── ITM note ── */}
      {data?.chain && (
        <div style={{ padding: '5px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: T.ink4, fontFamily: T.sans, background: T.surface2 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, background: T.goldPale, border: `1px solid ${T.gold}`, borderRadius: 2, opacity: 0.7 }} />
          Highlighted rows are in-the-money
        </div>
      )}

      {/* ── Table ── */}
      {data?.chain && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: T.sans }}>
            <thead>
              {/* CALLS / PUTS section header */}
              <tr>
                <th colSpan={showGreeks ? 5 : 3} style={{
                  padding: '6px 10px', textAlign: 'center', fontSize: 9,
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: T.down, background: T.downBg, borderBottom: `1px solid ${T.border}`,
                  borderRight: `2px solid ${T.border2}`,
                }}>Calls</th>
                <th style={{
                  padding: '6px 10px', fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: T.ink3, background: T.surface2, borderBottom: `1px solid ${T.border}`,
                  textAlign: 'center',
                }}>Strike</th>
                <th colSpan={showGreeks ? 5 : 3} style={{
                  padding: '6px 10px', textAlign: 'center', fontSize: 9,
                  fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: T.up, background: T.upBg, borderBottom: `1px solid ${T.border}`,
                  borderLeft: `2px solid ${T.border2}`,
                }}>Puts</th>
              </tr>
              {/* Column names */}
              <tr>
                <TH align="right">OI</TH>
                <TH align="right">Vol</TH>
                <TH align="right" style={{ borderRight: `2px solid ${T.border2}` }}>LTP</TH>
                {showGreeks && <><TH align="right">IV</TH><TH align="right" style={{ borderRight: `2px solid ${T.border2}` }}>Delta</TH></>}
                <TH align="center" style={{ color: T.ink2, fontWeight: 600, minWidth: 90 }}>Price</TH>
                {showGreeks && <><TH align="left" style={{ borderLeft: `2px solid ${T.border2}` }}>Delta</TH><TH align="left">IV</TH></>}
                <TH align="left" style={{ borderLeft: `2px solid ${T.border2}` }}>LTP</TH>
                <TH align="left">Vol</TH>
                <TH align="left">OI</TH>
              </tr>
            </thead>
            <tbody>
              {data.chain.map(row => {
                const { isATM, isITM_CE, isITM_PE } = row
                const isMP  = row.strike === data.maxPain
                const itmBg = T.goldPale

                const strikeBg    = isATM ? T.goldPale : isMP ? '#f5f3ff' : 'transparent'
                const strikeColor = isATM ? T.gold : isMP ? '#6941c6' : T.ink
                const atmBorderTop = isATM ? `2px solid ${T.gold}` : undefined

                return (
                  <tr key={row.strike} style={{ borderBottom: `1px solid ${T.border}`, borderTop: atmBorderTop }}>
                    {/* CE side */}
                    <OICell oi={row.CE.oi} oiChange={row.CE.oiChange} max={maxCEOI} side="CE" itm={isITM_CE} align="right" />
                    <td style={{ padding: '7px 10px', textAlign: 'right', background: isITM_CE ? itmBg : 'transparent', color: T.ink2, fontFamily: T.mono }}>{fmtOI(row.CE.volume)}</td>
                    <LTPCell ltp={row.CE.ltp} chng={row.CE.absChng} itm={isITM_CE} align="right" />
                    {showGreeks && (
                      <>
                        <IVCell iv={row.CE.iv} itm={isITM_CE} align="right" />
                        <GreekCell value={row.CE.delta} itm={isITM_CE} align="right" />
                      </>
                    )}

                    {/* Strike */}
                    <td style={{
                      padding: '7px 12px', textAlign: 'center', background: strikeBg,
                      borderLeft: `2px solid ${T.border2}`, borderRight: `2px solid ${T.border2}`,
                    }}>
                      <span style={{ fontFamily: T.mono, fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 700, color: strikeColor }}>
                        {Number(row.strike).toLocaleString('en-IN')}
                      </span>
                      {isATM && <div style={{ fontSize: 9, fontFamily: T.sans, fontWeight: 600, color: T.gold, letterSpacing: '0.06em', marginTop: 2 }}>ATM</div>}
                      {isMP  && !isATM && <div style={{ fontSize: 9, fontFamily: T.sans, fontWeight: 600, color: '#6941c6', letterSpacing: '0.06em', marginTop: 2 }}>MAX PAIN</div>}
                    </td>

                    {/* PE side */}
                    {showGreeks && (
                      <>
                        <GreekCell value={row.PE.delta} itm={isITM_PE} align="left" />
                        <IVCell iv={row.PE.iv} itm={isITM_PE} align="left" />
                      </>
                    )}
                    <LTPCell ltp={row.PE.ltp} chng={row.PE.absChng} itm={isITM_PE} align="left" />
                    <td style={{ padding: '7px 10px', textAlign: 'left', background: isITM_PE ? itmBg : 'transparent', color: T.ink2, fontFamily: T.mono }}>{fmtOI(row.PE.volume)}</td>
                    <OICell oi={row.PE.oi} oiChange={row.PE.oiChange} max={maxPEOI} side="PE" itm={isITM_PE} align="left" />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '8px 14px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.ink4, background: T.surface2, fontFamily: T.sans }}>
        <span>Black-76 · 6.5% risk-free rate · 30s cache</span>
        <span>Not investment advice</span>
      </div>
    </div>
  )
}

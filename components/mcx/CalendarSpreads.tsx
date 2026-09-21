'use client'

import { useState, useEffect, useMemo } from 'react'
import ProBlurGate from '@/components/ProBlurGate'
import { useIsPro } from '@/lib/useIsPro'
import { formatIST, formatRemaining } from '@/lib/formatTime'
import {
  spreadBetween, spreadPnl, daysBetween,
  type CurvePoint, type SpreadRow, type SpreadSide,
} from '@/lib/spreads'

// Calendar spreads tab of the Strategy Builder: same commodity, two futures
// expiries. Free: live curve + adjacent-month spreads. Pro: P&L calculator and
// margin for a chosen pair. Convention throughout: spread = far - near, and
// "buy spread" = buy far, sell near (see lib/spreads.ts).

interface CurveResponse {
  instrument:  string
  label:       string
  unit:        string
  lotSize:     number
  curve:       CurvePoint[]
  spreads:     SpreadRow[]
  marketOpen:  boolean
  lastUpdated: string
  asOfDate:    string
}

export interface SpreadInit {
  near?: string
  far?:  string
  side?: SpreadSide
  lots?: number
}

const REFRESH_MS = 60_000

const inr = (n: number, dp = 0) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n)

const signed = (n: number, dp = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${inr(Math.abs(n), dp)}`
const signedRs = (n: number, dp = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}₹${inr(Math.abs(n), dp)}`

const parseNum = (s: string): number | null => {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// Two significant figures keeps scenario steps readable at any price scale
// (gold moves in tens of rupees, natural gas in fractions of one).
const roundTo2Sig = (n: number) => Number(n.toPrecision(2))

const monthLabel = (expiry: string) =>
  new Date(`${expiry}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })

const cell: React.CSSProperties = { padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap' }
const head: React.CSSProperties = { ...cell, fontSize: 13, fontWeight: 600, color: 'var(--ink-2, #3A3830)' }
const box: React.CSSProperties = {
  border: '1px solid var(--border-2, #D4CFC0)', borderRadius: 6, background: 'var(--surface, #fff)',
}
const input: React.CSSProperties = {
  minHeight: 44, padding: '6px 10px', borderRadius: 5, fontSize: 16, boxSizing: 'border-box',
  border: '1px solid var(--border-2, #D4CFC0)', background: 'var(--surface, #fff)', color: 'inherit', width: '100%',
}
const label: React.CSSProperties = { display: 'block', fontSize: 13, color: 'var(--ink-2, #3A3830)', marginBottom: 4 }
const UP = 'var(--up, #1B7A4A)'
const DOWN = 'var(--down, #B53A2A)'

export default function CalendarSpreads({
  instrument, instrumentLabel, isPro = false, init,
}: {
  instrument: string
  instrumentLabel: string
  isPro?: boolean
  init?: SpreadInit
}) {
  const clientPro = useIsPro()
  const pro = isPro || clientPro

  const [data,       setData]       = useState<CurveResponse | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [nextOpenAt, setNextOpenAt] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  const [nearExp,   setNearExp]   = useState(init?.near ?? '')
  const [farExp,    setFarExp]    = useState(init?.far ?? '')
  const [side,      setSide]      = useState<SpreadSide>(init?.side ?? 'BUY')
  const [lots,      setLots]      = useState(String(init?.lots ?? 1))
  const [entryNear, setEntryNear] = useState('')
  const [entryFar,  setEntryFar]  = useState('')
  const [exitSpread, setExitSpread] = useState('')
  const [copied,    setCopied]    = useState(false)

  const [margin,      setMargin]      = useState<number | null>(null)
  const [marginState, setMarginState] = useState<'idle' | 'loading' | 'error'>('idle')

  // New instrument → drop the previous one's data and selections so nothing
  // from the old commodity shows while the new curve loads. `active` stops a
  // slow response for the previous instrument overwriting the new one.
  useEffect(() => {
    let active = true
    setData(null); setError(null); setLoading(true)
    setNearExp(init?.near ?? ''); setFarExp(init?.far ?? '')
    setEntryNear(''); setEntryFar(''); setExitSpread(''); setMargin(null)

    const run = async () => {
      try {
        const res = await fetch(`/api/spreads?instrument=${instrument}`)
        const json = await res.json()
        if (!active) return
        if (!res.ok) {
          setError(json.error ?? 'Spread data is temporarily unavailable.')
          setNextOpenAt(json.nextOpenAt ?? null)
          return
        }
        setData(json as CurveResponse)
        setError(null)
        setNextOpenAt(null)
      } catch {
        if (active) setError('Spread data is temporarily unavailable.')
      } finally {
        if (active) setLoading(false)
      }
    }
    run()
    const id = setInterval(run, REFRESH_MS)
    return () => { active = false; clearInterval(id) }
    // init only seeds the first load for this instrument
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instrument])

  const priced = useMemo(() => (data?.curve ?? []).filter(c => c.price != null), [data])

  // Keep the chosen pair valid: both months must have a live price, far later than near.
  useEffect(() => {
    if (!data) return
    const has = (e: string) => priced.some(c => c.expiry === e)
    if (has(nearExp) && has(farExp) && nearExp < farExp) return
    const pair = data.spreads.find(s => s.spread != null)
    if (pair) { setNearExp(pair.nearExpiry); setFarExp(pair.farExpiry) }
    else { setNearExp(''); setFarExp('') }
  }, [data, priced, nearExp, farExp])

  const nearPt = priced.find(c => c.expiry === nearExp)
  const farPt  = priced.find(c => c.expiry === farExp)
  const hasPair = nearPt != null && farPt != null
  const liveRow = nearPt && farPt ? spreadBetween(nearPt, farPt) : null

  const nearPx = parseNum(entryNear) ?? nearPt?.price ?? null
  const farPx  = parseNum(entryFar)  ?? farPt?.price  ?? null
  const entrySpread = nearPx != null && farPx != null ? farPx - nearPx : null
  const lotsN = Number.isInteger(Number(lots)) && Number(lots) > 0 ? Number(lots) : null
  const lotSize = data?.lotSize ?? 0
  const exitN = parseNum(exitSpread)

  const pnl = entrySpread != null && exitN != null && lotsN != null
    ? spreadPnl({ side, lots: lotsN, lotSize, entrySpread, exitSpread: exitN })
    : null

  const step = nearPx != null ? roundTo2Sig(nearPx * 0.0005) : null
  const scenarios = entrySpread != null && step != null && step > 0 && lotsN != null
    ? [-3, -2, -1, 1, 2, 3].map(k => {
        const exit = Number((entrySpread + k * step).toPrecision(8))
        return { exit, pnl: spreadPnl({ side, lots: lotsN, lotSize, entrySpread, exitSpread: exit }) }
      })
    : []

  const daysToNear = data && nearExp ? daysBetween(data.asOfDate, nearExp) : null

  // Margin for the chosen pair, as one basket. Pro-only server side; debounced.
  useEffect(() => {
    if (!pro || !hasPair || lotsN == null) { setMargin(null); setMarginState('idle'); return }
    let cancelled = false
    setMarginState('loading')
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/options/strategy-margin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instrument, expiry: nearExp,
            legs: [
              { strike: 0, type: 'FUT', action: side === 'BUY' ? 'BUY' : 'SELL', qty: lotsN, expiry: farExp },
              { strike: 0, type: 'FUT', action: side === 'BUY' ? 'SELL' : 'BUY', qty: lotsN, expiry: nearExp },
            ],
          }),
        })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json()
        if (cancelled) return
        if (typeof json.total !== 'number' || !Number.isFinite(json.total)) throw new Error('bad total')
        setMargin(json.total); setMarginState('idle')
      } catch {
        if (!cancelled) { setMargin(null); setMarginState('error') }
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [pro, instrument, nearExp, farExp, side, lotsN, hasPair])

  function copyLink() {
    if (!nearExp || !farExp) return
    const p = new URLSearchParams({ instrument, tab: 'spreads', near: nearExp, far: farExp, side, lots: String(lotsN ?? 1) })
    navigator.clipboard.writeText(`${window.location.origin}/options/strategy?${p}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }).catch(() => { /* clipboard blocked */ })
  }

  if (loading && !data) {
    return <div style={{ padding: '24px 0', fontSize: 16, color: 'var(--ink-2, #3A3830)' }}>Loading spreads…</div>
  }

  if (error && !data) {
    return (
      <div style={{ background: 'var(--down-bg, #FAF0EE)', border: `1px solid ${DOWN}`, borderRadius: 6, padding: '10px 14px', color: DOWN, fontSize: 15 }}>
        {error}
        {nextOpenAt && ` Market reopens in ${formatRemaining(new Date(nextOpenAt).getTime() - Date.now())}.`}
      </div>
    )
  }

  if (!data) return null

  const unit = data.unit
  const structureText = (s: SpreadRow['structure']) =>
    s === 'far-higher' ? 'Far month higher' : s === 'near-higher' ? 'Near month higher' : s === 'flat' ? 'Level' : ''

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--ink-2, #3A3830)', lineHeight: 1.5 }}>
        A calendar spread buys one month and sells another month of the same commodity. It is priced on the gap between
        the two, the far-month price minus the near-month price, rather than on the outright price.
      </p>

      {/* ── Free: live curve + adjacent spreads ── */}
      <div style={{ ...box, marginBottom: 16 }}>
        <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 16, borderBottom: '1px solid var(--border, #E3DECF)' }}>
          {instrumentLabel} futures by month
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: 'left' }}>Month</th>
                <th style={head}>Price (₹/{unit})</th>
                <th style={head}>Days left</th>
              </tr>
            </thead>
            <tbody>
              {data.curve.map(c => {
                const d = daysBetween(data.asOfDate, c.expiry)
                return (
                  <tr key={c.expiry} style={{ borderTop: '1px solid var(--border, #E3DECF)' }}>
                    <td style={{ ...cell, textAlign: 'left' }}>{monthLabel(c.expiry)} <span style={{ color: 'var(--ink-2, #3A3830)', fontSize: 13 }}>· {c.expiry}</span></td>
                    <td style={cell}>{c.price != null ? inr(c.price, 2) : <span title="No live price right now" style={{ color: 'var(--ink-2, #3A3830)' }}>Unavailable</span>}</td>
                    <td style={cell}>{d != null ? d : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...box, marginBottom: 12 }}>
        <div style={{ padding: '10px 14px', fontWeight: 600, fontSize: 16, borderBottom: '1px solid var(--border, #E3DECF)' }}>
          Calendar spreads, month to month
        </div>
        {data.spreads.length === 0 ? (
          <div style={{ padding: '12px 14px', fontSize: 15, color: 'var(--ink-2, #3A3830)' }}>
            Only one month is listed for {instrumentLabel} right now, so there is no calendar spread to show.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr>
                  <th style={{ ...head, textAlign: 'left' }}>Near → Far</th>
                  <th style={head}>Spread (₹/{unit})</th>
                  <th style={head}>% of near</th>
                  <th style={{ ...head, textAlign: 'left' }}>Shape</th>
                </tr>
              </thead>
              <tbody>
                {data.spreads.map(s => (
                  <tr key={s.nearExpiry + s.farExpiry} style={{ borderTop: '1px solid var(--border, #E3DECF)' }}>
                    <td style={{ ...cell, textAlign: 'left' }}>{monthLabel(s.nearExpiry)} → {monthLabel(s.farExpiry)}</td>
                    <td style={cell}>{s.spread != null ? signed(s.spread, 2) : <span title="A live price is needed on both months" style={{ color: 'var(--ink-2, #3A3830)' }}>Unavailable</span>}</td>
                    <td style={cell}>{s.spreadPct != null ? `${signed(s.spreadPct, 2)}%` : '—'}</td>
                    <td style={{ ...cell, textAlign: 'left' }}>{structureText(s.structure) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-2, #3A3830)', marginBottom: 20 }}>
        Updated {formatIST(data.lastUpdated)}
        {!data.marketOpen && ' · Market closed, prices are from the last session'}
        {' · '}A month with no recent trades shows as unavailable rather than a stale price.
      </div>

      {/* ── Pro: calculator + margin ── */}
      <ProBlurGate isPro={isPro} label="Spread calculator — P&L, scenarios and margin for any two months" timestamp="Live">
        <div style={{ ...box, padding: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>Spread calculator</div>

          {priced.length < 2 ? (
            <div style={{ fontSize: 15, color: 'var(--ink-2, #3A3830)' }}>
              Two months with a live price are needed. Check back when more months are trading.
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label} htmlFor="cs-near">Near month ({side === 'BUY' ? 'you sell' : 'you buy'})</label>
                  <select id="cs-near" value={nearExp} onChange={e => {
                    const v = e.target.value
                    setNearExp(v); setEntryNear(''); setEntryFar('')
                    if (farExp <= v) { const next = priced.find(c => c.expiry > v); if (next) setFarExp(next.expiry) }
                  }} style={input}>
                    {priced.slice(0, -1).map(c => <option key={c.expiry} value={c.expiry}>{monthLabel(c.expiry)} · {c.expiry}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="cs-far">Far month ({side === 'BUY' ? 'you buy' : 'you sell'})</label>
                  <select id="cs-far" value={farExp} onChange={e => { setFarExp(e.target.value); setEntryNear(''); setEntryFar('') }} style={input}>
                    {priced.filter(c => c.expiry > nearExp).map(c => <option key={c.expiry} value={c.expiry}>{monthLabel(c.expiry)} · {c.expiry}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="cs-lots">Lots (1 lot = {inr(lotSize)} × {unit})</label>
                  <input id="cs-lots" inputMode="numeric" value={lots} onChange={e => setLots(e.target.value)} style={input} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {(['BUY', 'SELL'] as const).map(s => (
                  <button key={s} onClick={() => setSide(s)}
                    style={{
                      minHeight: 44, padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 15,
                      fontWeight: side === s ? 700 : 400,
                      border: `1px solid ${s === 'BUY' ? UP : DOWN}`,
                      background: side === s ? (s === 'BUY' ? UP : DOWN) : 'transparent',
                      color: side === s ? '#fff' : (s === 'BUY' ? UP : DOWN),
                    }}>
                    {s === 'BUY' ? 'Buy spread (buy far, sell near)' : 'Sell spread (sell far, buy near)'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={label} htmlFor="cs-en">Near entry price (₹)</label>
                  <input id="cs-en" inputMode="decimal" placeholder={nearPt?.price != null ? inr(nearPt.price, 2) : ''} value={entryNear} onChange={e => setEntryNear(e.target.value)} style={input} />
                </div>
                <div>
                  <label style={label} htmlFor="cs-ef">Far entry price (₹)</label>
                  <input id="cs-ef" inputMode="decimal" placeholder={farPt?.price != null ? inr(farPt.price, 2) : ''} value={entryFar} onChange={e => setEntryFar(e.target.value)} style={input} />
                </div>
                <div>
                  <label style={label} htmlFor="cs-ex">Spread at exit (₹)</label>
                  <input id="cs-ex" inputMode="decimal" placeholder="e.g. the spread you expect" value={exitSpread} onChange={e => setExitSpread(e.target.value)} style={input} />
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2, #3A3830)', marginBottom: 12 }}>
                Entry prices start at the live prices; type your own to model a position you already hold.
              </div>

              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 15, marginBottom: 12 }}>
                <div>Entry spread: <strong>{entrySpread != null ? signedRs(entrySpread, 2) : '—'}</strong>
                  {liveRow?.spread != null && entrySpread != null && Math.abs(liveRow.spread - entrySpread) > 1e-9 && (
                    <span style={{ color: 'var(--ink-2, #3A3830)' }}> (live {signedRs(liveRow.spread, 2)})</span>
                  )}
                </div>
                <div>
                  P&amp;L at exit spread:{' '}
                  <strong style={{ color: pnl == null ? 'inherit' : pnl >= 0 ? UP : DOWN }}>
                    {pnl != null ? `${pnl >= 0 ? '+' : '−'}₹${inr(Math.abs(pnl))}` : '—'}
                  </strong>
                </div>
                <div>
                  Margin:{' '}
                  <strong>
                    {marginState === 'loading' ? '…' : margin != null ? `₹${inr(margin)}` : marginState === 'error' ? 'Unavailable' : '—'}
                  </strong>
                </div>
              </div>

              {scenarios.length > 0 && (
                <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                    <thead>
                      <tr>
                        <th style={{ ...head, textAlign: 'left' }}>If the spread ends at (₹)</th>
                        <th style={head}>P&amp;L (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarios.map(s => (
                        <tr key={s.exit} style={{ borderTop: '1px solid var(--border, #E3DECF)' }}>
                          <td style={{ ...cell, textAlign: 'left' }}>{signed(s.exit, 2)}</td>
                          <td style={{ ...cell, color: s.pnl == null ? 'inherit' : s.pnl >= 0 ? UP : DOWN }}>
                            {s.pnl != null ? `${s.pnl >= 0 ? '+' : '−'}${inr(Math.abs(s.pnl))}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {daysToNear != null && (
                <div style={{ fontSize: 14, color: 'var(--ink-2, #3A3830)', marginBottom: 12, lineHeight: 1.5 }}>
                  The near month expires in {daysToNear} day{daysToNear === 1 ? '' : 's'}. After that the hedge is gone
                  and the far-month position stands on its own, exposed to the outright price.
                </div>
              )}

              <button onClick={copyLink} disabled={!nearExp || !farExp}
                style={{ minHeight: 44, padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-2, #D4CFC0)', background: 'var(--surface, #fff)', cursor: 'pointer', fontSize: 15 }}>
                {copied ? 'Link copied' : 'Copy link to this spread'}
              </button>
            </>
          )}
        </div>
      </ProBlurGate>

      <p style={{ fontSize: 13, color: 'var(--ink-2, #3A3830)', margin: '12px 0 0', lineHeight: 1.5 }}>
        For education only, not investment advice. Spread P&amp;L is shown before brokerage and charges, and the spread
        can move against either side.
      </p>
    </div>
  )
}

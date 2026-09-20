'use client'

import { useMemo, useRef, useState } from 'react'
import { parseBhavcopyAsync, sniffBinaryKind, BhavcopyParseError, type ParsedBhavcopy } from '@/lib/bhavcopyParse'
import { summariseBhavcopy, filterContracts, type BhavcopySummary, type ContractFilter } from '@/lib/bhavcopyStats'

// Everything here runs in the visitor's browser. The file is read locally and never sent anywhere.

const MAX_BYTES = 60 * 1024 * 1024
const PAGE = 200

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`
}
const fmt = (n: number, dp = 0) => n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp })

const num: React.CSSProperties = { fontFamily: 'var(--font-sans)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }
const th: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '0.75rem', color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  background: 'var(--surface-2)',
}
const td: React.CSSProperties = { padding: '8px 10px', fontSize: '0.85rem', color: 'var(--ink-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
const control: React.CSSProperties = {
  minHeight: 44, padding: '0 0.75rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--ink)', fontSize: '0.9rem', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
}
const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, minHeight: 44, cursor: 'pointer', color: 'var(--gold)',
  fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'left',
}
const h2: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', margin: '0 0 0.5rem' }

function Table({ children, min = 640 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
      <table style={{ width: '100%', minWidth: min, borderCollapse: 'collapse' }}>{children}</table>
    </div>
  )
}

export default function BhavcopyViewer() {
  const [status, setStatus] = useState<'idle' | 'reading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<ParsedBhavcopy | null>(null)
  const [summary, setSummary] = useState<BhavcopySummary | null>(null)
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [filter, setFilter] = useState<ContractFilter>({})
  const [limit, setLimit] = useState(PAGE)
  const contractsRef = useRef<HTMLDivElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    setStatus('reading')
    setError('')
    try {
      if (file.size === 0) throw new BhavcopyParseError('The file is empty.')
      if (file.size > MAX_BYTES) throw new BhavcopyParseError('This file is larger than expected for a bhavcopy. Please use the single-day file.')
      const binary = sniffBinaryKind(new Uint8Array(await file.slice(0, 4).arrayBuffer()))
      if (binary) throw new BhavcopyParseError(binary)
      const text = await file.text()
      const p = await parseBhavcopyAsync(text) // chunked, so a 15 MB file never freezes the page
      setParsed(p)
      setSummary(summariseBhavcopy(p))
      setFilter({})
      setLimit(PAGE)
      setStatus('ready')
    } catch (e) {
      setParsed(null)
      setSummary(null)
      setError(e instanceof BhavcopyParseError ? e.message : 'This file could not be read. Please use the bhavcopy file exactly as downloaded.')
      setStatus('error')
    }
  }

  const rows = useMemo(() => (parsed ? filterContracts(parsed.rows, filter) : []), [parsed, filter])
  const symbols = useMemo(() => (parsed ? [...new Set(parsed.rows.map(r => r.symbol))].sort() : []), [parsed])
  const expiries = useMemo(() => {
    if (!parsed) return []
    const m = new Map<string, string>()
    for (const r of parsed.rows) if (!filter.symbol || r.symbol === filter.symbol) m.set(r.expiry, r.expiryISO)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([e]) => e)
  }, [parsed, filter.symbol])

  function jumpTo(next: ContractFilter) {
    setFilter(next)
    setLimit(PAGE)
    contractsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const patch = (p: ContractFilter) => { setFilter(f => ({ ...f, ...p })); setLimit(PAGE) }

  const picker = (
    <label
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textAlign: 'center',
        position: 'relative', minHeight: 120, padding: '1rem', borderRadius: 8, cursor: 'pointer', boxSizing: 'border-box',
        outline: focused ? '2px solid var(--gold)' : 'none', outlineOffset: 2,
        border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`, background: dragging ? 'var(--surface-2)' : 'var(--surface)',
      }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); void handleFile(e.dataTransfer.files?.[0]) }}
    >
      <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem' }}>
        {status === 'ready' ? 'Choose another bhavcopy file' : 'Choose your bhavcopy file'}
      </span>
      <span style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>or drop it here · .xls or .csv, one trading day</span>
      <input
        type="file"
        accept=".xls,.csv,.htm,.html,text/csv,application/vnd.ms-excel"
        onChange={e => { void handleFile(e.target.files?.[0]); e.target.value = '' }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
      />
    </label>
  )

  // minmax(0, 1fr): without it a grid column will not shrink below its widest child, so the wide tables
  // would stretch the whole layout past the screen on a phone instead of scrolling inside their wrappers.
  return (
    <section aria-label="Bhavcopy viewer" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.25rem', fontFamily: 'var(--font-sans)' }}>
      {picker}
      <p style={{ margin: '-0.5rem 0 0', fontSize: '0.78rem', color: 'var(--ink-3)' }}>
        Processed in your browser. The file is not uploaded and BhaavBrief does not keep it.
      </p>

      {status === 'reading' && <p role="status" style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-2)' }}>Reading file…</p>}
      {status === 'error' && (
        <p role="alert" style={{ margin: 0, padding: '10px 12px', border: '1px solid var(--down)', borderRadius: 6, fontSize: '0.88rem', color: 'var(--down)' }}>
          {error}
        </p>
      )}

      {status === 'ready' && parsed && summary && (
        <>
          <div>
            <h2 style={{ ...h2, fontSize: '1.15rem' }}>Bhavcopy for {dateLabel(summary.date)}</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink-3)' }}>
              {fmt(summary.totalContracts)} contracts in the file, {fmt(summary.activeContracts)} with volume or open interest.
            </p>
          </div>

          <div>
            <h2 style={h2}>Futures</h2>
            <Table min={680}>
              <thead>
                <tr>
                  <th style={th}>Commodity</th><th style={th}>Near expiry</th>
                  <th style={{ ...th, textAlign: 'right' }}>Close</th><th style={{ ...th, textAlign: 'right' }}>Change</th>
                  <th style={{ ...th, textAlign: 'right' }}>Open interest (lots)</th><th style={{ ...th, textAlign: 'right' }}>Value (lakh)</th>
                </tr>
              </thead>
              <tbody>
                {summary.futures.map(f => (
                  <tr key={f.instrument + f.symbol}>
                    <td style={td}><button type="button" style={linkBtn} onClick={() => jumpTo({ symbol: f.symbol, kind: 'FUT' })}>{f.symbol}</button></td>
                    <td style={td}>{f.nearExpiry}</td>
                    <td style={{ ...td, ...num }}>{fmt(f.close, 2)}</td>
                    <td style={{ ...td, ...num, color: f.changePct == null || f.changePct === 0 ? 'var(--ink-3)' : f.changePct > 0 ? 'var(--up)' : 'var(--down)' }}>
                      {f.changePct == null ? '—' : `${f.changePct > 0 ? '+' : ''}${fmt(f.changePct, 2)}%`}
                    </td>
                    <td style={{ ...td, ...num }}>{fmt(f.totalOiLots)}</td>
                    <td style={{ ...td, ...num }}>{fmt(f.valueLacs, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
              Close and change are for the nearest listed expiry; open interest and value add up every listed expiry of that commodity.
            </p>
          </div>

          {summary.options.length > 0 && (
            <div>
              <h2 style={h2}>Options</h2>
              <Table min={620}>
                <thead>
                  <tr>
                    <th style={th}>Commodity</th><th style={th}>Expiry</th>
                    <th style={{ ...th, textAlign: 'right' }}>Call OI (lots)</th><th style={{ ...th, textAlign: 'right' }}>Put OI (lots)</th>
                    <th style={{ ...th, textAlign: 'right' }}>PCR</th><th style={{ ...th, textAlign: 'right' }}>Max pain</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.options.map(o => (
                    <tr key={o.symbol + o.expiry}>
                      <td style={td}><button type="button" style={linkBtn} onClick={() => jumpTo({ symbol: o.symbol, kind: 'OPT', expiry: o.expiry })}>{o.symbol}</button></td>
                      <td style={td}>{o.expiry}</td>
                      <td style={{ ...td, ...num }}>{fmt(o.ceOi)}</td>
                      <td style={{ ...td, ...num }}>{fmt(o.peOi)}</td>
                      <td style={{ ...td, ...num }}>{o.pcr == null ? '—' : fmt(o.pcr, 2)}</td>
                      <td style={{ ...td, ...num }}>{o.maxPain == null ? '—' : fmt(o.maxPain)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                PCR compares put open interest with call open interest. Max pain is the strike where option writers would pay out least, given that day&apos;s open interest.
              </p>
            </div>
          )}

          <div ref={contractsRef} style={{ scrollMarginTop: 80 }}>
            <h2 style={h2}>Contracts</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 8 }}>
              <input
                type="search" aria-label="Search contracts" placeholder="Search symbol, expiry, strike"
                value={filter.query ?? ''} onChange={e => patch({ query: e.target.value })} style={control}
              />
              <select aria-label="Commodity" value={filter.symbol ?? ''} onChange={e => patch({ symbol: e.target.value || undefined, expiry: undefined })} style={control}>
                <option value="">All commodities</option>
                {symbols.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select aria-label="Contract type" value={filter.kind ?? ''} onChange={e => patch({ kind: (e.target.value || undefined) as ContractFilter['kind'] })} style={control}>
                <option value="">Futures and options</option>
                <option value="FUT">Futures</option>
                <option value="OPT">Options</option>
              </select>
              <select aria-label="Expiry" value={filter.expiry ?? ''} onChange={e => patch({ expiry: e.target.value || undefined })} style={control}>
                <option value="">All expiries</option>
                {expiries.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select aria-label="Sort by" value={filter.sortBy ?? 'volumeLots'} onChange={e => patch({ sortBy: e.target.value as ContractFilter['sortBy'] })} style={control}>
                <option value="volumeLots">Sort: volume (lots)</option>
                <option value="oiLots">Sort: open interest</option>
                <option value="valueLacs">Sort: value</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, fontSize: '0.85rem', color: 'var(--ink-2)' }}>
              <input type="checkbox" checked={!!filter.includeInactive} onChange={e => patch({ includeInactive: e.target.checked })} style={{ width: 18, height: 18 }} />
              Include contracts with no volume and no open interest
            </label>

            <Table min={860}>
              <thead>
                <tr>
                  <th style={th}>Commodity</th><th style={th}>Expiry</th><th style={th}>Type</th>
                  <th style={{ ...th, textAlign: 'right' }}>Strike</th><th style={{ ...th, textAlign: 'right' }}>Close</th><th style={{ ...th, textAlign: 'right' }}>Prev close</th>
                  <th style={{ ...th, textAlign: 'right' }}>Volume (lots)</th><th style={{ ...th, textAlign: 'right' }}>Volume (’000)</th>
                  <th style={{ ...th, textAlign: 'right' }}>OI (lots)</th><th style={{ ...th, textAlign: 'right' }}>Value (lakh)</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((r, i) => (
                  <tr key={`${r.instrument}${r.symbol}${r.expiry}${r.optionType}${r.strike}${i}`}>
                    <td style={td}>{r.symbol}</td>
                    <td style={td}>{r.expiry}</td>
                    <td style={td}>{r.optionType ?? 'FUT'}</td>
                    <td style={{ ...td, ...num }}>{r.strike == null ? '—' : fmt(r.strike)}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.close, 2)}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.prevClose, 2)}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.volumeLots)}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.volumeQty, 3)} {r.unit}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.oiLots)}</td>
                    <td style={{ ...td, ...num }}>{fmt(r.valueLacs, 2)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td style={{ ...td, whiteSpace: 'normal' }} colSpan={10}>No contracts match these filters.</td></tr>
                )}
              </tbody>
            </Table>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-3)' }}>Showing {fmt(Math.min(limit, rows.length))} of {fmt(rows.length)}</span>
              {rows.length > limit && (
                <button type="button" style={{ ...control, cursor: 'pointer', fontWeight: 600 }} onClick={() => setLimit(l => l + PAGE)}>Show more</button>
              )}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
              Figures are exactly as printed in the file. Volume is given in lots and in thousands of each contract&apos;s own unit, so volumes of different commodities cannot be added together.
            </p>
          </div>
        </>
      )}
    </section>
  )
}

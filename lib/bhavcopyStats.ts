/**
 * lib/bhavcopyStats.ts — summaries computed from one parsed bhavcopy (see lib/bhavcopyParse.ts).
 *
 * Client-safe and pure. Rules that come from the shape of the file:
 *  - Volume is in different units per commodity (kg, barrels, mmBtu, …), so volume is
 *    never summed across commodities.
 *  - "Value(Lacs)" is not summed across contracts of different kinds either: on option rows it is
 *    far larger than premium x quantity (it looks like a notional figure), so adding it to futures
 *    turnover would mix two different things. It is shown per contract exactly as the file gives it.
 *  - A single day's file has no open-interest CHANGE, so none is reported here.
 */

import { calculateMaxPain } from '@/lib/black76'
import type { BhavRow, ParsedBhavcopy } from '@/lib/bhavcopyParse'

export interface FuturesSummary {
  symbol: string
  instrument: string
  unit: string
  /** Earliest expiry listed for this symbol on the file's date. */
  nearExpiry: string
  close: number
  prevClose: number
  /** null when the previous close is not positive. */
  changePct: number | null
  /** Volume of the near contract, in lots. */
  volumeLots: number
  /** Open interest across every listed expiry, in lots. */
  totalOiLots: number
  /** Value across every listed expiry of this futures symbol, in lakh, as the file gives it. */
  valueLacs: number
}

export interface OptionsSummary {
  symbol: string
  expiry: string
  expiryISO: string
  ceOi: number
  peOi: number
  /** Put OI / Call OI; null when there is no call OI. */
  pcr: number | null
  /** null when there is no open interest to weigh. */
  maxPain: number | null
}

export interface BhavcopySummary {
  date: string
  totalContracts: number
  /** Contracts with any volume or open interest. */
  activeContracts: number
  futures: FuturesSummary[]
  options: OptionsSummary[]
}

const isFuture = (r: BhavRow) => r.optionType === null
const isActive = (r: BhavRow) => r.volumeLots > 0 || r.oiLots > 0

function round(n: number, dp: number): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function summariseFutures(rows: BhavRow[]): FuturesSummary[] {
  const bySymbol = new Map<string, BhavRow[]>()
  for (const r of rows) {
    if (!isFuture(r)) continue
    const key = `${r.instrument}|${r.symbol}`
    const list = bySymbol.get(key)
    if (list) list.push(r)
    else bySymbol.set(key, [r])
  }

  const out: FuturesSummary[] = []
  for (const list of bySymbol.values()) {
    const sorted = [...list].sort((a, b) => a.expiryISO.localeCompare(b.expiryISO))
    const near = sorted[0]
    out.push({
      symbol: near.symbol,
      instrument: near.instrument,
      unit: near.unit,
      nearExpiry: near.expiry,
      close: near.close,
      prevClose: near.prevClose,
      changePct: near.prevClose > 0 ? round(((near.close - near.prevClose) / near.prevClose) * 100, 2) : null,
      volumeLots: near.volumeLots,
      totalOiLots: sorted.reduce((s, r) => s + r.oiLots, 0),
      valueLacs: round(sorted.reduce((s, r) => s + r.valueLacs, 0), 2),
    })
  }
  return out.sort((a, b) => b.valueLacs - a.valueLacs || a.symbol.localeCompare(b.symbol))
}

function summariseOptions(rows: BhavRow[]): OptionsSummary[] {
  const groups = new Map<string, BhavRow[]>()
  for (const r of rows) {
    if (isFuture(r)) continue
    const key = `${r.symbol}|${r.expiry}`
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }

  const out: OptionsSummary[] = []
  for (const list of groups.values()) {
    let ceOi = 0
    let peOi = 0
    let anyValue = false
    const strikes = new Map<number, { ce: number; pe: number }>()
    for (const r of list) {
      if (r.valueLacs > 0) anyValue = true
      if (r.strike === null) continue
      const s = strikes.get(r.strike) ?? { ce: 0, pe: 0 }
      if (r.optionType === 'CE') { s.ce += r.oiLots; ceOi += r.oiLots } else { s.pe += r.oiLots; peOi += r.oiLots }
      strikes.set(r.strike, s)
    }
    // An expiry with no open interest and no traded value carries nothing to summarise.
    if (ceOi + peOi === 0 && !anyValue) continue

    const chain = [...strikes.entries()].map(([strike, v]) => ({ strike, CE: { oi: v.ce }, PE: { oi: v.pe } }))
    out.push({
      symbol: list[0].symbol,
      expiry: list[0].expiry,
      expiryISO: list[0].expiryISO,
      ceOi,
      peOi,
      pcr: ceOi > 0 ? round(peOi / ceOi, 2) : null,
      maxPain: ceOi + peOi > 0 ? calculateMaxPain(chain) : null,
    })
  }
  return out.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.expiryISO.localeCompare(b.expiryISO))
}

export function summariseBhavcopy(parsed: ParsedBhavcopy): BhavcopySummary {
  const { rows } = parsed
  return {
    date: parsed.date,
    totalContracts: rows.length,
    activeContracts: rows.filter(isActive).length,
    futures: summariseFutures(rows),
    options: summariseOptions(rows),
  }
}

export interface ContractFilter {
  symbol?: string
  /** 'FUT' = futures, 'OPT' = options, undefined = both. */
  kind?: 'FUT' | 'OPT'
  expiry?: string
  /** Case-insensitive substring match on symbol, expiry and strike. */
  query?: string
  /** When false (default), contracts with no volume and no open interest are hidden. */
  includeInactive?: boolean
  /** Sort key, highest first. Defaults to volume in lots. */
  sortBy?: 'volumeLots' | 'oiLots' | 'valueLacs'
}

/** Filter, then sort highest-first by the chosen key (default: volume in lots). */
export function filterContracts(rows: BhavRow[], f: ContractFilter): BhavRow[] {
  const q = f.query?.trim().toLowerCase()
  const key = f.sortBy ?? 'volumeLots'
  return rows
    .filter(r => {
      if (!f.includeInactive && !isActive(r)) return false
      if (f.symbol && r.symbol !== f.symbol) return false
      if (f.kind === 'FUT' && !isFuture(r)) return false
      if (f.kind === 'OPT' && isFuture(r)) return false
      if (f.expiry && r.expiry !== f.expiry) return false
      if (q) {
        const hay = `${r.symbol} ${r.expiry} ${r.strike ?? ''} ${r.optionType ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => b[key] - a[key] || b.oiLots - a.oiLots || b.volumeLots - a.volumeLots)
}

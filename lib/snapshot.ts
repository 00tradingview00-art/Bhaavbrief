/**
 * lib/snapshot.ts — single reader for data/market-snapshot.json
 *
 * This is the ONLY place UI code reads price data.
 * Only scripts/fetch-snapshot.mjs may WRITE the file.
 *
 * All routes and pages import from here, not from lib/prices.ts.
 */

import fs from 'fs'
import path from 'path'
import type { PriceData } from './prices'

export interface SnapshotInstrument {
  price:     number
  prevClose: number
  changePct: number
  unit:      string
  stale?:    boolean
}

export interface Snapshot {
  generatedAt:    string
  generatedAtIST: string
  source:         string
  instruments: {
    MCX_GOLD:    SnapshotInstrument
    MCX_SILVER:  SnapshotInstrument
    MCX_CRUDE:   SnapshotInstrument
    MCX_COPPER:  SnapshotInstrument
    MCX_NATGAS:  SnapshotInstrument
    USDINR:      SnapshotInstrument
    COMEX_GOLD:  SnapshotInstrument
    COMEX_SILVER:SnapshotInstrument
    WTI:         SnapshotInstrument
    BRENT:       SnapshotInstrument
    HENRY_HUB:   SnapshotInstrument
    [key: string]: SnapshotInstrument
  }
  derived: {
    importParityGoldINR:   number
    mcxComexGoldSpreadPct: number
    goldSilverRatio:       number
  }
}

export function loadSnapshot(): Snapshot | null {
  try {
    const file = path.join(process.cwd(), 'data/market-snapshot.json')
    if (!fs.existsSync(file)) return null
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Snapshot
  } catch { return null }
}

export function snapshotAgeMinutes(snap: Snapshot): number {
  return (Date.now() - new Date(snap.generatedAt).getTime()) / 60000
}

function isMCXOpenNow(): boolean {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const day = ist.getDay()
  if (day === 0 || day === 6) return false
  const mins = ist.getHours() * 60 + ist.getMinutes()
  return mins >= 540 && mins <= 1410 // 9:00–23:30 IST
}

// Maps snapshot to the PriceData shape that existing components expect.
// changePct is read from snapshot as-is — never recomputed here.
export function snapshotToPriceData(snap: Snapshot): PriceData {
  const i = snap.instruments
  const ageMin     = snapshotAgeMinutes(snap)
  const marketOpen = isMCXOpenNow()
  // delayed = >2h during market hours (amber badge); grey = >12h (stop showing)
  const snapshotStale = marketOpen ? ageMin > 120 : ageMin > 720

  function mcxRow(key: string) {
    const d = i[key] ?? { price: 0, prevClose: 0, changePct: 0 }
    return {
      mcx:          d.price,
      mcxChangePct: d.changePct,
      mcxChange:    d.price > 0 && d.prevClose > 0 ? d.price - d.prevClose : 0,
      mcxOpen:      0,
      mcxHigh:      0,
      mcxLow:       0,
      mcxPrevClose: d.prevClose,
      mcxVolume:    0,
      mcxOI:        0,
      mcxSymbol:    '',
      mcxExpiry:    '',
    }
  }

  return {
    source:          (snap.source?.includes('kite') ? 'kite+stooq' : 'stooq') as PriceData['source'],
    updatedAt:       snap.generatedAt,
    generatedAtIST:  snap.generatedAtIST,
    snapshotStale,
    marketOpen,

    usdinr:          i.USDINR?.price          ?? 0,
    usdinrChangePct: i.USDINR?.changePct       ?? 0,

    comexGold:       i.COMEX_GOLD?.price       ?? 0,
    comexSilver:     i.COMEX_SILVER?.price     ?? 0,
    wti:             i.WTI?.price              ?? 0,
    brent:           i.BRENT?.price            ?? 0,
    comexCopper:     0,
    henryHub:        i.HENRY_HUB?.price        ?? 0,
    goldComexPct:    i.COMEX_GOLD?.changePct   ?? 0,
    silverComexPct:  i.COMEX_SILVER?.changePct ?? 0,
    crudePct:        i.WTI?.changePct          ?? 0,
    brentPct:        i.BRENT?.changePct        ?? 0,
    copperComexPct:  0,
    gasPct:          i.HENRY_HUB?.changePct    ?? 0,

    gold: {
      ...mcxRow('MCX_GOLD'),
      comex:          i.COMEX_GOLD?.price     ?? 0,
      comexChangePct: i.COMEX_GOLD?.changePct ?? 0,
    },
    silver: {
      ...mcxRow('MCX_SILVER'),
      comex:          i.COMEX_SILVER?.price     ?? 0,
      comexChangePct: i.COMEX_SILVER?.changePct ?? 0,
    },
    crude: {
      ...mcxRow('MCX_CRUDE'),
      wti:            i.WTI?.price       ?? 0,
      wtiChangePct:   i.WTI?.changePct   ?? 0,
      brent:          i.BRENT?.price     ?? 0,
      brentChangePct: i.BRENT?.changePct ?? 0,
    },
    copper:    mcxRow('MCX_COPPER'),
    natgas:    mcxRow('MCX_NATGAS'),
    aluminium: { lme: 0, lmeChangePct: 0 },
  }
}

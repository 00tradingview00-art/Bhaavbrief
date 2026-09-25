import fs from 'fs'
import path from 'path'
import {
  computeImportParityCrudeINR,
  computeSpreadPct,
} from './parity.mjs'

export interface BasisConstituents {
  mcx:       number | null
  benchmark: number | null
  usdinr:    number | null
}

export interface BasisPoint {
  date: string
  goldSpreadPct:   number | null
  silverSpreadPct: number | null
  crudeSpreadPct:  number | null
  copperSpreadPct: number | null
  // Duty-inclusive versions of the three spreads above — same underlying
  // benchmark/FX inputs, with the commodity's real import duty applied, so
  // the number actually means "import parity" the way every other page on
  // this site defines it (see data/commodity-constants.json, and the
  // app/commodities/[commodity]/page.tsx "Duty-inclusive import parity"
  // stat). goldSpreadPct/silverSpreadPct/crudeSpreadPct above are left
  // untouched — they're consumed by the gate, brief generator, email and
  // reel pipeline (scripts/fetch-snapshot.mjs derived.*, checkParityWedge)
  // and must keep meaning exactly what they mean today.
  goldDutySpreadPct:   number | null
  silverDutySpreadPct: number | null
  crudeDutySpreadPct:  number | null
  gold:   BasisConstituents
  silver: BasisConstituents
  crude:  BasisConstituents
}

// MCX COMEX copper (COMEX HG=F) is not in the history feed.
// When a COMEX_COPPER field is added to history files, add computeImportParityCopperINR here.

// Canonical duty factors — data/commodity-constants.json is this repo's
// single source of truth for these (its own header comment says so).
// Loaded once per getBasisHistory() call, not per-file.
function loadDutyFactors(): { gold?: number; silver?: number; crude?: number } {
  try {
    const file = path.join(process.cwd(), 'data', 'commodity-constants.json')
    const consts = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return {
      gold:   consts.gold?.importDutyFactorEffective,
      silver: consts.silver?.importDutyFactor,
      crude:  consts.crude?.importDutyFactor,
    }
  } catch {
    return {}
  }
}

// `limit`, when passed, reads only the most recent `limit` files instead of
// every file in data/history/ — the directory grows by one file per trading
// day forever, and one caller (app/tools/mcx-basis) only ever displays the
// single most recent entry. app/basis/page.tsx needs a broader window (and
// a full-history chart), so it calls this with no argument, unchanged.
export function getBasisHistory(limit?: number): BasisPoint[] {
  const historyDir = path.join(process.cwd(), 'data', 'history')
  let files: string[]
  try {
    files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json')).sort()
  } catch {
    return []
  }
  if (limit != null) files = files.slice(-limit)

  const duty = loadDutyFactors()
  const points: BasisPoint[] = []

  for (const file of files) {
    try {
      const raw  = fs.readFileSync(path.join(historyDir, file), 'utf-8')
      const data = JSON.parse(raw) as {
        instruments?: Record<string, { price?: number }>
        derived?: {
          mcxComexGoldSpreadPct?:   number
          mcxComexSilverSpreadPct?: number
          importParityGoldINR?:     number
          importParitySilverINR?:   number
        }
      }

      const inst    = data.instruments ?? {}
      const derived = data.derived ?? {}

      const mcxGold   = inst.MCX_GOLD?.price
      const mcxSilver = inst.MCX_SILVER?.price
      const mcxCrude  = inst.MCX_CRUDE?.price
      const wti       = inst.WTI?.price
      const usdinr    = inst.USDINR?.price

      const crudeParityINR = (wti && usdinr) ? computeImportParityCrudeINR(wti, usdinr) : 0
      const crudeSpread    = (mcxCrude && crudeParityINR > 0)
        ? computeSpreadPct(mcxCrude, crudeParityINR)
        : null

      // Same raw parity prices already computed upstream, with the
      // commodity's real import duty applied — see the BasisPoint comment
      // above for why this doesn't touch derived.mcxComex*SpreadPct.
      const goldDutySpread = (mcxGold && derived.importParityGoldINR && duty.gold)
        ? computeSpreadPct(mcxGold, derived.importParityGoldINR * duty.gold)
        : null
      const silverDutySpread = (mcxSilver && derived.importParitySilverINR && duty.silver)
        ? computeSpreadPct(mcxSilver, derived.importParitySilverINR * duty.silver)
        : null
      const crudeDutySpread = (mcxCrude && crudeParityINR > 0 && duty.crude)
        ? computeSpreadPct(mcxCrude, crudeParityINR * duty.crude)
        : null

      points.push({
        date:                file.replace('.json', ''),
        goldSpreadPct:       derived.mcxComexGoldSpreadPct   ?? null,
        silverSpreadPct:     derived.mcxComexSilverSpreadPct ?? null,
        crudeSpreadPct:      crudeSpread,
        copperSpreadPct:     null,
        goldDutySpreadPct:   goldDutySpread,
        silverDutySpreadPct: silverDutySpread,
        crudeDutySpreadPct:  crudeDutySpread,
        gold:   { mcx: mcxGold   ?? null, benchmark: inst.COMEX_GOLD?.price   ?? null, usdinr: usdinr ?? null },
        silver: { mcx: mcxSilver ?? null, benchmark: inst.COMEX_SILVER?.price ?? null, usdinr: usdinr ?? null },
        crude:  { mcx: mcxCrude  ?? null, benchmark: wti ?? null,                      usdinr: usdinr ?? null },
      })
    } catch {
      // skip malformed files
    }
  }

  return points
}

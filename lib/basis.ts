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
  gold:   BasisConstituents
  silver: BasisConstituents
  crude:  BasisConstituents
}

// MCX COMEX copper (COMEX HG=F) is not in the history feed.
// When a COMEX_COPPER field is added to history files, add computeImportParityCopperINR here.

export function getBasisHistory(): BasisPoint[] {
  const historyDir = path.join(process.cwd(), 'data', 'history')
  let files: string[]
  try {
    files = fs.readdirSync(historyDir).filter(f => f.endsWith('.json')).sort()
  } catch {
    return []
  }

  const points: BasisPoint[] = []

  for (const file of files) {
    try {
      const raw  = fs.readFileSync(path.join(historyDir, file), 'utf-8')
      const data = JSON.parse(raw) as {
        instruments?: Record<string, { price?: number }>
        derived?: {
          mcxComexGoldSpreadPct?:   number
          mcxComexSilverSpreadPct?: number
        }
      }

      const inst    = data.instruments ?? {}
      const derived = data.derived ?? {}

      const mcxCrude = inst.MCX_CRUDE?.price
      const wti      = inst.WTI?.price
      const usdinr   = inst.USDINR?.price

      const crudeParityINR = (wti && usdinr) ? computeImportParityCrudeINR(wti, usdinr) : 0
      const crudeSpread    = (mcxCrude && crudeParityINR > 0)
        ? computeSpreadPct(mcxCrude, crudeParityINR)
        : null

      points.push({
        date:            file.replace('.json', ''),
        goldSpreadPct:   derived.mcxComexGoldSpreadPct   ?? null,
        silverSpreadPct: derived.mcxComexSilverSpreadPct ?? null,
        crudeSpreadPct:  crudeSpread,
        copperSpreadPct: null,
        gold:   { mcx: inst.MCX_GOLD?.price   ?? null, benchmark: inst.COMEX_GOLD?.price   ?? null, usdinr: usdinr ?? null },
        silver: { mcx: inst.MCX_SILVER?.price ?? null, benchmark: inst.COMEX_SILVER?.price ?? null, usdinr: usdinr ?? null },
        crude:  { mcx: mcxCrude ?? null,               benchmark: wti ?? null,                      usdinr: usdinr ?? null },
      })
    } catch {
      // skip malformed files
    }
  }

  return points
}

import fs from 'node:fs'
import path from 'node:path'

export interface StandardLotSizes {
  gold: number; silver: number; crude: number; natgas: number; copper: number
}

/**
 * Standard-contract lot sizes for the five commodities that have a
 * canonical entry in data/commodity-constants.json — read from there, not
 * hand-copied, so a consuming page can't silently drift the way
 * app/learn/mcx-margin-calculator's Copper row once did (it said 1,000 kg;
 * the canonical file has always said 2,500 kg). Used by
 * mcx-margin-calculator and mcx-lot-sizes. Mini/Micro variants and the
 * four base metals (zinc/aluminium/lead/nickel) have no lot size in
 * commodity-constants.json yet, so those stay as editorial constants in
 * each consuming page, not migrated here.
 */
export function loadStandardLotSizes(): StandardLotSizes {
  const c = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/commodity-constants.json'), 'utf8'))
  return {
    gold:   (c.gold.mcxContractSizeGrams ?? 1000) / 10, // page quotes gold per 10g
    silver: c.silver.mcxLotSizeKg,
    crude:  c.crude.mcxLotSizeBarrels,
    natgas: c.natgas.mcxLotSizeMMBtu,
    copper: c.copper.mcxLotSizeKg,
  }
}

/** The standard-lot tick value (₹/lot per tick) for one commodity, from the canonical file. */
export function loadTickValuePerLot(commodity: string): number {
  const c = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/commodity-constants.json'), 'utf8'))
  return c[commodity]?.tickValuePerLotINR
}

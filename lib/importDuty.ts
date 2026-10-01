import fs from 'fs'
import path from 'path'

export type DutyCommodity = 'gold' | 'silver' | 'crude'
export type DutyFactors = Partial<Record<DutyCommodity, number>>

/**
 * Import-duty factors from data/commodity-constants.json, the single source of
 * truth for them. Gold uses its effective factor (customs + AIDC + cess).
 * Missing or invalid values are left out — callers decide whether to skip the
 * duty-inclusive figure or fall back.
 *
 * Shared by app/commodities/[commodity]/page.tsx (live duty-inclusive parity)
 * and lib/basis.ts (duty-inclusive spread history), which previously each
 * read the file and applied the factor inline.
 */
export function loadDutyFactors(file = path.join(process.cwd(), 'data', 'commodity-constants.json')): DutyFactors {
  try {
    const consts = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const factors: DutyFactors = {}
    const read = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined)
    const gold = read(consts.gold?.importDutyFactorEffective)
    const silver = read(consts.silver?.importDutyFactor)
    const crude = read(consts.crude?.importDutyFactor)
    if (gold) factors.gold = gold
    if (silver) factors.silver = silver
    if (crude) factors.crude = crude
    return factors
  } catch {
    return {}
  }
}

/**
 * Raw import parity (lib/parity.mjs output, no duty) → duty-inclusive
 * reference price, unrounded. Null when either input is missing, so a failed
 * upstream fetch never turns into a real-looking price.
 */
export function dutyInclusiveParity(rawParityINR: number | null | undefined, dutyFactor: number | null | undefined): number | null {
  if (!rawParityINR || !(rawParityINR > 0) || !dutyFactor || !(dutyFactor > 0)) return null
  return rawParityINR * dutyFactor
}

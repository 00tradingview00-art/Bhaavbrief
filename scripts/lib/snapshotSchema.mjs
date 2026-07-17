/**
 * scripts/lib/snapshotSchema.mjs — C-02 typed data contract for
 * data/market-snapshot.json. Validates field presence, type, and a
 * plausible range before the snapshot is written — a contract violation
 * quarantines the write (scripts/fetch-snapshot.mjs keeps the last good
 * snapshot on disk and exits non-zero) rather than silently publishing
 * garbage a downstream brief could cite as fact.
 *
 * Ranges are deliberately generous (wide enough to never false-positive on
 * real, if volatile, market moves) — this catches unit confusion, decimal
 * shifts, and feed corruption (a negative price, a price of 0 where data
 * exists, a string where a number belongs), not normal price movement.
 */
import { z } from 'zod'

const instrumentSchema = z.object({
  price: z.number().finite(),
  prevClose: z.number().finite(),
  changePct: z.number().finite(),
  unit: z.string().min(1),
  stale: z.boolean().optional(),
})

const snapshotSchema = z.object({
  generatedAt: z.string().min(1),
  generatedAtIST: z.string().min(1),
  source: z.string().min(1),
  instruments: z.record(z.string(), instrumentSchema),
  derived: z.record(z.string(), z.number()).optional(),
  warnings: z.array(z.unknown()).optional(),
})

// [min, max] plausible price range per instrument, in its declared unit.
// Update these if a real, sustained market move pushes a price outside its
// range — that's a legitimate range update, not a workaround.
export const PLAUSIBLE_RANGES = {
  MCX_GOLD:      [50000, 350000],
  MCX_SILVER:    [50000, 500000],
  MCX_CRUDE:     [2000, 20000],
  MCX_COPPER:    [300, 3000],
  MCX_NATGAS:    [100, 1000],
  USDINR:        [60, 120],
  COMEX_GOLD:    [1000, 8000],
  COMEX_SILVER:  [10, 150],
  WTI:           [20, 200],
  BRENT:         [20, 200],
  HENRY_HUB:     [0.5, 20],
  MCX_ZINC:      [100, 1000],
  MCX_LEAD:      [50, 500],
  MCX_ALUMINIUM: [100, 1000],
  MCX_NICKEL:    [500, 5000],
  EURINR:        [60, 150],
  GBPINR:        [60, 180],
  JPYINR:        [30, 100],
}

// A single-run % move beyond this is treated as feed corruption, not a real
// market move — MCX/COMEX circuit limits are well inside this band.
const MAX_PLAUSIBLE_CHANGE_PCT = 30

/**
 * @param {unknown} snapshot
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSnapshot(snapshot) {
  const errors = []

  const parsed = snapshotSchema.safeParse(snapshot)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`schema: ${issue.path.join('.')}: ${issue.message}`)
    }
    // Structural failure — can't safely run range checks on unknown shapes.
    return { valid: false, errors }
  }

  for (const [key, instrument] of Object.entries(parsed.data.instruments)) {
    const range = PLAUSIBLE_RANGES[key]
    if (range && !instrument.stale) {
      const [min, max] = range
      if (instrument.price < min || instrument.price > max) {
        errors.push(`range: ${key}.price = ${instrument.price} outside plausible [${min}, ${max}] ${instrument.unit}`)
      }
    }
    if (Math.abs(instrument.changePct) > MAX_PLAUSIBLE_CHANGE_PCT) {
      errors.push(`range: ${key}.changePct = ${instrument.changePct}% exceeds ${MAX_PLAUSIBLE_CHANGE_PCT}% single-run plausibility ceiling`)
    }
  }

  return { valid: errors.length === 0, errors }
}

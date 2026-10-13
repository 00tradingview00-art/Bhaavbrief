import { CORE_INSTRUMENTS, type CoreInstrument, type TerminalInstrumentData } from './terminalData'

// The two numbers the free Market Pulse panel compares: what the options
// market is pricing (iVIX) and what these commodities have actually moved
// (lib/vix.ts's AAV over its 20-day window). Both are annualised volatility
// in percent, which is why they are comparable at all — and why
// lib/options.ts's per-instrument `volPremium` is just their difference.
//
// Pure and separate from the component because this is where the subtle
// mistakes live (basket pairing below, and the rounding threshold in
// pricingLine), and vitest has no JSX transform in this repo — so a .tsx
// cannot be unit-tested, but this can.

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((s, v) => s + v, 0) / values.length
}

export interface CompositePulse {
  ivix:      number | null
  delivered: number | null
  // ivix − delivered over the paired basket. Not displayed; it decides the
  // one word in the panel's comparison sentence.
  premium:   number | null
}

/**
 * Composite iVIX and composite delivered volatility across the 5 core MCX
 * commodities.
 *
 * Both are averaged over ONE basket — the instruments that have a usable
 * iVIX *and* a usable 20-day figure, which is exactly the condition
 * lib/options.ts:377 already uses for `volPremium != null`, not a third
 * invented basket. That matters because the panel's copy invites the reader
 * to compare the two numbers: averaged over different baskets, the
 * comparison can come out with the wrong SIGN, not merely the wrong size.
 * Concretely, iVIX [18,30,45,55,28] (mean 35.2) against 20d
 * [15,27,40,50,25] (mean 31.4, true premium +3.8) reads as 35.2 vs 35.5 —
 * implying −0.3 — if one instrument drops out of the second average only.
 *
 * Fallback: when nothing is paired (the daily-candles fetch failed for every
 * instrument), `delivered` is null so the tile renders "—" and invites no
 * comparison, while `ivix` falls back to every instrument that has one. An
 * iVIX reading must not go dark because an unrelated historical-candles call
 * failed.
 */
export function compositePulse(
  terminalData: Record<CoreInstrument, TerminalInstrumentData | null>,
): CompositePulse {
  const paired = CORE_INSTRUMENTS
    .map(i => terminalData[i])
    .flatMap(d => d && d.ivix != null && d.aav['20d'] != null
      ? [{ ivix: d.ivix, delivered: d.aav['20d'] as number }]
      : [])

  const delivered = avg(paired.map(p => p.delivered))
  const pairedIvix = avg(paired.map(p => p.ivix))

  const allIvix = avg(CORE_INSTRUMENTS
    .map(i => terminalData[i]?.ivix)
    .filter((v): v is number => v != null))

  const ivix = pairedIvix ?? allIvix

  return {
    ivix,
    delivered,
    premium: pairedIvix != null && delivered != null ? pairedIvix - delivered : null,
  }
}

// Threshold matches ChangeLine's in MarketPulsePanel: both numbers render to
// one decimal place, so a gap under 0.05 would claim a difference the figures
// on screen don't actually show.
export const PRICING_EPSILON = 0.05

/** The panel's comparison sentence, or null when there is nothing to compare. */
export function pricingLine(premium: number | null): string | null {
  if (premium === null) return null
  if (Math.abs(premium) < PRICING_EPSILON) return 'Options are pricing in about this much movement.'
  return `Options are pricing in ${premium > 0 ? 'more' : 'less'} movement than this.`
}

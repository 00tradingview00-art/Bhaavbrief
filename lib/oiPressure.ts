type StrikeOI = { strike: number; oi: number }

export type OIPressureRow =
  | { kind: 'strike'; strike: number; callOI: number | null; putOI: number | null; callTop: boolean; putTop: boolean }
  | { kind: 'futures'; price: number }

export type OIPressureView = {
  rows: OIPressureRow[]
  // Largest OI on either side, for bar scaling.
  maxOI: number
}

export const OI_PRESSURE_COPY = {
  caption: 'Largest visible open-interest concentrations',
  putSide: 'Put OI',
  callSide: 'Call OI',
  futures: 'Futures',
  boundary: 'Where positions are concentrated now — not a level the price has to respect.',
} as const

/**
 * Mirrored put/call ladder from the top-N OI strikes per side. A strike that
 * isn't in one side's top list gets null on that side — not 0, since its OI
 * is simply not shown, not absent. The three largest per side are flagged so
 * the visual can mute the rest. Strikes run high → low with the futures price
 * inserted where it falls.
 */
export function oiPressureView(topCE: StrikeOI[], topPE: StrikeOI[], futurePrice: number): OIPressureView | null {
  const ce = topCE.filter(r => r.oi > 0)
  const pe = topPE.filter(r => r.oi > 0)
  if (!ce.length && !pe.length) return null

  const ceTop = new Set([...ce].sort((a, b) => b.oi - a.oi).slice(0, 3).map(r => r.strike))
  const peTop = new Set([...pe].sort((a, b) => b.oi - a.oi).slice(0, 3).map(r => r.strike))
  const ceBy = new Map(ce.map(r => [r.strike, r.oi]))
  const peBy = new Map(pe.map(r => [r.strike, r.oi]))
  const strikes = Array.from(new Set([...ceBy.keys(), ...peBy.keys()])).sort((a, b) => b - a)

  const rows: OIPressureRow[] = []
  let futuresPlaced = !(futurePrice > 0)
  for (const strike of strikes) {
    if (!futuresPlaced && futurePrice >= strike) {
      rows.push({ kind: 'futures', price: futurePrice })
      futuresPlaced = true
    }
    rows.push({
      kind: 'strike',
      strike,
      callOI: ceBy.get(strike) ?? null,
      putOI: peBy.get(strike) ?? null,
      callTop: ceTop.has(strike),
      putTop: peTop.has(strike),
    })
  }
  if (!futuresPlaced) rows.push({ kind: 'futures', price: futurePrice })

  return { rows, maxOI: Math.max(...ce.map(r => r.oi), ...pe.map(r => r.oi)) }
}

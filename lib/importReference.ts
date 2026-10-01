export type ImportReferenceView = {
  valuePct: number
  // 0–100 along the discount → premium track; 50 is the reference itself.
  position: number
  sentence: string
  ariaLabel: string
  // Recent sessions, oldest first: +1 above, −1 below, 0 in line. Empty when
  // history isn't available (non-Pro visitors get no real history).
  recent: Array<-1 | 0 | 1>
}

export const IMPORT_REFERENCE_COPY = {
  title: 'MCX vs import reference',
  discount: 'Below reference',
  premium: 'Above reference',
  recentLabel: 'Recent sessions',
  boundary: 'A gap describes where MCX trades today; it isn’t a signal on its own.',
} as const

// Within this band the gap rounds to zero at the precision shown.
const IN_LINE_BAND = 0.005

function side(pct: number): -1 | 0 | 1 {
  if (Math.abs(pct) < IN_LINE_BAND) return 0
  return pct > 0 ? 1 : -1
}

/**
 * Presentation for the duty-inclusive import reference gap (lib/basis.ts
 * *DutySpreadPct). One value, one position, one sentence — no breakdown of
 * how the reference is built. Returns null when there is no real reading.
 */
export function importReferenceView(label: string, valuePct: number | null | undefined, history: Array<number | null> = []): ImportReferenceView | null {
  if (valuePct == null || !Number.isFinite(valuePct)) return null
  const real = history.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).slice(-30)
  // Scale to the largest gap in view so the dot never pins to an edge; the
  // track carries no numbers, only the reference line.
  const span = Math.max(Math.abs(valuePct), ...real.map(Math.abs), 1)
  const position = 50 + (valuePct / span) * 45

  const s = side(valuePct)
  const sentence = s === 0
    ? `${label} is trading in line with its import reference.`
    : `${label} is trading ${s > 0 ? 'above' : 'below'} its import reference.`

  return {
    valuePct,
    position: Math.max(0, Math.min(100, position)),
    sentence,
    ariaLabel: `${sentence} Gap ${valuePct > 0 ? '+' : ''}${valuePct.toFixed(2)}%.`,
    recent: real.map(side),
  }
}

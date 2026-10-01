import type { CorrelationMatrix } from '@/lib/correlation'

export type CorrelationLink = {
  label: string
  value: number
  // -1…1 → 0…100 along the opposite ↔ together track.
  position: number
  description: string
  trend: 'stronger' | 'weaker' | null
}

export const CORRELATION_INSIGHT_COPY = {
  heading: (focal: string) => `What is ${focal} moving with?`,
  opposite: 'Moves opposite',
  together: 'Moves together',
  stronger: 'stronger lately',
  weaker: 'weaker lately',
  boundary: 'Describes how these markets have moved together; it doesn’t establish cause or predict the next move.',
} as const

function describe(value: number): string {
  const strength = Math.abs(value)
  if (strength < 0.3) return 'Little connection'
  const band = strength >= 0.7 ? 'Closely' : 'Somewhat'
  return value > 0 ? `${band} moves together` : `${band} moves opposite`
}

/**
 * The focal market's row of the correlation matrix, strongest relationship
 * first, in words. Null values (not enough paired history) are left out
 * rather than shown as "no connection".
 */
export function correlationLinks(correlation: CorrelationMatrix, focal: number): CorrelationLink[] {
  const row = correlation.matrix[focal]
  if (!row) return []
  const prior = correlation.priorMatrix?.[focal] ?? null
  return correlation.labels
    .map((label, i) => ({ label, i, value: row[i] }))
    .filter((c): c is { label: string; i: number; value: number } => c.i !== focal && typeof c.value === 'number' && Number.isFinite(c.value))
    .map(({ label, i, value }) => {
      const before = prior?.[i]
      const delta = typeof before === 'number' ? Math.abs(value) - Math.abs(before) : null
      return {
        label,
        value,
        position: Math.max(0, Math.min(100, ((value + 1) / 2) * 100)),
        description: describe(value),
        trend: delta === null || Math.abs(delta) < 0.1 ? null : delta > 0 ? 'stronger' as const : 'weaker' as const,
      }
    })
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

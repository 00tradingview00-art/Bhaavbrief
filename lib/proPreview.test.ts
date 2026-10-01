import { describe, it, expect } from 'vitest'
import { previewWave, previewDates, previewCorrelationMatrix } from './proPreview'

describe('previewWave', () => {
  it('is deterministic and stays near its band', () => {
    const a = previewWave(30, 12, 2, 5)
    expect(a).toEqual(previewWave(30, 12, 2, 5))
    expect(a).toHaveLength(30)
    for (const v of a) {
      expect(v).toBeGreaterThan(12 - 2 * 1.5)
      expect(v).toBeLessThan(12 + 2 * 1.5)
    }
  })
})

describe('previewDates', () => {
  it('returns consecutive ISO dates ending on the given day', () => {
    const dates = previewDates(3, new Date('2026-09-30T12:00:00Z'))
    expect(dates).toEqual(['2026-09-28', '2026-09-29', '2026-09-30'])
  })
})

describe('previewCorrelationMatrix', () => {
  it('is symmetric with a unit diagonal and bounded off-diagonal values', () => {
    const m = previewCorrelationMatrix(5)
    for (let r = 0; r < 5; r++) {
      expect(m[r][r]).toBe(1)
      for (let c = 0; c < 5; c++) {
        expect(m[r][c]).toBe(m[c][r])
        if (r !== c) expect(Math.abs(m[r][c])).toBeLessThanOrEqual(0.9)
      }
    }
  })
})

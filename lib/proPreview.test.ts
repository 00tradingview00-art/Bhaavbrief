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
  it('is symmetric with a unit diagonal and valid correlation-range off-diagonal values', () => {
    const m = previewCorrelationMatrix(5)
    for (let r = 0; r < 5; r++) {
      expect(m[r][r]).toBe(1)
      for (let c = 0; c < 5; c++) {
        expect(m[r][c]).toBe(m[c][r])
        if (r !== c) expect(Math.abs(m[r][c])).toBeLessThanOrEqual(1)
      }
    }
  })

  // The bug both third-party audits found (negative eigenvalue, a 3x3
  // determinant of -1.888) was on BhaavBrief's published homepage preview,
  // not this file's old version — but the old per-cell-random generator
  // here had the exact same root cause and would fail these same checks.
  // w^T M w >= 0 for every real vector w is the definition of positive
  // semidefinite; deterministic fixed probe vectors are a cheap,
  // dependency-free regression guard without a full eigen-decomposition.
  it('is positive semidefinite for several probe vectors, unlike the per-cell-random version this replaced', () => {
    const m = previewCorrelationMatrix(6)
    const probes = [
      [1, 1, 1, 1, 1, 1],
      [1, -1, 1, -1, 1, -1],
      [1, 0, 0, 0, 0, 0],
      [0.5, -0.3, 0.8, -0.1, 0.2, -0.6],
      [2, 1, -1, -2, 0.5, -0.5],
    ]
    for (const w of probes) {
      let quad = 0
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) quad += w[i] * m[i][j] * w[j]
      expect(quad).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('every 3x3 principal submatrix has a non-negative determinant (the specific check both audits ran)', () => {
    const m = previewCorrelationMatrix(6)
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        for (let k = j + 1; k < 6; k++) {
          const idx = [i, j, k]
          const [[a, b, c], [d, e, f], [g, h, iVal]] = idx.map(r => idx.map(col => m[r][col]))
          const det = a * (e * iVal - f * h) - b * (d * iVal - f * g) + c * (d * h - e * g)
          expect(det).toBeGreaterThanOrEqual(-1e-9)
        }
      }
    }
  })
})

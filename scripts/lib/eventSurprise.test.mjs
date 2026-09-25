import { describe, it, expect } from 'vitest'
import { splitMovesBySurprise, pairOccurrencesWithValues } from './eventSurprise.mjs'

describe('pairOccurrencesWithValues', () => {
  it('pairs by index and preserves alignment when both are full', () => {
    const rawMoves = [1.1, 2.2, 3.3]
    const recentValues = [{ period: 'a', value: 10 }, { period: 'b', value: 20 }, { period: 'c', value: 30 }]
    const { pairedValues, pairedMoves } = pairOccurrencesWithValues(rawMoves, recentValues)
    expect(pairedValues).toEqual([10, 20, 30])
    expect(pairedMoves).toEqual([1.1, 2.2, 3.3])
  })

  it('drops an index where the price reaction is null, without shifting the rest', () => {
    const rawMoves = [1.1, null, 3.3]
    const recentValues = [{ period: 'a', value: 10 }, { period: 'b', value: 20 }, { period: 'c', value: 30 }]
    const { pairedValues, pairedMoves } = pairOccurrencesWithValues(rawMoves, recentValues)
    expect(pairedValues).toEqual([10, 30])
    expect(pairedMoves).toEqual([1.1, 3.3])
  })

  it('drops an index where recentValues is shorter than rawMoves', () => {
    const rawMoves = [1.1, 2.2, 3.3]
    const recentValues = [{ period: 'a', value: 10 }]
    const { pairedValues, pairedMoves } = pairOccurrencesWithValues(rawMoves, recentValues)
    expect(pairedValues).toEqual([10])
    expect(pairedMoves).toEqual([1.1])
  })

  it('end-to-end: feeds straight into splitMovesBySurprise producing a sane split', () => {
    // Simulates compute-event-impact.mjs's real usage without live Kite/EIA
    // credentials — occurrences[3] had no tradeable reaction day (null),
    // recentValues is otherwise a full 8-week trailing series.
    const rawMoves = [3.0, 2.8, null, 2.9, 0.5, 0.6, 0.4, 0.5]
    const recentValues = [10, 8, 9, 11, -20, -18, -22, -19].map((value, i) => ({ period: `w${i}`, value }))
    const { pairedValues, pairedMoves } = pairOccurrencesWithValues(rawMoves, recentValues)
    expect(pairedMoves).toHaveLength(7) // one dropped for the null reaction
    const split = splitMovesBySurprise(pairedValues, pairedMoves)
    expect(split).not.toBeNull()
    expect(split.aboveAvg?.sampleSize).toBe(3) // three of the four "above" releases survived
    expect(split.belowAvg?.sampleSize).toBe(4)
  })
})

describe('splitMovesBySurprise', () => {
  it('splits reaction moves by whether the release was above or below its own trailing average', () => {
    // releases: 4 above the mean(≈-2), 4 below — moves paired 1:1 by index.
    const releaseValues = [10, 8, 9, 11, -20, -18, -22, -19]
    const moves =         [3.0, 2.8, 3.1, 2.9, 0.5, 0.6, 0.4, 0.5]
    const result = splitMovesBySurprise(releaseValues, moves)
    expect(result).not.toBeNull()
    expect(result.aboveAvg?.sampleSize).toBe(4)
    expect(result.belowAvg?.sampleSize).toBe(4)
    expect(result.aboveAvg?.avgAbsMovePct).toBeCloseTo(2.95, 1)
    expect(result.belowAvg?.avgAbsMovePct).toBeCloseTo(0.5, 1)
  })

  it('returns null for a bucket smaller than minSampleSize instead of a noisy stat', () => {
    const releaseValues = [10, 10, 10, -5]
    const moves =         [1, 1, 1, 9]
    const result = splitMovesBySurprise(releaseValues, moves)
    expect(result?.aboveAvg?.sampleSize).toBe(3)
    expect(result?.belowAvg).toBeNull() // only 1 point below the average
  })

  it('returns null when inputs are empty or mismatched in length', () => {
    expect(splitMovesBySurprise([], [])).toBeNull()
    expect(splitMovesBySurprise([1, 2], [1])).toBeNull()
  })

  it('respects a custom minSampleSize', () => {
    const releaseValues = [10, -5]
    const moves = [1, 9]
    const result = splitMovesBySurprise(releaseValues, moves, 1)
    expect(result?.aboveAvg?.sampleSize).toBe(1)
    expect(result?.belowAvg?.sampleSize).toBe(1)
  })
})

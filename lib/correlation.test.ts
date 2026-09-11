import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync:  vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

import fs from 'fs'
import { pearsonCorrelation, dailyLogReturns, readAlignedCloses, getCorrelationMatrix } from './correlation'

const mockExists   = vi.mocked(fs.existsSync)
const mockReaddir  = vi.mocked(fs.readdirSync)
const mockReadFile = vi.mocked(fs.readFileSync)

describe('pearsonCorrelation', () => {
  it('is 1 for two perfectly positively correlated series', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 8)
  })

  it('is -1 for two perfectly inversely correlated series', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1, 8)
  })

  it('returns null (not 0) when either series has zero variance', () => {
    expect(pearsonCorrelation([5, 5, 5, 5], [1, 2, 3, 4])).toBeNull()
  })

  it('returns null for mismatched lengths', () => {
    expect(pearsonCorrelation([1, 2, 3], [1, 2])).toBeNull()
  })

  it('returns null for fewer than 2 points', () => {
    expect(pearsonCorrelation([1], [1])).toBeNull()
  })
})

describe('dailyLogReturns', () => {
  it('computes log(closes[i]/closes[i-1]) for each step', () => {
    const returns = dailyLogReturns([100, 110, 99])
    expect(returns).toHaveLength(2)
    expect(returns[0]).toBeCloseTo(Math.log(110 / 100), 10)
    expect(returns[1]).toBeCloseTo(Math.log(99 / 110), 10)
  })

  it('skips a transition into or out of a non-positive price rather than producing NaN/Infinity', () => {
    const returns = dailyLogReturns([100, 0, 105])
    expect(returns).toEqual([])
  })
})

describe('readAlignedCloses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockReturnValue(true)
  })

  function fixture(overrides: Record<string, number | undefined>) {
    const fields: Record<string, { price?: number }> = {
      MCX_GOLD: { price: 100 }, MCX_SILVER: { price: 50 }, MCX_CRUDE: { price: 70 },
      MCX_COPPER: { price: 8 }, MCX_NATGAS: { price: 3 }, USDINR: { price: 88 },
    }
    for (const [k, v] of Object.entries(overrides)) fields[k] = { price: v }
    return JSON.stringify({ instruments: fields })
  }

  it('drops a date entirely when even one instrument is missing that day', () => {
    mockReaddir.mockReturnValue(['2026-09-01.json', '2026-09-02.json'] as unknown as ReturnType<typeof fs.readdirSync>)
    mockReadFile.mockImplementation((filePath) => {
      if (String(filePath).includes('2026-09-01')) return fixture({}) // complete
      return fixture({ MCX_COPPER: undefined }) // missing copper that day
    })
    const { dates, series } = readAlignedCloses()
    expect(dates).toEqual(['2026-09-01'])
    expect(series.gold).toEqual([100])
    expect(series.copper).toEqual([8])
  })

  it('keeps every complete date, in ascending file-sort order', () => {
    mockReaddir.mockReturnValue(['2026-09-02.json', '2026-09-01.json'] as unknown as ReturnType<typeof fs.readdirSync>)
    mockReadFile.mockReturnValue(fixture({}))
    const { dates } = readAlignedCloses()
    expect(dates).toEqual(['2026-09-01', '2026-09-02'])
  })
})

describe('getCorrelationMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockReturnValue(true)
  })

  it('diagonal is 1 and sampleSize reflects the number of paired returns actually used', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']
    mockReaddir.mockReturnValue(days.map(d => `${d}.json`) as unknown as ReturnType<typeof fs.readdirSync>)
    let i = 0
    mockReadFile.mockImplementation(() => {
      const mult = 1 + i * 0.01
      i++
      return JSON.stringify({
        instruments: {
          MCX_GOLD: { price: 100 * mult }, MCX_SILVER: { price: 50 * mult }, MCX_CRUDE: { price: 70 * mult },
          MCX_COPPER: { price: 8 * mult }, MCX_NATGAS: { price: 3 * mult }, USDINR: { price: 88 * mult },
        },
      })
    })
    const result = getCorrelationMatrix(20)
    expect(result.sampleSize).toBe(3) // 4 days → 3 returns
    result.matrix.forEach((row, r) => expect(row[r]).toBe(1))
    // every instrument moved by the exact same multiplier each day — perfectly correlated
    expect(result.matrix[0][1]).toBeCloseTo(1, 6)
  })

  it('returns an all-null matrix with sampleSize 0 when there is no history on disk', () => {
    mockExists.mockReturnValue(false)
    const result = getCorrelationMatrix(20)
    expect(result.sampleSize).toBe(0)
    result.matrix.flat().forEach(v => expect(v).toBeNull())
  })
})

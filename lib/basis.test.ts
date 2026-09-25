import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  default: {
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

import fs from 'fs'
import { getBasisHistory } from './basis'

const mockReaddir = vi.mocked(fs.readdirSync)
const mockReadFile = vi.mocked(fs.readFileSync)

const fixture = (date: string, goldSpread: number) => JSON.stringify({
  instruments: { MCX_GOLD: { price: 70000 }, COMEX_GOLD: { price: 2000 } },
  derived: { mcxComexGoldSpreadPct: goldSpread, importParityGoldINR: 62500 },
})

// data/commodity-constants.json is read once per getBasisHistory() call (not per history
// file) to compute the duty-inclusive spread fields — see lib/basis.ts's loadDutyFactors().
const constantsFixture = JSON.stringify({
  gold:   { importDutyFactorEffective: 1.12 },
  silver: { importDutyFactor: 1.10 },
  crude:  { importDutyFactor: 1.025 },
})

beforeEach(() => {
  vi.clearAllMocks()
  const files = ['2026-09-01.json', '2026-09-02.json', '2026-09-03.json']
  mockReaddir.mockReturnValue(files as unknown as ReturnType<typeof fs.readdirSync>)
  mockReadFile.mockImplementation((filePath) => {
    const path = String(filePath)
    if (path.endsWith('commodity-constants.json')) return constantsFixture
    const date = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1] ?? ''
    const spreadByDate: Record<string, number> = { '2026-09-01': 1, '2026-09-02': 2, '2026-09-03': 3 }
    return fixture(date, spreadByDate[date])
  })
})

describe('getBasisHistory', () => {
  it('returns every file when called with no limit', () => {
    const history = getBasisHistory()
    expect(history.map(h => h.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    // 3 history files + 1 read of data/commodity-constants.json for duty factors.
    expect(mockReadFile).toHaveBeenCalledTimes(4)
  })

  it('with a limit, reads only the most recent N files, not every file', () => {
    const history = getBasisHistory(1)
    expect(history.map(h => h.date)).toEqual(['2026-09-03'])
    // 1 history file + 1 read of data/commodity-constants.json for duty factors.
    expect(mockReadFile).toHaveBeenCalledTimes(2)
  })

  it('computes a duty-inclusive spread from the same raw parity price, using data/commodity-constants.json duty factors', () => {
    mockReadFile.mockImplementation((filePath) => {
      const path = String(filePath)
      if (path.endsWith('commodity-constants.json')) return constantsFixture
      if (path.endsWith('2026-09-03.json')) {
        return JSON.stringify({
          instruments: { MCX_GOLD: { price: 71400 }, COMEX_GOLD: { price: 2000 } },
          derived: { mcxComexGoldSpreadPct: 14.24, importParityGoldINR: 70000 },
        })
      }
      return fixture('', 0)
    })
    const [latest] = getBasisHistory(1)
    // Raw spread (no duty) uses the precomputed mcxComexGoldSpreadPct as-is.
    expect(latest.goldSpreadPct).toBe(14.24)
    // Duty-inclusive: 70000 * 1.12 = 78400 parity price -> (71400-78400)/78400*100.
    expect(latest.goldDutySpreadPct).toBeCloseTo(-8.93, 2)
  })

  it('a limit larger than the available history returns everything available', () => {
    const history = getBasisHistory(30)
    expect(history).toHaveLength(3)
  })

  it('returns the same shape whether limited or not', () => {
    const [limited] = getBasisHistory(1)
    const full = getBasisHistory()
    expect(limited).toEqual(full[full.length - 1])
  })

  it('returns an empty array when the history directory does not exist', () => {
    mockReaddir.mockImplementation(() => { throw new Error('ENOENT') })
    expect(getBasisHistory(1)).toEqual([])
  })
})

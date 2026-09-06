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
  derived: { mcxComexGoldSpreadPct: goldSpread },
})

beforeEach(() => {
  vi.clearAllMocks()
  const files = ['2026-09-01.json', '2026-09-02.json', '2026-09-03.json']
  mockReaddir.mockReturnValue(files as unknown as ReturnType<typeof fs.readdirSync>)
  mockReadFile.mockImplementation((filePath) => {
    const date = String(filePath).match(/(\d{4}-\d{2}-\d{2})\.json$/)?.[1] ?? ''
    const spreadByDate: Record<string, number> = { '2026-09-01': 1, '2026-09-02': 2, '2026-09-03': 3 }
    return fixture(date, spreadByDate[date])
  })
})

describe('getBasisHistory', () => {
  it('returns every file when called with no limit', () => {
    const history = getBasisHistory()
    expect(history.map(h => h.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03'])
    expect(mockReadFile).toHaveBeenCalledTimes(3)
  })

  it('with a limit, reads only the most recent N files, not every file', () => {
    const history = getBasisHistory(1)
    expect(history.map(h => h.date)).toEqual(['2026-09-03'])
    expect(mockReadFile).toHaveBeenCalledTimes(1)
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

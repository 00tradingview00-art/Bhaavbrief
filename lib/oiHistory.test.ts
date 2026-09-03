import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./redis', () => ({
  redisCommand: vi.fn(),
}))

import { redisCommand } from './redis'
import { buildOiSnapshotRows, getOIHistory } from './oiHistory'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

const chainRow = (strike: number, ceOI: number, peOI: number, isATM = false) => ({
  strike, isATM, CE: { oi: ceOI }, PE: { oi: peOI },
})

describe('buildOiSnapshotRows', () => {
  test('keeps only the top-10 strikes by combined CE+PE OI', () => {
    const chain = Array.from({ length: 15 }, (_, i) => chainRow(100 + i, i, i))
    const rows = buildOiSnapshotRows(chain)
    expect(rows).toHaveLength(10)
    expect(rows.map(r => r.strike)).toEqual([114, 113, 112, 111, 110, 109, 108, 107, 106, 105])
  })

  test('regression: includes the ATM strike even when it is not in the top-10 by OI', () => {
    // ATM strike (200) has the lowest OI of the whole chain — under the old
    // logic (persist only the top-10-by-OI strikes) it would never be
    // written, and getOIHistory() — which always looks up the ATM strike —
    // would permanently find nothing for it.
    const chain = [
      ...Array.from({ length: 10 }, (_, i) => chainRow(100 + i, 50 + i, 50 + i)),
      chainRow(200, 1, 1, true),
    ]
    const rows = buildOiSnapshotRows(chain)
    expect(rows.some(r => r.strike === 200)).toBe(true)
    expect(rows).toHaveLength(11) // top-10 plus the ATM strike appended
  })

  test('does not duplicate the ATM strike when it is already in the top-10', () => {
    const chain = Array.from({ length: 10 }, (_, i) => chainRow(100 + i, 100 - i, 100 - i, i === 0))
    const rows = buildOiSnapshotRows(chain)
    expect(rows).toHaveLength(10)
    expect(rows.filter(r => r.strike === 100)).toHaveLength(1)
  })

  test('no ATM row present (e.g. future price unavailable) — just returns the top-10', () => {
    const chain = Array.from({ length: 12 }, (_, i) => chainRow(100 + i, i, i))
    const rows = buildOiSnapshotRows(chain)
    expect(rows).toHaveLength(10)
  })
})

describe('getOIHistory', () => {
  test('IST-anchored date window: regression test for the UTC/IST boundary', () => {
    // 21:00 UTC = 02:30 IST the *next* calendar day. A plain UTC Date walk
    // (the old implementation) would query "today" as 2026-09-02; the
    // IST-anchored version must query 2026-09-03 instead.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T21:00:00.000Z'))
    mockRedis.mockResolvedValue(null)

    void getOIHistory('GOLD', 12000)

    const queriedKeys = mockRedis.mock.calls.map(call => call[1])
    expect(queriedKeys).toContain('oi-snap:GOLD:2026-09-03')
    expect(queriedKeys).not.toContain('oi-snap:GOLD:2026-09-04')
  })

  test('matches a strike present in a stored day and skips days without it', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T10:00:00.000Z'))

    mockRedis.mockImplementation(async (_cmd: string, key: string) => {
      if (key === 'oi-snap:GOLD:2026-09-02') {
        return JSON.stringify({ expiry: '2026-10-05', chain: [{ strike: 12000, ceOI: 500, peOI: 400 }] })
      }
      if (key === 'oi-snap:GOLD:2026-09-01') {
        // Present that day, but a different strike — should not match.
        return JSON.stringify({ expiry: '2026-10-05', chain: [{ strike: 12500, ceOI: 100, peOI: 100 }] })
      }
      return null
    })

    const history = await getOIHistory('GOLD', 12000)
    expect(history).toEqual([{ date: '2026-09-02', ceOI: 500, peOI: 400 }])
  })

  test('skips malformed entries instead of throwing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T10:00:00.000Z'))
    mockRedis.mockImplementation(async (_cmd: string, key: string) =>
      key === 'oi-snap:GOLD:2026-09-02' ? 'not-json' : null,
    )

    await expect(getOIHistory('GOLD', 12000)).resolves.toEqual([])
  })
})

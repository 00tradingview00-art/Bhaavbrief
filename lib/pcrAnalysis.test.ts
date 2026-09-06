import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./redis', () => ({
  redisCommand: vi.fn(),
}))

import { redisCommand } from './redis'
import { getPCRHistory } from './pcrAnalysis'

const mockRedis = vi.mocked(redisCommand)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getPCRHistory', () => {
  test('fires all 90 day lookups concurrently, not sequentially', () => {
    // A sequential for-loop `await`s each redisCommand() call before making
    // the next, so only the first call would exist synchronously. The
    // Promise.all version invokes every mapped call synchronously (each
    // async mock body runs up to its first await immediately) before this
    // assertion runs.
    const calls: string[] = []
    mockRedis.mockImplementation(async (_cmd: string, key: string) => { calls.push(key); return null })

    void getPCRHistory('GOLD')

    expect(calls).toHaveLength(90)
  })

  test('one rejected lookup does not fail the whole batch', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T10:00:00.000Z'))

    mockRedis.mockImplementation(async (_cmd: string, key: string) => {
      if (key === 'oi-snap:GOLD:2026-09-01') throw new Error('upstream timeout')
      if (key === 'oi-snap:GOLD:2026-09-02') return JSON.stringify({ pcr: 1.15 })
      return null
    })

    const history = await getPCRHistory('GOLD')
    expect(history).toEqual([{ date: '2026-09-02', pcr: 1.15 }])
  })

  test('sorts ascending by date and skips days with no pcr field', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-03T10:00:00.000Z'))

    mockRedis.mockImplementation(async (_cmd: string, key: string) => {
      if (key === 'oi-snap:GOLD:2026-09-03') return JSON.stringify({ pcr: 1.3 })
      if (key === 'oi-snap:GOLD:2026-09-02') return JSON.stringify({ expiry: '2026-10-05' }) // no pcr yet
      if (key === 'oi-snap:GOLD:2026-09-01') return JSON.stringify({ pcr: 0.9 })
      return null
    })

    const history = await getPCRHistory('GOLD')
    expect(history).toEqual([
      { date: '2026-09-01', pcr: 0.9 },
      { date: '2026-09-03', pcr: 1.3 },
    ])
  })

  test('skips malformed JSON instead of throwing', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T10:00:00.000Z'))
    mockRedis.mockImplementation(async (_cmd: string, key: string) =>
      key === 'oi-snap:GOLD:2026-09-02' ? 'not-json' : null,
    )

    await expect(getPCRHistory('GOLD')).resolves.toEqual([])
  })

  test('IST-anchored date window matches lib/oiHistory.ts (same key namespace)', () => {
    // 21:00 UTC = 02:30 IST the next calendar day.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-02T21:00:00.000Z'))
    mockRedis.mockResolvedValue(null)

    void getPCRHistory('GOLD')

    const queriedKeys = mockRedis.mock.calls.map(call => call[1])
    expect(queriedKeys).toContain('oi-snap:GOLD:2026-09-03')
    expect(queriedKeys).not.toContain('oi-snap:GOLD:2026-09-04')
  })
})

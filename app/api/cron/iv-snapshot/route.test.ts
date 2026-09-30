import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const redisCommand = vi.fn(async (..._args: string[]) => null as unknown)
vi.mock('@/lib/redis', () => ({ redisCommand: (...a: string[]) => redisCommand(...a) }))

const getOptionsChain = vi.fn()
vi.mock('@/lib/options', () => ({
  getOptionsChain: (...a: unknown[]) => getOptionsChain(...a),
  MCX_INSTRUMENTS: { GOLD: { label: 'Gold' } },
}))
vi.mock('@/lib/terminalData', () => ({ CORE_INSTRUMENTS: ['GOLD'] }))

import { GET } from './route'

const authed = () => new Request('https://bhaavbrief.in/api/cron/iv-snapshot', {
  headers: { authorization: 'Bearer cron' },
})

function liveChain(iv: number) {
  return {
    futurePrice: 150000, ivix: iv, volPremium: 1, expiry: '2026-10-26', expiries: ['2026-10-26'],
    chain: [{ strike: 150000, isATM: true,
      CE: { tier: 'LIVE', iv, oi: 10, volume: 5 },
      PE: { tier: 'LIVE', iv, oi: 10, volume: 5 } }],
  }
}

const hsetCalls = () => redisCommand.mock.calls.filter(c => c[0] === 'hset' && String(c[1]).startsWith('iv-hist:GOLD'))

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'cron'
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('iv-snapshot session dating', () => {
  it('writes nothing on a weekend', async () => {
    vi.setSystemTime(new Date('2026-09-26T08:30:00Z')) // Sat 14:00 IST
    const body = await (await GET(authed())).json()
    expect(body.skipped).toBe('not a trading session')
    expect(getOptionsChain).not.toHaveBeenCalled()
    expect(hsetCalls()).toHaveLength(0)
  })

  it("files a post-midnight Friday run under Friday's date", async () => {
    vi.setSystemTime(new Date('2026-09-25T19:10:00Z')) // Sat 00:40 IST
    getOptionsChain.mockResolvedValue(liveChain(24))
    const body = await (await GET(authed())).json()
    expect(body.date).toBe('2026-09-25')
    expect(hsetCalls()[0]).toEqual(['hset', 'iv-hist:GOLD', '2026-09-25', '24'])
  })

  it("rolls to the next expiry on an option series' expiry session", async () => {
    vi.setSystemTime(new Date('2026-09-25T18:05:00Z')) // Fri 23:35 IST, GOLD Sep options expire today
    getOptionsChain.mockImplementation(async (_inst: string, expiry?: string) => ({
      ...liveChain(expiry === '2026-10-26' ? 24 : 1.17),
      expiry: expiry ?? '2026-09-25',
      expiries: ['2026-09-25', '2026-10-26'],
    }))
    await GET(authed())
    expect(getOptionsChain).toHaveBeenLastCalledWith('GOLD', '2026-10-26')
    expect(hsetCalls()[0]).toEqual(['hset', 'iv-hist:GOLD', '2026-09-25', '24'])
  })
})

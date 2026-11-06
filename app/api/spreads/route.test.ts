import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const checkFixedWindowRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  checkFixedWindowRateLimit: (...a: unknown[]) => checkFixedWindowRateLimit(...a),
  getClientIp: () => '1.2.3.4',
}))
vi.mock('@/lib/options', () => ({
  getFuturesCurve: vi.fn().mockResolvedValue({ curve: [] }),
  SPREAD_INSTRUMENTS: ['GOLD'],
}))
vi.mock('@/lib/marketSchedule', () => ({ nextMCXSessionOpenISO: () => null }))
vi.mock('@/lib/tradingCalendar', () => ({ isMcxOpen: () => true, todayIST: () => '2026-11-06' }))

import { GET } from './route'

const req = (instrument = 'GOLD') => new NextRequest(`https://bhaavbrief.in/api/spreads?instrument=${instrument}`)

beforeEach(() => vi.clearAllMocks())

describe('/api/spreads rate limiting', () => {
  it('returns 429 once the per-IP limit is exceeded, before touching Kite', async () => {
    checkFixedWindowRateLimit.mockResolvedValue(false)
    const res = await GET(req())
    expect(res.status).toBe(429)
  })

  it('falls through to the normal response when under the limit', async () => {
    checkFixedWindowRateLimit.mockResolvedValue(true)
    const res = await GET(req())
    expect(res.status).not.toBe(429)
  })
})

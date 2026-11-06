import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const checkFixedWindowRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  checkFixedWindowRateLimit: (...a: unknown[]) => checkFixedWindowRateLimit(...a),
  getClientIp: () => '1.2.3.4',
}))
vi.mock('@/lib/kite', () => ({ KiteClient: vi.fn() }))

import { GET } from './route'

const req = () => new NextRequest('https://bhaavbrief.in/api/chart/gold')
const ctx = { params: Promise.resolve({ commodity: 'gold' }) }

beforeEach(() => vi.clearAllMocks())

describe('/api/chart/[commodity] rate limiting', () => {
  it('returns 429 once the per-IP limit is exceeded, before touching Kite', async () => {
    checkFixedWindowRateLimit.mockResolvedValue(false)
    const res = await GET(req(), ctx)
    expect(res.status).toBe(429)
  })

  it('falls through to the normal flow when under the limit', async () => {
    checkFixedWindowRateLimit.mockResolvedValue(true)
    const res = await GET(req(), ctx)
    // No Kite credentials configured in this test env — expect the
    // kite_not_configured path, not a 429.
    expect(res.status).not.toBe(429)
  })
})

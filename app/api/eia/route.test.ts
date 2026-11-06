import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const checkFixedWindowRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  checkFixedWindowRateLimit: (...a: unknown[]) => checkFixedWindowRateLimit(...a),
  getClientIp: () => '1.2.3.4',
}))
vi.mock('@/lib/eia', () => ({ loadEIA: vi.fn().mockResolvedValue({ error: 'no_key', updatedAt: 'now' }) }))

import { GET } from './route'

const req = () => new NextRequest('https://bhaavbrief.in/api/eia')

beforeEach(() => vi.clearAllMocks())

describe('/api/eia rate limiting', () => {
  it('returns 429 once the per-IP limit is exceeded', async () => {
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

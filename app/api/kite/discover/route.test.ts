import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const discoverAndCacheTokens = vi.fn()
vi.mock('@/lib/kite', () => ({
  KiteClient: vi.fn().mockImplementation(function () {
    return { discoverAndCacheTokens: (...a: unknown[]) => discoverAndCacheTokens(...a) }
  }),
}))

import { GET } from './route'

const req = (bearer?: string) => new NextRequest('https://bhaavbrief.in/api/kite/discover', {
  headers: bearer ? { authorization: `Bearer ${bearer}` } : {},
})

beforeEach(() => {
  vi.clearAllMocks()
  process.env.KITE_DISCOVER_SECRET = 'discover-secret'
  process.env.CRON_SECRET = 'cron-secret'
  process.env.KITE_API_KEY = 'k'
  process.env.KITE_ACCESS_TOKEN = 't'
})
afterEach(() => {
  delete process.env.KITE_DISCOVER_SECRET
  delete process.env.CRON_SECRET
})

describe('/api/kite/discover auth', () => {
  it('rejects a missing bearer token', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('rejects CRON_SECRET — discover has its own secret, not the cron one', async () => {
    const res = await GET(req('cron-secret'))
    expect(res.status).toBe(401)
    expect(discoverAndCacheTokens).not.toHaveBeenCalled()
  })

  it('accepts KITE_DISCOVER_SECRET', async () => {
    discoverAndCacheTokens.mockResolvedValue({ GOLD: 123 })
    const res = await GET(req('discover-secret'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
  })
})

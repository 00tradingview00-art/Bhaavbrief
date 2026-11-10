import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// after() relies on Next's request-scoped AsyncLocalStorage, which isn't set
// up when calling the route handler directly in a unit test (it throws
// "called outside a request scope" otherwise) — run the callback immediately
// instead, which is equivalent to this route's intent (fire-and-forget).
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return { ...actual, after: (cb: () => unknown) => { cb() } }
})

const checkFixedWindowRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  checkFixedWindowRateLimit: (...a: unknown[]) => checkFixedWindowRateLimit(...a),
  getClientIp: () => '1.2.3.4',
}))

const auth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ auth: () => auth() }))

const getOptionsChain = vi.fn()
vi.mock('@/lib/options', () => ({
  getOptionsChain: (...a: unknown[]) => getOptionsChain(...a),
  MCX_INSTRUMENTS: { GOLD: { label: 'Gold' } },
}))

vi.mock('@/lib/marketSchedule', () => ({ nextMCXSessionOpenISO: () => '2026-11-07T03:45:00.000Z' }))
vi.mock('@/lib/tradingCalendar', () => ({ isMcxOpen: () => true }))

const cacheOptionsChain = vi.fn()
const getCachedOptionsChain = vi.fn()
vi.mock('@/lib/optionsChainCache', () => ({
  cacheOptionsChain: (...a: unknown[]) => cacheOptionsChain(...a),
  getCachedOptionsChain: (...a: unknown[]) => getCachedOptionsChain(...a),
}))

const isProUserOrFree = vi.fn()
vi.mock('@/lib/subscription', () => ({
  isProUserOrFree: (...a: unknown[]) => isProUserOrFree(...a),
  hasInternalAccess: () => false,
}))

vi.mock('@/lib/optionsCacheControl', () => ({ chainCacheControl: () => 'private, no-store' }))

import { GET } from './route'

function chainRow(strike: number, isATM = false) {
  return {
    strike, isATM,
    CE: { tier: 'LIVE', iv: 20, delta: 0.5, gamma: 0.01, theta: -1, vega: 2 },
    PE: { tier: 'LIVE', iv: 20, delta: -0.5, gamma: 0.01, theta: -1, vega: 2 },
  }
}

function fullChain() {
  const strikes = Array.from({ length: 15 }, (_, i) => 100000 + i * 1000)
  return {
    instrument: 'GOLD',
    expiry: '2026-12-04',
    expiries: ['2026-12-04'],
    futurePrice: 107000,
    chain: strikes.map((s, i) => chainRow(s, i === 7)),
  }
}

const req = (qs = 'instrument=GOLD') => new NextRequest(`https://bhaavbrief.in/api/options?${qs}`)

beforeEach(() => {
  vi.clearAllMocks()
  checkFixedWindowRateLimit.mockResolvedValue(true)
  auth.mockResolvedValue({ userId: null })
  isProUserOrFree.mockResolvedValue(false)
  getCachedOptionsChain.mockResolvedValue(null)
})

describe('/api/options', () => {
  it('returns 429 once the per-IP rate limit is exceeded', async () => {
    checkFixedWindowRateLimit.mockResolvedValue(false)
    const res = await GET(req())
    expect(res.status).toBe(429)
    expect(getOptionsChain).not.toHaveBeenCalled()
  })

  it('rejects an invalid or missing instrument with 400', async () => {
    const res = await GET(req('instrument=NOTREAL'))
    expect(res.status).toBe(400)
  })

  it('strips Greeks and truncates to ATM±5 for a free/anonymous visitor', async () => {
    getOptionsChain.mockResolvedValue(fullChain())
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.chain).toHaveLength(11) // ATM±5
    for (const row of body.chain) {
      expect(row.CE.delta).toBeNull()
      expect(row.CE.gamma).toBeNull()
      expect(row.CE.theta).toBeNull()
      expect(row.CE.vega).toBeNull()
    }
  })

  it('returns the full chain with Greeks intact for a Pro user', async () => {
    isProUserOrFree.mockResolvedValue(true)
    getOptionsChain.mockResolvedValue(fullChain())
    const res = await GET(req())
    const body = await res.json()
    expect(body.chain).toHaveLength(15)
    expect(body.chain[7].CE.delta).toBe(0.5)
  })

  it('caches the default-expiry chain but not an explicit ?expiry= request', async () => {
    getOptionsChain.mockResolvedValue(fullChain())
    await GET(req())
    expect(cacheOptionsChain).toHaveBeenCalledTimes(1)

    cacheOptionsChain.mockClear()
    await GET(req('instrument=GOLD&expiry=2026-12-04'))
    expect(cacheOptionsChain).not.toHaveBeenCalled()
  })

  it('falls back to the stale cache (200, stale:true) when the live fetch fails and a cache exists', async () => {
    getOptionsChain.mockRejectedValue(new Error('Kite access token expired'))
    getCachedOptionsChain.mockResolvedValue(fullChain())
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Chain-Source')).toBe('stale-cache')
    expect(body.stale).toBe(true)
    expect(body.nextOpenAt).toBeDefined()
  })

  it('does not fall back to a stale cache for an explicit ?expiry= request', async () => {
    getOptionsChain.mockRejectedValue(new Error('Kite access token expired'))
    getCachedOptionsChain.mockResolvedValue(fullChain())
    const res = await GET(req('instrument=GOLD&expiry=2026-12-04'))
    expect(res.status).toBe(500)
    expect(getCachedOptionsChain).not.toHaveBeenCalled()
  })

  it('returns 503 when Kite credentials are not configured and there is no cache', async () => {
    getOptionsChain.mockRejectedValue(new Error('Kite credentials not configured'))
    getCachedOptionsChain.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(503)
  })

  it('returns 404 for "No options found" with the real message, not a generic one', async () => {
    getOptionsChain.mockRejectedValue(new Error('No options found for GOLD'))
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe('No options found for GOLD')
  })

  it('returns a generic 500 message for an unexpected error, never the raw error text', async () => {
    getOptionsChain.mockRejectedValue(new Error('some internal stack trace detail'))
    getCachedOptionsChain.mockResolvedValue(null)
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.error).not.toContain('stack trace')
  })
})

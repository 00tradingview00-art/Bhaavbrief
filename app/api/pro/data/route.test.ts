import { describe, it, expect, vi, beforeEach } from 'vitest'

let userId: string | null = null
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId })) }))

const isProUser = vi.fn()
vi.mock('@/lib/subscription', () => ({
  isProUser: (id: string | null) => isProUser(id),
  hasInternalAccess: (h: Headers) => h.get('authorization') === 'Bearer internal',
}))

vi.mock('@/lib/correlation', () => ({
  getCorrelationMatrix: () => ({ labels: ['Gold'], matrix: [[1]], sampleSize: 20, priorMatrix: null, priorSampleSize: 0 }),
}))
vi.mock('@/lib/terminalData', () => ({ getTermStructureData: async () => ({ GOLD: [] }) }))
vi.mock('@/lib/pcrAnalysis', () => ({ getPCRHistory: async () => [{ date: '2026-09-29', pcr: 1.1 }] }))
vi.mock('@/lib/ivRankHistory', () => ({ getIVRankHistories: async () => [] }))
vi.mock('@/lib/options', () => ({ MCX_INSTRUMENTS: { GOLD: { label: 'Gold' } } }))

import { GET } from './route'

const req = (query: string, headers: Record<string, string> = {}) =>
  new Request(`https://bhaavbrief.in/api/pro/data?${query}`, { headers })

beforeEach(() => {
  vi.clearAllMocks()
  userId = null
})

describe('/api/pro/data', () => {
  it('refuses anonymous visitors without returning any data', async () => {
    isProUser.mockResolvedValue(false)
    const res = await GET(req('kind=correlation'))
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Pro subscription required' })
  })

  it('refuses signed-in free users', async () => {
    userId = 'user_free'
    isProUser.mockResolvedValue(false)
    expect((await GET(req('kind=pcr-history&instrument=GOLD'))).status).toBe(403)
  })

  it('treats a failed Pro check as not-Pro (403, not 500)', async () => {
    userId = 'user_x'
    isProUser.mockRejectedValue(new Error('redis down'))
    expect((await GET(req('kind=correlation'))).status).toBe(403)
  })

  it('serves Pro users, never publicly cacheable', async () => {
    userId = 'user_pro'
    isProUser.mockResolvedValue(true)
    const res = await GET(req('kind=pcr-history&instrument=gold'))
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(await res.json()).toEqual({ instrument: 'GOLD', history: [{ date: '2026-09-29', pcr: 1.1 }] })
  })

  it('serves internal-access callers without a session', async () => {
    const res = await GET(req('kind=correlation', { authorization: 'Bearer internal' }))
    expect(res.status).toBe(200)
    expect(isProUser).not.toHaveBeenCalled()
  })

  it('rejects unknown kinds and invalid instruments', async () => {
    isProUser.mockResolvedValue(true)
    userId = 'user_pro'
    expect((await GET(req('kind=nope'))).status).toBe(400)
    expect((await GET(req('kind=pcr-history&instrument=XYZ'))).status).toBe(400)
  })
})

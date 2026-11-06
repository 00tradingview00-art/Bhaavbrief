import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.fn()
const currentUser = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => auth(),
  currentUser: () => currentUser(),
}))

vi.mock('@/lib/eventMap', () => ({
  loadEventMap: () => [{ id: 'cftc-cot' }, { id: 'eia-crude-stocks' }],
}))

const watchEvent = vi.fn()
const unwatchEvent = vi.fn()
const getWatchedEventIds = vi.fn()
vi.mock('@/lib/alertSubscriptions', () => ({
  watchEvent: (...a: unknown[]) => watchEvent(...a),
  unwatchEvent: (...a: unknown[]) => unwatchEvent(...a),
  getWatchedEventIds: (...a: unknown[]) => getWatchedEventIds(...a),
}))

const incrementWindow = vi.fn()
vi.mock('@/lib/userRateLimit', () => ({ incrementWindow: (...a: unknown[]) => incrementWindow(...a) }))

import { GET, POST } from './route'

const postReq = (body: unknown) => new NextRequest('https://bhaavbrief.in/api/alerts', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
})

beforeEach(() => {
  vi.clearAllMocks()
  incrementWindow.mockResolvedValue(1)
})

describe('GET /api/alerts', () => {
  it('returns 401 when signed out', async () => {
    auth.mockResolvedValue({ userId: null })
    expect((await GET()).status).toBe(401)
  })

  it('returns the signed-in user\'s watched event IDs', async () => {
    auth.mockResolvedValue({ userId: 'user1' })
    getWatchedEventIds.mockResolvedValue(['cftc-cot'])
    const body = await (await GET()).json()
    expect(body.watched).toEqual(['cftc-cot'])
    expect(getWatchedEventIds).toHaveBeenCalledWith('user1')
  })
})

describe('POST /api/alerts', () => {
  beforeEach(() => auth.mockResolvedValue({ userId: 'user1' }))

  it('returns 401 when signed out', async () => {
    auth.mockResolvedValue({ userId: null })
    expect((await POST(postReq({ eventId: 'cftc-cot' }))).status).toBe(401)
  })

  it('returns 429 once the per-user rate limit is exceeded', async () => {
    incrementWindow.mockResolvedValue(101)
    expect((await POST(postReq({ eventId: 'cftc-cot' }))).status).toBe(429)
  })

  it('rejects a missing or unknown eventId', async () => {
    expect((await POST(postReq({}))).status).toBe(400)
    expect((await POST(postReq({ eventId: 'not-a-real-event' }))).status).toBe(400)
    expect(watchEvent).not.toHaveBeenCalled()
  })

  it('rejects watching when the account has no email', async () => {
    currentUser.mockResolvedValue({ primaryEmailAddress: null, emailAddresses: [] })
    const res = await POST(postReq({ eventId: 'cftc-cot' }))
    expect(res.status).toBe(400)
    expect(watchEvent).not.toHaveBeenCalled()
  })

  it('watches a known event using the account email', async () => {
    currentUser.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'a@b.com' }, emailAddresses: [] })
    const res = await POST(postReq({ eventId: 'cftc-cot' }))
    expect(res.status).toBe(200)
    expect(watchEvent).toHaveBeenCalledWith('user1', 'a@b.com', 'cftc-cot')
  })

  it('unwatches when watch:false, without needing currentUser at all', async () => {
    const res = await POST(postReq({ eventId: 'cftc-cot', watch: false }))
    expect(res.status).toBe(200)
    expect(unwatchEvent).toHaveBeenCalledWith('user1', 'cftc-cot')
    expect(currentUser).not.toHaveBeenCalled()
  })
})

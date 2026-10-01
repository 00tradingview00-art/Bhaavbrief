import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const exchangeToken = vi.fn()
vi.mock('@/lib/kite', () => ({
  KiteClient: Object.assign(
    vi.fn().mockImplementation(() => ({ discoverAndCacheTokens: vi.fn().mockResolvedValue(undefined) })),
    { exchangeToken: (...a: unknown[]) => exchangeToken(...a) },
  ),
}))

import { GET } from './route'

const fetchMock = vi.fn()
const req = () => new NextRequest('https://bhaavbrief.in/api/kite/callback?request_token=abc&status=success')

beforeEach(() => {
  process.env.KITE_API_KEY = 'k'
  process.env.KITE_API_SECRET = 's'
  process.env.GITHUB_PAT = 'gh'
  process.env.VERCEL_TOKEN = 'v'
  process.env.VERCEL_PROJECT_ID = 'p'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.KITE_ALLOWED_USER_IDS
})

describe('/api/kite/callback', () => {
  it("refuses another account's session without touching GitHub or Vercel", async () => {
    process.env.KITE_ALLOWED_USER_IDS = 'AB0001'
    exchangeToken.mockResolvedValue({ access_token: 'attacker-token', user_id: 'XY9999', login_time: 'now' })
    const html = await (await GET(req())).text()
    expect(html).toContain('Not Authorised')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts the owner's account and updates the secrets", async () => {
    process.env.KITE_ALLOWED_USER_IDS = 'AB0001, CD0002'
    exchangeToken.mockResolvedValue({ access_token: 'owner-token', user_id: 'AB0001', login_time: 'now' })
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ key: 'x', key_id: '1', envs: [] }), { status: 200 }))
    const html = await (await GET(req())).text()
    expect(html).toContain('Kite Auth Successful')
    expect(fetchMock).toHaveBeenCalled()
  })

  it('escapes Kite-supplied text in the page', async () => {
    exchangeToken.mockRejectedValue(new Error('<script>alert(1)</script>'))
    const html = await (await GET(req())).text()
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

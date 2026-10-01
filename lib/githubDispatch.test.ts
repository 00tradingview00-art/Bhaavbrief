import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dispatchWorkflow } from './githubDispatch'

const req = (auth?: string) =>
  new Request('https://bhaavbrief.in/api/cron/monitor', { headers: auth ? { authorization: auth } : {} })

const fetchMock = vi.fn()

beforeEach(() => {
  process.env.CRON_SECRET = 'cron'
  process.env.GH_PAT = 'pat'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.unstubAllGlobals())

describe('dispatchWorkflow', () => {
  it('refuses a caller without the cron secret and never calls GitHub', async () => {
    expect((await dispatchWorkflow(req('Bearer wrong'), 'x.yml', 'x')).status).toBe(401)
    expect((await dispatchWorkflow(req(), 'x.yml', 'x')).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a missing GitHub token instead of silently doing nothing', async () => {
    delete process.env.GH_PAT
    expect((await dispatchWorkflow(req('Bearer cron'), 'x.yml', 'x')).status).toBe(500)
  })

  it('dispatches the named workflow on main', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const res = await dispatchWorkflow(req('Bearer cron'), 'synthetic-monitor.yml', 'monitor')
    expect(res.status).toBe(200)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/repos/00tradingview00-art/Bhaavbrief/actions/workflows/synthetic-monitor.yml/dispatches')
    expect(JSON.parse(init.body)).toEqual({ ref: 'main' })
    expect(init.headers.Authorization).toBe('Bearer pat')
  })

  it('surfaces a GitHub failure as 502 so the timer service shows it as failed', async () => {
    fetchMock.mockResolvedValue(new Response('rate limited', { status: 403 }))
    expect((await dispatchWorkflow(req('Bearer cron'), 'x.yml', 'x')).status).toBe(502)
  })
})

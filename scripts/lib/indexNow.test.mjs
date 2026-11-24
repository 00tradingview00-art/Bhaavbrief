import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pingIndexNow } from './indexNow.mjs'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('pingIndexNow', () => {
  it('posts the key, keyLocation and host alongside the URL list', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    const res = await pingIndexNow(['https://bhaavbrief.in/briefs/edition-152'])
    expect(res.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    const body = JSON.parse(init.body)
    expect(body.host).toBe('bhaavbrief.in')
    expect(body.key).toMatch(/^[0-9a-f]{32}$/)
    expect(body.keyLocation).toBe(`https://bhaavbrief.in/${body.key}.txt`)
    expect(body.urlList).toEqual(['https://bhaavbrief.in/briefs/edition-152'])
  })

  it('accepts a 202 as success too (IndexNow\'s own spec)', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }))
    const res = await pingIndexNow(['https://bhaavbrief.in/briefs/edition-152'])
    expect(res.ok).toBe(true)
  })

  it('reports a non-2xx response rather than throwing', async () => {
    fetchMock.mockResolvedValue(new Response('bad key', { status: 422 }))
    const res = await pingIndexNow(['https://bhaavbrief.in/briefs/edition-152'])
    expect(res.ok).toBe(false)
    expect(res.status).toBe(422)
  })

  it('drops any URL not on this site instead of submitting it to a third party', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }))
    await pingIndexNow(['https://bhaavbrief.in/briefs/edition-152', 'https://evil.example/x'])
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.urlList).toEqual(['https://bhaavbrief.in/briefs/edition-152'])
  })

  it('never calls fetch when every given URL is off-site', async () => {
    const res = await pingIndexNow(['https://evil.example/x'])
    expect(res.ok).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

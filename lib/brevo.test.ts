import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendAlertEmail } from './brevo'

const fetchMock = vi.fn()

beforeEach(() => {
  process.env.BREVO_API_KEY = 'key'
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.BREVO_API_KEY
})

describe('sendAlertEmail', () => {
  const event = { name: 'CFTC COT Report', whenIST: 'Fri 7 Nov · 7:00 PM IST', commodities: ['Gold', 'Silver'] }

  it('sends to the given email and returns true on success', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    const ok = await sendAlertEmail('a@b.com', event)
    expect(ok).toBe(true)
    const [, options] = fetchMock.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.to).toEqual([{ email: 'a@b.com' }])
    expect(body.subject).toContain('CFTC COT Report')
    expect(body.htmlContent).toContain('Gold, Silver')
  })

  it('returns false without throwing when Brevo rejects the send', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'bad' }), { status: 400 }))
    expect(await sendAlertEmail('a@b.com', event)).toBe(false)
  })

  it('throws if BREVO_API_KEY is not configured', async () => {
    delete process.env.BREVO_API_KEY
    await expect(sendAlertEmail('a@b.com', event)).rejects.toThrow('BREVO_API_KEY')
  })
})

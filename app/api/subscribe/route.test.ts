import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const addSubscriber = vi.fn()
vi.mock('@/lib/brevo', () => ({
  addSubscriber: (...a: unknown[]) => addSubscriber(...a),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/briefs', () => ({ getAllBriefs: async () => [] }))
vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: async () => true, getClientIp: () => '1.2.3.4' }))

import { POST } from './route'

const post = (body: unknown) =>
  new NextRequest('https://bhaavbrief.in/api/subscribe', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  addSubscriber.mockReset()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('/api/subscribe', () => {
  it('rejects a non-string or malformed email with 400, not a crash', async () => {
    expect((await POST(post({ email: 12345 }))).status).toBe(400)
    expect((await POST(post({ email: 'a@b' }))).status).toBe(400)
    expect(addSubscriber).not.toHaveBeenCalled()
  })

  it("never echoes the email provider's error text", async () => {
    addSubscriber.mockRejectedValue(new Error('Brevo: invalid api-key abc123 for account 42'))
    const res = await POST(post({ email: 'trader@example.com' }))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('api-key')
  })

  it('still treats an existing contact as success', async () => {
    addSubscriber.mockRejectedValue(new Error('Contact already exist'))
    expect(await (await POST(post({ email: 'trader@example.com' }))).json()).toMatchObject({ success: true })
  })
})

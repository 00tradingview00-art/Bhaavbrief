import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUpcomingEvents = vi.fn()
vi.mock('@/lib/eventMap', () => ({ getUpcomingEvents: (...a: unknown[]) => getUpcomingEvents(...a) }))

const getWatchers = vi.fn()
const getNotifyEmail = vi.fn()
const wasNotified = vi.fn()
const markNotified = vi.fn()
vi.mock('@/lib/alertSubscriptions', () => ({
  getWatchers: (...a: unknown[]) => getWatchers(...a),
  getNotifyEmail: (...a: unknown[]) => getNotifyEmail(...a),
  wasNotified: (...a: unknown[]) => wasNotified(...a),
  markNotified: (...a: unknown[]) => markNotified(...a),
}))

const sendAlertEmail = vi.fn()
vi.mock('@/lib/brevo', () => ({ sendAlertEmail: (...a: unknown[]) => sendAlertEmail(...a) }))

import { GET } from './route'

const authed = () => new Request('https://bhaavbrief.in/api/cron/alerts', {
  headers: { authorization: 'Bearer cron' },
})

function event(id: string) {
  return { id, name: 'CFTC COT Report', next_release_utc: '2026-11-07T13:30:00Z', affected_contracts: ['gold'] }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'cron'
})

describe('/api/cron/alerts', () => {
  it('rejects a missing/wrong bearer token', async () => {
    const res = await GET(new Request('https://bhaavbrief.in/api/cron/alerts'))
    expect(res.status).toBe(401)
    expect(getUpcomingEvents).not.toHaveBeenCalled()
  })

  it('skips an event with no watchers entirely', async () => {
    getUpcomingEvents.mockReturnValue([event('cftc-cot')])
    getWatchers.mockResolvedValue([])
    const body = await (await GET(authed())).json()
    expect(body.results).toEqual({})
    expect(sendAlertEmail).not.toHaveBeenCalled()
  })

  it('sends to a watcher who has not been notified yet, then marks them notified', async () => {
    getUpcomingEvents.mockReturnValue([event('cftc-cot')])
    getWatchers.mockResolvedValue(['user1'])
    wasNotified.mockResolvedValue(false)
    getNotifyEmail.mockResolvedValue('a@b.com')
    sendAlertEmail.mockResolvedValue(true)

    const body = await (await GET(authed())).json()
    expect(sendAlertEmail).toHaveBeenCalledWith('a@b.com', expect.objectContaining({ name: 'CFTC COT Report' }))
    expect(markNotified).toHaveBeenCalledWith('cftc-cot', 'user1')
    expect(body.results['cftc-cot']).toBe('notified 1/1 watcher(s)')
  })

  it('does not re-notify a watcher already marked notified — the cron is idempotent', async () => {
    getUpcomingEvents.mockReturnValue([event('cftc-cot')])
    getWatchers.mockResolvedValue(['user1'])
    wasNotified.mockResolvedValue(true)

    await GET(authed())
    expect(sendAlertEmail).not.toHaveBeenCalled()
    expect(markNotified).not.toHaveBeenCalled()
  })

  it('skips a watcher with no cached notify email rather than throwing', async () => {
    getUpcomingEvents.mockReturnValue([event('cftc-cot')])
    getWatchers.mockResolvedValue(['user1'])
    wasNotified.mockResolvedValue(false)
    getNotifyEmail.mockResolvedValue(null)

    await GET(authed())
    expect(sendAlertEmail).not.toHaveBeenCalled()
    expect(markNotified).not.toHaveBeenCalled()
  })

  it('does not mark notified when the email send itself fails', async () => {
    getUpcomingEvents.mockReturnValue([event('cftc-cot')])
    getWatchers.mockResolvedValue(['user1'])
    wasNotified.mockResolvedValue(false)
    getNotifyEmail.mockResolvedValue('a@b.com')
    sendAlertEmail.mockResolvedValue(false)

    const body = await (await GET(authed())).json()
    expect(markNotified).not.toHaveBeenCalled()
    expect(body.results).toEqual({})
  })
})

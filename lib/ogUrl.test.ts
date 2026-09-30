import { describe, it, expect, beforeEach } from 'vitest'
import { ogImageUrl } from './ogUrl'
import { isSignedOgRequest } from './ogVerify'

const params = (url: string) => new URL(url).searchParams

beforeEach(() => {
  process.env.CRON_SECRET = 'test-key'
  delete process.env.OG_SIGNING_SECRET
})

describe('signed OG image URLs', () => {
  it('a URL built by the site verifies at the route', async () => {
    const url = ogImageUrl({ title: 'MCX Gold & Silver — 30 Sep', edition: '117', tags: 'Gold,USD/INR' })
    expect(await isSignedOgRequest(params(url), 'test-key')).toBe(true)
  })

  it('a changed title is rejected', async () => {
    const url = new URL(ogImageUrl({ title: 'MCX Close' }))
    url.searchParams.set('title', 'BhaavBrief says BUY GOLD NOW')
    expect(await isSignedOgRequest(url.searchParams, 'test-key')).toBe(false)
  })

  it('an unsigned URL is rejected when a key is configured', async () => {
    expect(await isSignedOgRequest(new URLSearchParams({ title: 'anything' }), 'test-key')).toBe(false)
  })

  it('accepts anything when no key is configured (local development)', async () => {
    expect(await isSignedOgRequest(new URLSearchParams({ title: 'x' }), undefined)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { chainCacheControl } from './optionsCacheControl'

const PUBLIC = 'public, s-maxage=30, stale-while-revalidate=10'
const PRIVATE = 'private, no-store'

describe('chainCacheControl', () => {
  it('share-caches only the anonymous free response', () => {
    expect(chainCacheControl({ pro: false, signedIn: false, hasSessionCookie: false })).toBe(PUBLIC)
  })

  it('keeps Pro and signed-in free responses private', () => {
    expect(chainCacheControl({ pro: true, signedIn: true, hasSessionCookie: true })).toBe(PRIVATE)
    expect(chainCacheControl({ pro: false, signedIn: true, hasSessionCookie: true })).toBe(PRIVATE)
  })

  it('keeps a request with an unaccepted session cookie private, so it cannot poison the session cache key', () => {
    expect(chainCacheControl({ pro: false, signedIn: false, hasSessionCookie: true })).toBe(PRIVATE)
  })

  it('keeps internal-access responses private', () => {
    expect(chainCacheControl({ pro: true, signedIn: false, hasSessionCookie: false })).toBe(PRIVATE)
  })
})

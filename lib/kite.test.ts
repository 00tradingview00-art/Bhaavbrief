import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MCXInstrument } from './kite'

// Regression test for a real production incident: getFullMCXInstrumentsCached
// used to be wrapped in Next's unstable_cache, whose data-cache has an
// undocumented size ceiling (~2MB) that the full MCX instrument list (every
// commodity's FUT+CE+PE contracts) exceeds. Every cache-repopulate attempt
// threw instead of caching, silently taking down every caller (the options
// chain API, the ATM IV snapshot cron) whenever the hourly revalidate window
// expired — even though the underlying Kite fetch had already succeeded.
// These tests lock in the in-memory replacement: a cache hit must avoid a
// second network call, and it must never throw regardless of payload size.
//
// Each test re-imports the module fresh (vi.resetModules) since the cache
// lives in module-scope closure state, shared across calls by design — tests
// need their own isolated instance of that state, not a shared one.
describe('getFullMCXInstrumentsCached', () => {
  const fakeInstrument: MCXInstrument = {
    instrument_token: 1, exchange_token: 1, tradingsymbol: 'GOLD26AUGFUT',
    name: 'GOLD', last_price: 152000, expiry: '2026-08-31', strike: 0,
    tick_size: 1, lot_size: 100, instrument_type: 'FUT', segment: 'MCX', exchange: 'MCX',
  }

  beforeEach(() => {
    process.env.KITE_API_KEY      = 'test-key'
    process.env.KITE_ACCESS_TOKEN = 'test-token'
    vi.useFakeTimers()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  test('a second call within the TTL is served from cache — no second fetch', async () => {
    // KiteClient must come from the SAME freshly-reset module instance as
    // getFullMCXInstrumentsCached (which constructs its own KiteClient
    // internally) — a statically-imported KiteClient would be a different
    // class object post-resetModules, and spying on its prototype wouldn't
    // intercept the internal call at all.
    const { KiteClient, getFullMCXInstrumentsCached } = await import('./kite')
    const spy = vi.spyOn(KiteClient.prototype, 'getFullMCXInstruments').mockResolvedValue([fakeInstrument])

    const first  = await getFullMCXInstrumentsCached()
    const second = await getFullMCXInstrumentsCached()

    expect(first).toEqual([fakeInstrument])
    expect(second).toEqual([fakeInstrument])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  test('a call after the TTL expires triggers a fresh fetch', async () => {
    const { KiteClient, getFullMCXInstrumentsCached } = await import('./kite')
    const spy = vi.spyOn(KiteClient.prototype, 'getFullMCXInstruments').mockResolvedValue([fakeInstrument])

    await getFullMCXInstrumentsCached()
    vi.advanceTimersByTime(3600_000 + 1)
    await getFullMCXInstrumentsCached()

    expect(spy).toHaveBeenCalledTimes(2)
  })

  test('never throws for a large payload — the exact failure mode this replaced unstable_cache for', async () => {
    const { KiteClient, getFullMCXInstrumentsCached } = await import('./kite')
    // ~4.6MB, matching the real payload size that broke unstable_cache in production.
    const bigPayload = Array.from({ length: 40000 }, () => fakeInstrument)
    vi.spyOn(KiteClient.prototype, 'getFullMCXInstruments').mockResolvedValue(bigPayload)

    await expect(getFullMCXInstrumentsCached()).resolves.toHaveLength(40000)
  })
})

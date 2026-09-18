import { describe, test, expect, beforeEach, vi } from 'vitest'
import { getSinceLastVisit, MIN_GAP_MS } from './lastSeenPrices'

// vitest's default environment is Node, so `localStorage` isn't a real
// global here — stub a minimal in-memory implementation, reset between
// tests so state doesn't leak across cases.
function makeMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    removeItem: (k: string) => { map.delete(k) },
    clear: () => { map.clear() },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', makeMemoryStorage())
})

describe('getSinceLastVisit', () => {
  test('first-ever visit: seeds the baseline silently, nothing to show', () => {
    const result = getSinceLastVisit('gold', 100000, 1000)
    expect(result).toBeNull()

    // A second call moments later (before MIN_GAP_MS) still has nothing to
    // show, and must not disturb the seeded baseline.
    const stillSame = getSinceLastVisit('gold', 100500, 1500)
    expect(stillSame).toBeNull()
  })

  test('a refresh within the same-visit window does not overwrite the baseline', () => {
    getSinceLastVisit('gold', 100000, 1000)
    getSinceLastVisit('gold', 105000, 1000 + MIN_GAP_MS - 1)

    // Now cross the threshold from the ORIGINAL baseline (100000), not the
    // refreshed-but-ignored 105000 value.
    const result = getSinceLastVisit('gold', 110000, 1000 + MIN_GAP_MS)
    expect(result).toEqual({
      previousPrice: 100000,
      previousTs: 1000,
      delta: 10000,
      deltaPct: 10,
    })
  })

  test('a real return visit computes the delta and rolls the baseline forward', () => {
    getSinceLastVisit('crude-oil', 6500, 0)

    const result = getSinceLastVisit('crude-oil', 6370, MIN_GAP_MS)
    expect(result).toEqual({
      previousPrice: 6500,
      previousTs: 0,
      delta: -130,
      deltaPct: -2,
    })

    // Baseline is now 6370 @ MIN_GAP_MS — a third visit compares against that.
    const third = getSinceLastVisit('crude-oil', 6500, MIN_GAP_MS * 2)
    expect(third?.previousPrice).toBe(6370)
  })

  test('ignores a non-positive current price (never records a bad/missing price)', () => {
    expect(getSinceLastVisit('silver', 0, 0)).toBeNull()
    expect(getSinceLastVisit('silver', -5, 0)).toBeNull()

    // No baseline should have been seeded by either call.
    const result = getSinceLastVisit('silver', 200000, MIN_GAP_MS)
    expect(result).toBeNull()
  })

  test('different commodities are tracked independently', () => {
    getSinceLastVisit('gold', 100000, 0)
    getSinceLastVisit('silver', 200000, 0)

    const gold = getSinceLastVisit('gold', 101000, MIN_GAP_MS)
    const silver = getSinceLastVisit('silver', 198000, MIN_GAP_MS)

    expect(gold).toEqual({ previousPrice: 100000, previousTs: 0, delta: 1000, deltaPct: 1 })
    expect(silver).toEqual({ previousPrice: 200000, previousTs: 0, delta: -2000, deltaPct: -1 })
  })
})

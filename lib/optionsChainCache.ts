import { redisCommand } from '@/lib/redis'

// Last-known-good fallback cache for the options chain, used by
// app/api/options/route.ts. Kept in its own module (not lib/options.ts,
// which a client component imports for MCX_INSTRUMENTS) — lib/redis.ts pulls
// in scripts/lib/holidays.js via lib/tradingCalendar.ts, which uses Node's
// `fs` and cannot be bundled for the browser.
const CHAIN_CACHE_TTL_SECONDS = 24 * 60 * 60 // a day-old chain beats a 503

function chainCacheKey(instrument: string): string {
  return `options-chain-cache:${instrument}`
}

export async function cacheOptionsChain(instrument: string, payload: unknown): Promise<void> {
  try {
    await redisCommand('SET', chainCacheKey(instrument), JSON.stringify(payload), 'EX', String(CHAIN_CACHE_TTL_SECONDS))
  } catch (err) {
    // Never let a cache-write failure break the live response it's caching.
    console.error('[options] failed to cache chain for', instrument, err)
  }
}

export async function getCachedOptionsChain(instrument: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await redisCommand('GET', chainCacheKey(instrument))
    if (!raw || typeof raw !== 'string') return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch (err) {
    console.error('[options] failed to read cached chain for', instrument, err)
    return null
  }
}

// Fixed-window per-key counter for the Cashfree routes.
//
// The key is created together with its TTL (SET … EX … NX) before INCR, so it
// can never exist without an expiry. The previous INCR-then-EXPIRE pattern
// left a key with no TTL whenever the EXPIRE call failed, locking that user
// out of checkout/cancel/change-plan permanently.

import { redisCommand } from './redis'

export async function incrementWindow(key: string, windowSeconds: number): Promise<number> {
  await redisCommand('SET', key, '0', 'EX', String(windowSeconds), 'NX')
  return Number(await redisCommand('INCR', key))
}

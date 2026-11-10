// Thin wrapper around the Upstash Redis REST API (single-command form).
// The actual fetch logic lives in scripts/lib/redisClient.js — shared with
// plain Node scripts, which can't import this .ts file directly — this
// module just re-exports it with the explicit TS signature app/ code relies on.

export { todayIST } from './tradingCalendar'

import { redisCommand as redisCommandImpl } from '../scripts/lib/redisClient.js'

export async function redisCommand(cmd: string, ...args: string[]): Promise<unknown> {
  return redisCommandImpl(cmd, ...args)
}

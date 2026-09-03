// Thin wrapper around the Upstash Redis REST API (single-command form).

export { todayIST } from './tradingCalendar'

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export async function redisCommand(cmd: string, ...args: string[]): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis not configured — UPSTASH_REDIS_REST_URL/TOKEN missing')
  const res = await fetch(`${REDIS_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Redis ${cmd} failed: ${res.status} ${await res.text()}`)
  const json = await res.json() as { result?: unknown }
  return json.result ?? null
}

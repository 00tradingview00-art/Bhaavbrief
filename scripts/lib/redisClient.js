// Shared Upstash Redis REST API client (single-command form).
//
// This is the implementation lib/redis.ts's typed redisCommand() wraps for
// app/ TypeScript code. It lives here, as plain .js, so scripts/*.mjs (which
// cannot import .ts files directly — see CLAUDE.md's cross-boundary import
// rule) can use the exact same client instead of duplicating it, the way
// scripts/lib/holidays.js is the shared source of truth for lib/tradingCalendar.ts.

// Read lazily at call time, not at module load — scripts/fetch-snapshot.mjs
// (and other .mjs scripts) load .env.local by hand *after* their top-level
// imports run, since ESM import evaluation is hoisted ahead of any script
// body code. Capturing these into module-level constants at import time
// would always see them as unset.
export async function redisCommand(cmd, ...args) {
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis not configured — UPSTASH_REDIS_REST_URL/TOKEN missing')
  const res = await fetch(`${REDIS_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Redis ${cmd} failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.result ?? null
}

// POST-body form of SET — the path-encoded form above puts the command's
// arguments in the request URL, which fails ("Failed to parse URL") once
// the value is more than a few hundred bytes (confirmed against the
// multi-KB market-snapshot JSON blob). Every other call site in this
// codebase uses small values the path form handles fine, so this exists
// only for writes where the value itself can be large.
export async function redisSetJSON(key, value) {
  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!REDIS_URL || !REDIS_TOKEN) throw new Error('Redis not configured — UPSTASH_REDIS_REST_URL/TOKEN missing')
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.result ?? null
}

// Sliding-window rate limiter via Upstash Redis REST API.

export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  // Vercel's edge appends the real connecting IP as the LAST entry in
  // x-forwarded-for — earlier entries are client-supplied and spoofable.
  const xff = req.headers.get('x-forwarded-for')
  const last = xff?.split(',').pop()?.trim()
  if (last) return last
  return req.headers.get('x-real-ip') ?? 'unknown'
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return true  // fail open if Redis not configured

  const now = Date.now()

  try {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    // Remove entries older than the window, add current timestamp, count window entries
    await fetch(`${url}/zremrangebyscore/${key}/0/${now - windowMs}`, { method: 'POST', headers })
    await fetch(`${url}/zadd/${key}/${now}/${now}`,                   { method: 'POST', headers })
    await fetch(`${url}/expire/${key}/${Math.ceil(windowMs / 1000)}`, { method: 'POST', headers })
    const countRes = await fetch(`${url}/zcard/${key}`,               { method: 'POST', headers })
    const { result } = await countRes.json() as { result: number }
    return result <= limit
  } catch {
    return true  // fail open on Redis error
  }
}

import { createHash } from 'crypto'

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const UNLOCK_THRESHOLD = 5

/** Deterministic ref code from email — same email always produces same 12-char hex code */
export function getRefCode(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 12)
}

/** Build the public referral URL for a given ref code */
export function getRefUrl(refCode: string): string {
  return `https://bhaavbrief.in/?ref=${refCode}`
}

async function redis(cmd: string, ...args: string[]): Promise<unknown> {
  if (!REDIS_URL || !REDIS_TOKEN) return null
  const res = await fetch(`${REDIS_URL}/${[cmd, ...args].map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json() as { result?: unknown }
  return json.result ?? null
}

/** Record a unique visitor for a ref code. Returns {visits, unlocked}. */
export async function recordReferralVisit(refCode: string, visitorId: string): Promise<{ visits: number; unlocked: boolean }> {
  await redis('sadd', `ref:${refCode}:visitors`, visitorId)
  const count = (await redis('scard', `ref:${refCode}:visitors`) as number) ?? 0
  return { visits: count, unlocked: count >= UNLOCK_THRESHOLD }
}

/** Get current referral status for a ref code. */
export async function getReferralStatus(refCode: string): Promise<{ visits: number; unlocked: boolean }> {
  if (!REDIS_URL || !REDIS_TOKEN) return { visits: 0, unlocked: false }
  const count = (await redis('scard', `ref:${refCode}:visitors`) as number) ?? 0
  return { visits: count, unlocked: count >= UNLOCK_THRESHOLD }
}

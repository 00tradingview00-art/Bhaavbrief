// Signed /api/og image URLs.
//
// /api/og renders whatever `title`/`tags` it is given as a BhaavBrief-branded
// image on bhaavbrief.in — so anyone could mint an official-looking card
// ("BhaavBrief: BUY GOLD NOW") and share it. Every URL the site itself builds
// now carries an HMAC of its parameters; app/api/og/route.tsx renders the
// requested text only when the signature matches, and the generic card
// otherwise.
//
// Server-only (node:crypto, synchronous so static `metadata` objects can use
// it). The route verifies with Web Crypto (lib/ogVerify.ts), over the same
// canonicalOgString.
import { createHmac } from 'crypto'
import { canonicalOgString } from './ogVerify'

const BASE = 'https://bhaavbrief.in'

/** Key: a dedicated secret if set, else CRON_SECRET (already in every environment). */
export function ogSigningKey(): string | undefined {
  return process.env.OG_SIGNING_SECRET || process.env.CRON_SECRET || undefined
}

export function ogImageUrl(fields: Record<string, string>): string {
  const params = new URLSearchParams(fields)
  const key = ogSigningKey()
  if (key) params.set('sig', createHmac('sha256', key).update(canonicalOgString(params)).digest('hex'))
  return `${BASE}/api/og?${params}`
}

// Verifies /api/og signatures (see lib/ogUrl.ts). Edge-safe: Web Crypto only,
// no node: imports — app/api/og/route.tsx runs on the edge runtime.

// The exact string that is signed (lib/ogUrl.ts) and verified (here).
export function canonicalOgString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([k]) => k !== 'sig')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

/** True when `params` carry a valid signature for `key`; with no key (local dev) everything passes. */
export async function isSignedOgRequest(params: URLSearchParams, key: string | undefined): Promise<boolean> {
  if (!key) return true
  const sig = params.get('sig') ?? ''
  const cryptoKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(canonicalOgString(params)))
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
  if (sig.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}

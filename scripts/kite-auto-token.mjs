#!/usr/bin/env node
/**
 * scripts/kite-auto-token.mjs
 *
 * Fully automated Kite access-token refresh (no browser needed).
 * Requires TOTP-based 2FA on Zerodha.
 *
 * Required env vars:
 *   KITE_API_KEY, KITE_API_SECRET
 *   ZERODHA_USER_ID, ZERODHA_PASSWORD, ZERODHA_TOTP_SECRET
 *
 * Steps:
 *   1. POST /api/login  → request_id
 *   2. Generate TOTP from secret
 *   3. POST /api/twofa  → session cookies
 *   4. GET  Kite Connect login → captures request_token from redirect
 *   5. Exchange request_token → access_token
 *   6. Push to GitHub Actions secret + Vercel env
 */

import crypto        from 'crypto'
import { execFileSync } from 'child_process'
import fs            from 'fs'
import path          from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const API_KEY      = process.env.KITE_API_KEY
const API_SECRET   = process.env.KITE_API_SECRET
const USER_ID      = process.env.ZERODHA_USER_ID
const PASSWORD     = process.env.ZERODHA_PASSWORD
const TOTP_SECRET  = process.env.ZERODHA_TOTP_SECRET
const GITHUB_REPO  = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'

for (const [k, v] of Object.entries({ KITE_API_KEY: API_KEY, KITE_API_SECRET: API_SECRET, ZERODHA_USER_ID: USER_ID, ZERODHA_PASSWORD: PASSWORD, ZERODHA_TOTP_SECRET: TOTP_SECRET })) {
  if (!v) { console.error(`❌  Missing env var: ${k}`); process.exit(1) }
}

// ── TOTP (RFC 6238) — no external deps ───────────────────────────────────────

function base32Decode(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean    = str.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0, val = 0
  const out = []
  for (const ch of clean) {
    val = (val << 5) | alphabet.indexOf(ch)
    bits += 5
    if (bits >= 8) { bits -= 8; out.push((val >> bits) & 0xff) }
  }
  return Buffer.from(out)
}

function generateTOTP(secret) {
  const key   = base32Decode(secret)
  const epoch = Math.floor(Date.now() / 1000 / 30)
  const buf   = Buffer.alloc(8)
  buf.writeBigInt64BE(BigInt(epoch))
  const hmac  = crypto.createHmac('sha1', key).update(buf).digest()
  const off   = hmac[hmac.length - 1] & 0xf
  const code  = ((hmac[off] & 0x7f) << 24 | hmac[off+1] << 16 | hmac[off+2] << 8 | hmac[off+3]) % 1_000_000
  return code.toString().padStart(6, '0')
}

// ── Cookie jar (simple, enough for Zerodha) ───────────────────────────────────

class Jar {
  #store = {}
  add(header) {
    if (!header) return
    const arr = Array.isArray(header) ? header : [header]
    for (const h of arr) {
      const [pair] = h.split(';')
      const [k, v] = pair.split('=')
      if (k && v !== undefined) this.#store[k.trim()] = v.trim()
    }
  }
  header() {
    return Object.entries(this.#store).map(([k, v]) => `${k}=${v}`).join('; ')
  }
}

// ── Zerodha + Kite Connect flow ───────────────────────────────────────────────

async function run() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  BhaavBrief — Kite Auto Token Refresh')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const jar = new Jar()
  const headers = (extra = {}) => ({
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 BhaavBrief/2.0',
    Cookie: jar.header(),
    ...extra,
  })

  // ── Step 1: Login ────────────────────────────────────────────────────────────
  process.stdout.write('1/5  Zerodha login.........')
  const loginRes = await fetch('https://kite.zerodha.com/api/login', {
    method: 'POST',
    headers: headers(),
    body: new URLSearchParams({ user_id: USER_ID, password: PASSWORD }),
    signal: AbortSignal.timeout(10000),
  })
  jar.add(loginRes.headers.getSetCookie?.() ?? loginRes.headers.get('set-cookie'))
  const loginData = await loginRes.json()

  if (loginData.status !== 'success') {
    console.log(' ❌')
    console.error('   Login failed:', loginData.message ?? JSON.stringify(loginData))
    process.exit(1)
  }
  const requestId = loginData.data?.request_id
  console.log(' ✅')

  // ── Step 2: TOTP 2FA ─────────────────────────────────────────────────────────
  process.stdout.write('2/5  TOTP 2FA..............')
  const totp = generateTOTP(TOTP_SECRET)
  const twoFaRes = await fetch('https://kite.zerodha.com/api/twofa', {
    method: 'POST',
    headers: headers(),
    body: new URLSearchParams({
      request_id:   requestId,
      user_id:      USER_ID,
      twofa_value:  totp,
      twofa_type:   'totp',
      skip_session: '',
    }),
    signal: AbortSignal.timeout(10000),
  })
  jar.add(twoFaRes.headers.getSetCookie?.() ?? twoFaRes.headers.get('set-cookie'))
  const twoFaData = await twoFaRes.json()

  if (twoFaData.status !== 'success') {
    console.log(' ❌')
    console.error('   2FA failed:', twoFaData.message ?? JSON.stringify(twoFaData))
    process.exit(1)
  }
  console.log(' ✅')

  // ── Step 3: Kite Connect OAuth → request_token ───────────────────────────────
  process.stdout.write('3/5  Kite Connect OAuth....')
  const connectRes = await fetch(
    `https://kite.trade/connect/login?api_key=${API_KEY}&v=3`,
    {
      headers: headers({ Accept: 'text/html' }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    }
  )

  // Follow redirects manually until we hit the callback with request_token
  let location = connectRes.headers.get('location')
  for (let i = 0; i < 5 && location && !location.includes('request_token'); i++) {
    jar.add(connectRes.headers.getSetCookie?.() ?? connectRes.headers.get('set-cookie'))
    const r = await fetch(location, {
      headers: headers({ Accept: 'text/html' }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })
    jar.add(r.headers.getSetCookie?.() ?? r.headers.get('set-cookie'))
    location = r.headers.get('location')
  }

  if (!location?.includes('request_token')) {
    console.log(' ❌')
    console.error('   Could not capture request_token. Last location:', location)
    process.exit(1)
  }

  const requestToken = new URL(location, 'https://kite.trade').searchParams.get('request_token')
  console.log(' ✅')

  // ── Step 4: Exchange request_token → access_token ────────────────────────────
  process.stdout.write('4/5  Exchange token........')
  const checksum = crypto.createHash('sha256')
    .update(API_KEY + requestToken + API_SECRET).digest('hex')

  const tokenRes  = await fetch('https://api.kite.trade/session/token', {
    method: 'POST',
    headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ api_key: API_KEY, request_token: requestToken, checksum }),
    signal: AbortSignal.timeout(10000),
  })
  const tokenData = await tokenRes.json()

  if (tokenData.status !== 'success') {
    console.log(' ❌')
    console.error('   Token exchange failed:', tokenData.message)
    process.exit(1)
  }
  const accessToken = tokenData.data.access_token
  const userId      = tokenData.data.user_id
  console.log(` ✅  (${userId})`)

  // ── Step 5: Sync to GitHub + Vercel ──────────────────────────────────────────
  process.stdout.write('5/5  Sync GitHub + Vercel..')
  let syncOk = true

  try {
    execFileSync('gh', ['secret', 'set', 'KITE_ACCESS_TOKEN', '--repo', GITHUB_REPO, '--body', accessToken], { stdio: 'pipe' })
  } catch (e) {
    console.error('\n   GitHub secret sync failed:', e.stderr?.toString().trim())
    syncOk = false
  }

  try {
    execFileSync('vercel', ['env', 'add', 'KITE_ACCESS_TOKEN', 'production', '--force'],
      { input: accessToken, stdio: ['pipe', 'pipe', 'pipe'] })
  } catch (e) {
    console.error('\n   Vercel env sync failed:', e.stderr?.toString().trim())
    syncOk = false
  }

  // Also patch .env.local for local dev
  try {
    let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
    content = /^KITE_ACCESS_TOKEN=/m.test(content)
      ? content.replace(/^KITE_ACCESS_TOKEN=.*/m, `KITE_ACCESS_TOKEN=${accessToken}`)
      : content.trimEnd() + `\nKITE_ACCESS_TOKEN=${accessToken}\n`
    fs.writeFileSync(envFile, content, 'utf8')
  } catch {}

  console.log(syncOk ? ' ✅' : ' ⚠️  partial sync')

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  ✅  Token refreshed for ${userId}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

run().catch(e => { console.error('Fatal:', e); process.exit(1) })

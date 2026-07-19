#!/usr/bin/env node
/**
 * scripts/kite-morning-auth.js
 *
 * Run once every morning. Opens the Kite login page; Kite redirects to the
 * production callback (https://bhaavbrief.in/api/kite/callback), which does
 * the actual work — exchanges the token and syncs it to GitHub Secrets and
 * Vercel env (with a redeploy) on its own. This script just opens the login
 * link and polls the live site to confirm that sync actually completed.
 *
 * (Earlier versions of this script ran their own localhost callback server.
 * That only worked because the Kite Connect app's redirect URL used to point
 * at localhost. The app was recreated with an https:// redirect requirement,
 * so it now points at production instead — the token is exchanged there and
 * never comes back to this machine, which is also why this script can no
 * longer patch .env.local or commit data/kite-instruments.json locally.
 * Instrument/contract-spec rollover is handled independently by the
 * kite-morning-auth.yml GitHub Actions workflow, which reads KITE_ACCESS_TOKEN
 * straight from GitHub Secrets after this script's login syncs it.)
 *
 * Required in .env.local:
 *   KITE_API_KEY
 *   GITHUB_REPO (default: 00tradingview00-art/Bhaavbrief) — for the optional
 *   instant generate-brief.yml dispatch (needs GITHUB_TOKEN or `gh` login)
 */

import { exec, execFileSync } from 'child_process'
import fs                     from 'fs'
import path                   from 'path'
import { fileURLToPath }      from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')
const SITE_URL  = 'https://bhaavbrief.in'

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
const GITHUB_REPO  = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'

if (!API_KEY) {
  console.error('❌  KITE_API_KEY must be set in .env.local')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True once the live site is actually pulling quotes through Kite (not just the twelvedata fallback). */
async function siteHasFreshKiteData() {
  try {
    const res = await fetch(`${SITE_URL}/api/prices`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return false
    const data = await res.json()
    return typeof data.source === 'string' && data.source.includes('kite')
  } catch {
    return false
  }
}

async function dispatchGenerateBrief() {
  try {
    let ghToken = process.env.GITHUB_TOKEN ?? ''
    if (!ghToken) {
      try { ghToken = execFileSync('gh', ['auth', 'token'], { stdio: 'pipe' }).toString().trim() } catch { /* no gh token */ }
    }
    if (!ghToken) return false

    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/generate-brief.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
        signal: AbortSignal.timeout(15000),
      }
    )
    return res.status === 204 // 204 = accepted
  } catch (err) {
    console.error('\n   GitHub dispatch error:', err.message)
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — Kite Morning Auth')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

process.stdout.write('Checking if the site already has fresh Kite data...')
if (await siteHasFreshKiteData()) {
  console.log(' ✅  Already live — no login needed.\n')
  process.exit(0)
}
console.log(' not yet.\n')

const LOGIN_URL = `https://kite.trade/connect/login?api_key=${API_KEY}&v=3`
console.log('Opening Kite login in your browser...')
console.log(`(If it didn't open: ${LOGIN_URL})\n`)
console.log('Log in there. Kite redirects to bhaavbrief.in, which syncs the token')
console.log('to GitHub Secrets and Vercel automatically.\n')

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
exec(`${opener} "${LOGIN_URL}"`)

process.stdout.write('Waiting for login to complete')
const deadline = Date.now() + 5 * 60 * 1000
let success = false
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 5000))
  if (await siteHasFreshKiteData()) { success = true; break }
  process.stdout.write('.')
}

if (!success) {
  console.log('\n\n❌  No successful login detected within 5 minutes.')
  console.log(`   Retry: ${LOGIN_URL}`)
  console.log(`   Or check ${SITE_URL}/api/kite/callback directly after logging in.`)
  process.exit(1)
}

console.log('\n\n✅  Live Kite data confirmed on the site.')

process.stdout.write('📰  Brief dispatch..')
const briefOk = await dispatchGenerateBrief()
console.log(briefOk ? ' ✅  (generate-brief.yml queued)' : ' ⚠️   dispatch failed — GITHUB_TOKEN needed in .env.local, or run `gh auth login`')

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  ✅  BhaavBrief is live on Kite data')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

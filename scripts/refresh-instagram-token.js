#!/usr/bin/env node
/**
 * scripts/refresh-instagram-token.js
 *
 * Exchanges a short-lived Instagram token (1 hour) for a long-lived token
 * (60 days), then saves it to .env.local and GitHub secrets.
 *
 * Run this whenever the token expires:
 *   node scripts/refresh-instagram-token.js
 *
 * Required in .env.local (or as env vars):
 *   INSTAGRAM_ACCESS_TOKEN  — fresh short-lived token from Graph API Explorer
 *   META_APP_ID             — from developers.facebook.com → App Settings → Basic
 *   META_APP_SECRET         — from developers.facebook.com → App Settings → Basic
 *   GITHUB_REPO             — defaults to 00tradingview00-art/Bhaavbrief
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')
const envFile   = path.join(ROOT, '.env.local')

// Load .env.local
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const SHORT_TOKEN  = process.env.INSTAGRAM_ACCESS_TOKEN
const APP_ID       = process.env.META_APP_ID
const APP_SECRET   = process.env.META_APP_SECRET
const GITHUB_REPO  = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'

if (!SHORT_TOKEN) { console.error('❌  INSTAGRAM_ACCESS_TOKEN not set'); process.exit(1) }
if (!APP_ID)      { console.error('❌  META_APP_ID not set — get it from developers.facebook.com → App Settings → Basic'); process.exit(1) }
if (!APP_SECRET)  { console.error('❌  META_APP_SECRET not set — get it from developers.facebook.com → App Settings → Basic'); process.exit(1) }

function patchEnvLocal(key, value) {
  let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
  const regex = new RegExp(`^${key}=.*`, 'm')
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`)
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`
  }
  fs.writeFileSync(envFile, content, 'utf8')
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  BhaavBrief — Instagram Token Exchange')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Step 1: Exchange short-lived → long-lived token
  process.stdout.write('🔄  Exchanging for long-lived token...')
  const exchangeUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token')
  exchangeUrl.searchParams.set('grant_type', 'ig_exchange_token')
  exchangeUrl.searchParams.set('client_id', APP_ID)
  exchangeUrl.searchParams.set('client_secret', APP_SECRET)
  exchangeUrl.searchParams.set('access_token', SHORT_TOKEN)

  const exchangeRes  = await fetch(exchangeUrl.toString(), { signal: AbortSignal.timeout(10000) })
  const exchangeData = await exchangeRes.json()

  if (exchangeData.error) {
    console.log('\n')
    console.error('❌  Token exchange failed:', exchangeData.error.message)
    console.error('    Make sure you pasted a FRESH short-lived token from Graph API Explorer.')
    process.exit(1)
  }

  const longToken  = exchangeData.access_token
  const expiresIn  = exchangeData.expires_in  // seconds
  const days       = Math.floor(expiresIn / 86400)
  console.log(` ✅  Valid for ${days} days\n`)

  // Step 2: Save to .env.local
  process.stdout.write('📝  .env.local..........')
  patchEnvLocal('INSTAGRAM_ACCESS_TOKEN', longToken)
  // Also save app credentials if not already persisted
  patchEnvLocal('META_APP_ID', APP_ID)
  patchEnvLocal('META_APP_SECRET', APP_SECRET)
  console.log(' ✅')

  // Step 3: Update GitHub secrets
  process.stdout.write('📦  GitHub secrets......')
  try {
    execFileSync('gh', ['secret', 'set', 'INSTAGRAM_ACCESS_TOKEN', '--repo', GITHUB_REPO, '--body', longToken], { stdio: 'pipe' })
    console.log(' ✅')
  } catch (err) {
    console.log(' ⚠️   gh CLI failed — update manually')
    console.error('    ', err.stderr?.toString().trim() ?? err.message)
  }

  // Step 4: Verify token
  process.stdout.write('🔍  Verifying token.....')
  const verifyRes  = await fetch(`https://graph.facebook.com/v22.0/me?access_token=${longToken}`, { signal: AbortSignal.timeout(8000) })
  const verifyData = await verifyRes.json()
  if (verifyData.error) {
    console.log(' ⚠️   verification failed but token was saved')
  } else {
    console.log(` ✅  (account: ${verifyData.name ?? verifyData.id})`)
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  ✅  Long-lived token saved (${days} days)`)
  console.log('  📅  Set a reminder to refresh before expiry')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main().catch(e => { console.error('\n❌  Error:', e.message); process.exit(1) })

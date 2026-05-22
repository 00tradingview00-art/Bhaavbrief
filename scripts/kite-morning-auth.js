#!/usr/bin/env node
/**
 * scripts/kite-morning-auth.js
 * 
 * Run ONCE every morning before MCX opens (ideally 8:30–9:00 AM IST).
 * 
 * What it does:
 *   1. Opens Kite login in your browser
 *   2. You log in (takes 30 seconds)
 *   3. Captures the access token automatically
 *   4. Updates GitHub Secret KITE_ACCESS_TOKEN (for intelligence engine)
 *   5. Updates Vercel env KITE_ACCESS_TOKEN (for website live prices)
 *   6. Discovers current MCX instrument tokens and caches them
 *   7. Done — BhaavBrief runs on live Kite data all day
 * 
 * Usage:
 *   node scripts/kite-morning-auth.js
 * 
 * Required env (put in .env.local):
 *   KITE_API_KEY=xxx
 *   KITE_API_SECRET=xxx
 *   GITHUB_PAT=ghp_xxx         (needs secrets:write scope)
 *   GITHUB_REPO=00tradingview00-art/Bhaavbrief
 *   VERCEL_TOKEN=xxx
 *   VERCEL_PROJECT_ID=xxx
 */

import { exec }  from 'child_process'
import http       from 'http'
import crypto     from 'crypto'
import { URL }    from 'url'
import fs         from 'fs'
import path       from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(__dirname, '../.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length && !process.env[k.trim()]) {
      process.env[k.trim()] = v.join('=').trim()
    }
  }
}

const {
  KITE_API_KEY:    API_KEY,
  KITE_API_SECRET: API_SECRET,
  GITHUB_PAT,
  GITHUB_REPO = '00tradingview00-art/Bhaavbrief',
  VERCEL_TOKEN,
  VERCEL_PROJECT_ID,
} = process.env

if (!API_KEY || !API_SECRET) {
  console.error('❌ KITE_API_KEY and KITE_API_SECRET must be set in .env.local')
  process.exit(1)
}

const PORT = 8765
const LOGIN_URL = `https://kite.trade/connect/login?api_key=${API_KEY}&v=3`

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — Kite Morning Auth')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
console.log('Opening Kite login in browser...')
console.log(`(If browser doesn't open, go to: ${LOGIN_URL})\n`)

// Open browser
const opener = process.platform === 'darwin' ? 'open'
             : process.platform === 'win32'  ? 'start'
             : 'xdg-open'
exec(`${opener} "${LOGIN_URL}"`)

// Local server to capture the redirect
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    if (url.pathname !== '/kite/callback' && !url.pathname.includes('callback')) {
      res.end('Waiting for Kite login...')
      return
    }

    const requestToken = url.searchParams.get('request_token')
    const status       = url.searchParams.get('status')

    if (status !== 'success' || !requestToken) {
      res.writeHead(400)
      res.end('Login cancelled or failed.')
      server.close()
      process.exit(1)
    }

    console.log('✅ Login successful!')
    console.log('   Exchanging for access token...')

    // Generate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(API_KEY + requestToken + API_SECRET)
      .digest('hex')

    // Exchange for access token
    const tokenRes = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: API_KEY, request_token: requestToken, checksum }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.status !== 'success') {
      console.error('❌ Token exchange failed:', tokenData.message)
      res.writeHead(400)
      res.end('Token exchange failed: ' + tokenData.message)
      server.close()
      process.exit(1)
    }

    const accessToken = tokenData.data.access_token
    const userId      = tokenData.data.user_id
    const loginTime   = tokenData.data.login_time

    console.log(`✅ Access token obtained`)
    console.log(`   User: ${userId} | Login time: ${loginTime}`)
    console.log(`   Token: ${accessToken.slice(0, 12)}...`)

    // Step 1: Update GitHub Secret
    process.stdout.write('\n📦 Updating GitHub Secret KITE_ACCESS_TOKEN...')
    const ghOk = await updateGitHubSecret(accessToken)
    console.log(ghOk ? ' ✅' : ' ⚠️  Failed — run: gh secret set KITE_ACCESS_TOKEN manually')

    // Step 2: Update Vercel env
    process.stdout.write('🔺 Updating Vercel env KITE_ACCESS_TOKEN...')
    const vercelOk = await updateVercelEnv(accessToken)
    console.log(vercelOk ? ' ✅' : ' ⚠️  VERCEL_TOKEN not set — update manually')

    // Step 3: Discover MCX instrument tokens
    process.stdout.write('🔍 Discovering MCX instrument tokens...')
    const instrumentsOk = await discoverInstruments(accessToken)
    console.log(instrumentsOk ? ' ✅' : ' ⚠️  Failed — will retry on first price request')

    // Write success page
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html>
<html>
<head><title>Done — BhaavBrief</title>
<style>body{font-family:system-ui;max-width:480px;margin:60px auto;padding:20px;text-align:center}
.check{font-size:48px;margin-bottom:16px}</style>
</head>
<body>
  <div class="check">✅</div>
  <h2>Done!</h2>
  <p>BhaavBrief is running on live Kite data.<br>You can close this window.</p>
  <p style="color:#888;font-size:13px">Token valid until midnight tonight.</p>
</body>
</html>`)

    server.close()

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✅ BhaavBrief is live on Kite data')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(0)

  } catch (err) {
    console.error('\n❌ Error:', err)
    res.writeHead(500)
    res.end('Internal error: ' + String(err))
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/kite/callback`)
  console.log('Complete the login in your browser...\n')
})

// Timeout
setTimeout(() => {
  console.error('\n❌ Timeout — no login in 5 minutes')
  server.close()
  process.exit(1)
}, 5 * 60 * 1000)

// ── Helpers ───────────────────────────────────────────────────────────────────

async function updateGitHubSecret(token) {
  // Use gh CLI — it handles libsodium encryption correctly
  try {
    const { execFileSync } = await import('child_process')
    execFileSync('gh', [
      'secret', 'set', 'KITE_ACCESS_TOKEN',
      '--repo', GITHUB_REPO,
      '--body', token,
    ], { stdio: 'pipe' })
    return true
  } catch (err) {
    console.error('GitHub secret via gh CLI failed:', err.stderr?.toString() ?? err.message)
    return false
  }
}

async function updateVercelEnv(token) {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return false
  try {
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    const { envs } = await listRes.json()
    const existing = envs?.find(e => e.key === 'KITE_ACCESS_TOKEN')

    if (existing) {
      await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${existing.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: token }),
        }
      )
    } else {
      await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'KITE_ACCESS_TOKEN', value: token, type: 'encrypted', target: ['production'] }),
        }
      )
    }
    return true
  } catch (err) {
    console.error('Vercel update failed:', err)
    return false
  }
}

async function discoverInstruments(accessToken) {
  try {
    const res = await fetch(`https://api.kite.trade/instruments/MCX`, {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${accessToken}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`\n   Kite instruments API ${res.status}: ${body.slice(0, 200)}`)
      return false
    }

    const csv   = await res.text()
    const lines = csv.split('\n').filter(Boolean)
    const header= lines[0].split(',')
    const idx   = col => header.indexOf(col)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const instruments = lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        token:   parseInt(cols[idx('instrument_token')] ?? '0'),
        symbol:  (cols[idx('tradingsymbol')] ?? '').replace(/^"|"$/g, ''),
        name:    (cols[idx('name')]           ?? '').replace(/^"|"$/g, ''),
        expiry:  (cols[idx('expiry')]         ?? '').replace(/^"|"$/g, ''),
        type:    (cols[idx('instrument_type')]?? '').replace(/^"|"$/g, ''),
      }
    }).filter(i => i.token > 0 && i.type === 'FUT' && i.expiry)

    function frontMonth(name) {
      const futures = instruments.filter(i =>
        i.name.toUpperCase() === name.toUpperCase() &&
        new Date(i.expiry) >= today
      ).sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())
      return futures[0] ?? null
    }

    const gold   = frontMonth('GOLD')
    const goldM  = frontMonth('GOLDM')
    const silver = frontMonth('SILVER')
    const crude  = frontMonth('CRUDEOIL')
    const copper = frontMonth('COPPER')
    const natgas = frontMonth('NATURALGAS')

    if (!gold || !silver || !crude || !copper || !natgas) return false

    const tokenMap = {
      _note: 'Auto-updated by morning auth. Do not edit manually.',
      gold:     { token: gold.token,               symbol: gold.symbol,    expiry: gold.expiry    },
      goldMini: { token: goldM?.token ?? gold.token, symbol: goldM?.symbol ?? gold.symbol, expiry: goldM?.expiry ?? gold.expiry },
      silver:   { token: silver.token,             symbol: silver.symbol,  expiry: silver.expiry  },
      crude:    { token: crude.token,               symbol: crude.symbol,   expiry: crude.expiry   },
      copper:   { token: copper.token,              symbol: copper.symbol,  expiry: copper.expiry  },
      natgas:   { token: natgas.token,              symbol: natgas.symbol,  expiry: natgas.expiry  },
      updatedAt: new Date().toISOString(),
    }

    const cacheDir = path.join(__dirname, '../data')
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(
      path.join(cacheDir, 'kite-instruments.json'),
      JSON.stringify(tokenMap, null, 2),
      'utf8'
    )

    console.log(`\n   Gold:   ${gold.symbol}  (${gold.token})`)
    console.log(`   Silver: ${silver.symbol} (${silver.token})`)
    console.log(`   Crude:  ${crude.symbol}  (${crude.token})`)
    console.log(`   Copper: ${copper.symbol} (${copper.token})`)
    console.log(`   NatGas: ${natgas.symbol} (${natgas.token})`)

    return true
  } catch (err) {
    console.error('Instrument discovery failed:', err)
    return false
  }
}

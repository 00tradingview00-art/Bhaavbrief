#!/usr/bin/env node
/**
 * scripts/kite-morning-auth.js
 *
 * Run once every morning. Smart — if today's token is still valid it skips
 * the browser login entirely and just syncs GitHub, Vercel, and instruments.
 *
 * Usage:
 *   node scripts/kite-morning-auth.js          ← smart (reuses today's token)
 *   node scripts/kite-morning-auth.js --force  ← always open browser login
 *
 * Required in .env.local:
 *   KITE_API_KEY, KITE_API_SECRET
 *   GITHUB_REPO (default: 00tradingview00-art/Bhaavbrief)
 *   VERCEL_TOKEN, VERCEL_PROJECT_ID
 */

import { exec, execFileSync } from 'child_process'
import http                   from 'http'
import crypto                 from 'crypto'
import { URL }                from 'url'
import fs                     from 'fs'
import path                   from 'path'
import { fileURLToPath }      from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.join(__dirname, '..')
const SESSION_FILE = path.join(__dirname, '.kite-session.json')   // gitignored
const FORCE      = process.argv.includes('--force')

// ── Load .env.local ───────────────────────────────────────────────────────────
const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const API_KEY        = process.env.KITE_API_KEY
const API_SECRET     = process.env.KITE_API_SECRET
const GITHUB_REPO    = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'
const VERCEL_TOKEN   = process.env.VERCEL_TOKEN
const VERCEL_PROJECT = process.env.VERCEL_PROJECT_ID

if (!API_KEY || !API_SECRET) {
  console.error('❌  KITE_API_KEY and KITE_API_SECRET must be set in .env.local')
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function loadSession() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) }
  catch { return null }
}

function saveSession(token, userId) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify({
    date: todayIST(), token, userId, savedAt: new Date().toISOString(),
  }, null, 2), 'utf8')
}

/** Write KITE_ACCESS_TOKEN back into .env.local so local dev uses it */
function patchEnvLocal(token) {
  try {
    let content = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : ''
    if (/^KITE_ACCESS_TOKEN=/m.test(content)) {
      content = content.replace(/^KITE_ACCESS_TOKEN=.*/m, `KITE_ACCESS_TOKEN=${token}`)
    } else {
      content = content.trimEnd() + `\nKITE_ACCESS_TOKEN=${token}\n`
    }
    fs.writeFileSync(envFile, content, 'utf8')
  } catch {}
}

async function validateToken(token) {
  try {
    const res = await fetch('https://api.kite.trade/user/profile', {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${token}` },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return false
    const j = await res.json()
    return j.status === 'success'
  } catch { return false }
}

// ── Post-auth tasks (run whether token is new or reused) ──────────────────────

async function syncAll(token) {
  process.stdout.write('📦  GitHub Secret...')
  const ghOk = await updateGitHubSecret(token)
  console.log(ghOk ? ' ✅' : ' ⚠️   gh CLI failed — set manually')

  process.stdout.write('🔺  Vercel env......')
  const vOk = await updateVercelEnv(token)
  console.log(vOk ? ' ✅' : ' ⚠️   VERCEL_TOKEN not set')

  process.stdout.write('🔍  MCX instruments.')
  const iOk = await discoverInstruments(token)
  console.log(iOk ? ' ✅' : ' ⚠️   instrument discovery failed')

  process.stdout.write('📝  .env.local......')
  patchEnvLocal(token)
  console.log(' ✅')

  return ghOk && iOk
}

async function updateGitHubSecret(token) {
  try {
    execFileSync('gh', ['secret', 'set', 'KITE_ACCESS_TOKEN', '--repo', GITHUB_REPO, '--body', token], { stdio: 'pipe' })
    return true
  } catch (err) {
    console.error('\n   gh error:', err.stderr?.toString().trim() ?? err.message)
    return false
  }
}

async function updateVercelEnv(token) {
  try {
    execFileSync('vercel', ['env', 'add', 'KITE_ACCESS_TOKEN', 'production', '--force'],
      { input: token, stdio: ['pipe', 'pipe', 'pipe'] })
    return true
  } catch (err) {
    console.error('\n   vercel CLI error:', err.stderr?.toString().trim() ?? err.message)
    return false
  }
}

async function discoverInstruments(accessToken) {
  try {
    const res = await fetch('https://api.kite.trade/instruments/MCX', {
      headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${accessToken}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { console.error(`\n   Kite ${res.status}`); return false }

    const csv    = await res.text()
    const lines  = csv.split('\n').filter(Boolean)
    const header = lines[0].split(',')
    const idx    = col => header.indexOf(col)
    const today  = new Date(); today.setHours(0, 0, 0, 0)

    const instruments = lines.slice(1).map(line => {
      const cols = line.split(',')
      return {
        token:  parseInt(cols[idx('instrument_token')] ?? '0'),
        symbol: (cols[idx('tradingsymbol')]    ?? '').replace(/^"|"$/g, ''),
        name:   (cols[idx('name')]             ?? '').replace(/^"|"$/g, ''),
        expiry: (cols[idx('expiry')]           ?? '').replace(/^"|"$/g, ''),
        type:   (cols[idx('instrument_type')]  ?? '').replace(/^"|"$/g, ''),
      }
    }).filter(i => i.token > 0 && i.type === 'FUT' && i.expiry)

    const frontMonth = name => instruments
      .filter(i => i.name.toUpperCase() === name.toUpperCase() && new Date(i.expiry) >= today)
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry))[0] ?? null

    const gold   = frontMonth('GOLD')
    const goldM  = frontMonth('GOLDM')
    const silver = frontMonth('SILVER')
    const crude  = frontMonth('CRUDEOIL')
    const copper = frontMonth('COPPER')
    const natgas = frontMonth('NATURALGAS')

    if (!gold || !silver || !crude || !copper || !natgas) return false

    const map = {
      _note:    'Auto-updated by morning auth. Do not edit manually.',
      gold:     { token: gold.token,                      symbol: gold.symbol,    expiry: gold.expiry    },
      goldMini: { token: goldM?.token ?? gold.token,      symbol: goldM?.symbol ?? gold.symbol, expiry: goldM?.expiry ?? gold.expiry },
      silver:   { token: silver.token,                    symbol: silver.symbol,  expiry: silver.expiry  },
      crude:    { token: crude.token,                     symbol: crude.symbol,   expiry: crude.expiry   },
      copper:   { token: copper.token,                    symbol: copper.symbol,  expiry: copper.expiry  },
      natgas:   { token: natgas.token,                    symbol: natgas.symbol,  expiry: natgas.expiry  },
      updatedAt: new Date().toISOString(),
    }

    const dataDir = path.join(ROOT, 'data')
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(path.join(dataDir, 'kite-instruments.json'), JSON.stringify(map, null, 2), 'utf8')

    console.log(`\n     Gold   ${gold.symbol} (${gold.token})`)
    console.log(`     Silver ${silver.symbol} (${silver.token})`)
    console.log(`     Crude  ${crude.symbol} (${crude.token})`)
    console.log(`     Copper ${copper.symbol} (${copper.token})`)
    console.log(`     NatGas ${natgas.symbol} (${natgas.token})`)
    return true
  } catch (err) {
    console.error('Instrument discovery failed:', err.message)
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  BhaavBrief — Kite Morning Auth')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

// 1. Check if today's session is already valid
if (!FORCE) {
  const session = loadSession()
  if (session?.date === todayIST() && session?.token) {
    process.stdout.write(`⚡  Today's session found (${session.userId}) — validating...`)
    const valid = await validateToken(session.token)
    if (valid) {
      console.log(' ✅  Token still valid — skipping browser login\n')
      await syncAll(session.token)
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('  ✅  BhaavBrief synced — no login needed')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      process.exit(0)
    }
    console.log(' token expired — opening browser login\n')
  }
}

// 2. Need browser login
const PORT      = 8765
const LOGIN_URL = `https://kite.trade/connect/login?api_key=${API_KEY}&v=3`

console.log('Opening Kite login in your browser...')
console.log(`(If it didn't open: ${LOGIN_URL})\n`)

const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
exec(`${opener} "${LOGIN_URL}"`)

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
    if (!url.pathname.includes('callback')) { res.end('Waiting for Kite login...'); return }

    const requestToken = url.searchParams.get('request_token')
    const status       = url.searchParams.get('status')

    if (status !== 'success' || !requestToken) {
      res.writeHead(400); res.end('Login cancelled.'); server.close(); process.exit(1)
    }

    console.log('✅  Login successful — exchanging token...')

    const checksum = crypto.createHash('sha256')
      .update(API_KEY + requestToken + API_SECRET).digest('hex')

    const tokenRes  = await fetch('https://api.kite.trade/session/token', {
      method: 'POST',
      headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ api_key: API_KEY, request_token: requestToken, checksum }),
    })
    const tokenData = await tokenRes.json()

    if (tokenData.status !== 'success') {
      console.error('❌  Token exchange failed:', tokenData.message)
      res.writeHead(400); res.end('Token exchange failed: ' + tokenData.message)
      server.close(); process.exit(1)
    }

    const accessToken = tokenData.data.access_token
    const userId      = tokenData.data.user_id

    console.log(`✅  Token: ${accessToken.slice(0, 12)}... | User: ${userId}\n`)

    // Save session so next run skips the browser
    saveSession(accessToken, userId)

    await syncAll(accessToken)

    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(`<!DOCTYPE html><html><head><title>Done — BhaavBrief</title>
<style>body{font-family:system-ui;max-width:440px;margin:80px auto;text-align:center;color:#18180F}
h2{font-size:22px;margin:12px 0 8px}p{color:#666;font-size:14px;margin:4px 0}</style></head>
<body><div style="font-size:48px">✅</div>
<h2>BhaavBrief is live</h2>
<p>Kite token synced to GitHub, Vercel &amp; local.</p>
<p style="font-size:12px;margin-top:16px;color:#aaa">Valid until midnight IST. You can close this tab.</p>
</body></html>`)

    server.close()
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  ✅  BhaavBrief is live on Kite data')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(0)

  } catch (err) {
    console.error('\n❌  Error:', err)
    res.writeHead(500); res.end('Error: ' + String(err))
    server.close(); process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}/kite/callback`)
  console.log('Complete the Kite login in your browser...\n')
})

setTimeout(() => {
  console.error('\n❌  Timeout — no login in 5 minutes')
  server.close(); process.exit(1)
}, 5 * 60 * 1000)

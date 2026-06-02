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
 *   VERCEL_DEPLOY_HOOK  ← Vercel dashboard → project → Settings → Git → Deploy Hooks
 *                          Create a hook named "kite-auth", paste the URL here.
 *                          This triggers an immediate Vercel redeploy so prices go live
 *                          without waiting for a git push. Strongly recommended.
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

const API_KEY         = process.env.KITE_API_KEY
const API_SECRET      = process.env.KITE_API_SECRET
const GITHUB_REPO     = process.env.GITHUB_REPO ?? '00tradingview00-art/Bhaavbrief'
const VERCEL_TOKEN    = process.env.VERCEL_TOKEN
const VERCEL_PROJECT  = process.env.VERCEL_PROJECT_ID
const VERCEL_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK  // optional but strongly recommended

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

  process.stdout.write('🚦  Vercel deploy...')
  const deployOk = await triggerVercelRedeploy()
  console.log(deployOk ? ' ✅  (prices will be live in ~2 min)' : ' ⚠️   set VERCEL_DEPLOY_HOOK in .env.local')

  process.stdout.write('🔍  MCX instruments.')
  const iOk = await discoverInstruments(token)
  console.log(iOk ? ' ✅' : ' ⚠️   instrument discovery failed')

  process.stdout.write('📝  .env.local......')
  patchEnvLocal(token)
  console.log(' ✅')

  // Always trigger a Vercel redeploy so the new token takes effect.
  // instruments.json push only happens when contracts change (monthly),
  // so we write a timestamp file to guarantee a deploy every morning.
  process.stdout.write('🚀  Trigger deploy...')
  try {
    const stamp = { lastAuth: todayIST(), updated: new Date().toISOString() }
    fs.writeFileSync(path.join(ROOT, 'data/last-kite-auth.json'), JSON.stringify(stamp, null, 2) + '\n', 'utf8')
    execFileSync('git', ['add', 'data/last-kite-auth.json'], { cwd: ROOT, stdio: 'pipe' })
    execFileSync('git', ['commit', '-m', `chore: kite token refresh ${todayIST()}`], { cwd: ROOT, stdio: 'pipe' })
    execFileSync('git', ['push'], { cwd: ROOT, stdio: 'pipe' })
    console.log(' ✅')
  } catch {
    console.log(' ⚠️   git push failed — redeploy manually')
  }

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
  if (!VERCEL_TOKEN || !VERCEL_PROJECT) {
    console.error('\n   VERCEL_TOKEN or VERCEL_PROJECT_ID not set in .env.local')
    return false
  }
  try {
    const headers = {
      Authorization: `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    }

    // Find existing env var ID for KITE_ACCESS_TOKEN
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${VERCEL_PROJECT}/env?decrypt=false`,
      { headers, signal: AbortSignal.timeout(10000) }
    )
    if (!listRes.ok) throw new Error(`List env failed: ${listRes.status}`)
    const { envs } = await listRes.json()
    const existing = envs?.find(e => e.key === 'KITE_ACCESS_TOKEN' && e.target?.includes('production'))

    if (existing) {
      // PATCH — preserve existing type (sensitive vars reject type changes)
      const patchRes = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT}/env/${existing.id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ value: token, target: ['production'], type: existing.type }),
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!patchRes.ok) throw new Error(`Patch env failed: ${patchRes.status} ${await patchRes.text()}`)
    } else {
      // POST new env var
      const postRes = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ key: 'KITE_ACCESS_TOKEN', value: token, target: ['production'], type: 'sensitive' }),
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!postRes.ok) throw new Error(`Post env failed: ${postRes.status} ${await postRes.text()}`)
    }
    return true
  } catch (err) {
    console.error('\n   Vercel API error:', err.message)
    return false
  }
}

/** Trigger Vercel redeploy so the new KITE_ACCESS_TOKEN env var takes effect immediately.
 *  Uses a Deploy Hook URL if configured, otherwise falls back to the Vercel Deployments API. */
async function triggerVercelRedeploy() {
  // Primary: Deploy Hook (zero-config, just POST to the URL)
  if (VERCEL_HOOK_URL) {
    try {
      const r = await fetch(VERCEL_HOOK_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(10000),
      })
      if (r.ok) return true
      console.error(`\n   Deploy hook responded ${r.status}`)
    } catch (err) {
      console.error('\n   Deploy hook failed:', err.message)
    }
  }

  // Fallback: Vercel Deployments API — find latest production deployment and redeploy it
  if (!VERCEL_TOKEN || !VERCEL_PROJECT) return false
  try {
    const headers = { Authorization: `Bearer ${VERCEL_TOKEN}` }
    const listRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT}&target=production&limit=1&state=READY`,
      { headers, signal: AbortSignal.timeout(10000) }
    )
    if (!listRes.ok) return false
    const { deployments } = await listRes.json()
    const latestId = deployments?.[0]?.uid
    if (!latestId) return false

    const redeployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId: latestId, target: 'production' }),
      signal: AbortSignal.timeout(15000),
    })
    if (!redeployRes.ok) {
      console.error('\n   Vercel redeploy API:', redeployRes.status, await redeployRes.text())
      return false
    }
    return true
  } catch (err) {
    console.error('\n   Vercel redeploy failed:', err.message)
    return false
  }
}

async function discoverInstruments(accessToken) {
  try {
    const [mcxRes, cdsRes] = await Promise.all([
      fetch('https://api.kite.trade/instruments/MCX', {
        headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${accessToken}` },
        signal: AbortSignal.timeout(15000),
      }),
      fetch('https://api.kite.trade/instruments/CDS', {
        headers: { 'X-Kite-Version': '3', Authorization: `token ${API_KEY}:${accessToken}` },
        signal: AbortSignal.timeout(15000),
      }),
    ])
    if (!mcxRes.ok) { console.error(`\n   Kite MCX ${mcxRes.status}`); return false }

    const parseCSV = async (res) => {
      const csv   = await res.text()
      const lines = csv.split('\n').filter(Boolean)
      const header = lines[0].split(',')
      const idx    = col => header.indexOf(col)
      const today  = new Date(); today.setHours(0, 0, 0, 0)
      return lines.slice(1).map(line => {
        const cols = line.split(',')
        return {
          token:  parseInt(cols[idx('instrument_token')] ?? '0'),
          symbol: (cols[idx('tradingsymbol')]    ?? '').replace(/^"|"$/g, ''),
          name:   (cols[idx('name')]             ?? '').replace(/^"|"$/g, ''),
          expiry: (cols[idx('expiry')]           ?? '').replace(/^"|"$/g, ''),
          type:   (cols[idx('instrument_type')]  ?? '').replace(/^"|"$/g, ''),
        }
      }).filter(i => i.token > 0 && i.type === 'FUT' && i.expiry)
    }

    const today = new Date(); today.setHours(0, 0, 0, 0)
    const instruments    = await parseCSV(mcxRes)
    const cdsInstruments = cdsRes.ok ? await parseCSV(cdsRes) : []

    const frontMonth = (list, name) => list
      .filter(i => i.name.toUpperCase() === name.toUpperCase() && new Date(i.expiry) >= today)
      // prefer monthly contracts (symbol ends in MONFUT) over weekly
      .sort((a, b) => {
        const aMonthly = /[A-Z]{3}FUT$/.test(a.symbol) ? 0 : 1
        const bMonthly = /[A-Z]{3}FUT$/.test(b.symbol) ? 0 : 1
        if (aMonthly !== bMonthly) return aMonthly - bMonthly
        return new Date(a.expiry) - new Date(b.expiry)
      })[0] ?? null

    const gold   = frontMonth(instruments, 'GOLD')
    const goldM  = frontMonth(instruments, 'GOLDM')
    const silver = frontMonth(instruments, 'SILVER')
    const crude  = frontMonth(instruments, 'CRUDEOIL')
    const copper = frontMonth(instruments, 'COPPER')
    const natgas = frontMonth(instruments, 'NATURALGAS')

    if (!gold || !silver || !crude || !copper || !natgas) return false

    const usdinr = frontMonth(cdsInstruments, 'USDINR')
    const eurinr = frontMonth(cdsInstruments, 'EURINR')
    const gbpinr = frontMonth(cdsInstruments, 'GBPINR')
    const jpyinr = frontMonth(cdsInstruments, 'JPYINR')

    const map = {
      _note:    'Auto-updated by morning auth. Do not edit manually.',
      gold:     { token: gold.token,                      symbol: gold.symbol,    expiry: gold.expiry    },
      goldMini: { token: goldM?.token ?? gold.token,      symbol: goldM?.symbol ?? gold.symbol, expiry: goldM?.expiry ?? gold.expiry },
      silver:   { token: silver.token,                    symbol: silver.symbol,  expiry: silver.expiry  },
      crude:    { token: crude.token,                     symbol: crude.symbol,   expiry: crude.expiry   },
      copper:   { token: copper.token,                    symbol: copper.symbol,  expiry: copper.expiry  },
      natgas:   { token: natgas.token,                    symbol: natgas.symbol,  expiry: natgas.expiry  },
      ...(usdinr && eurinr && gbpinr && jpyinr ? {
        currencies: {
          usdinr: { token: usdinr.token, symbol: usdinr.symbol, expiry: usdinr.expiry },
          eurinr: { token: eurinr.token, symbol: eurinr.symbol, expiry: eurinr.expiry },
          gbpinr: { token: gbpinr.token, symbol: gbpinr.symbol, expiry: gbpinr.expiry },
          jpyinr: { token: jpyinr.token, symbol: jpyinr.symbol, expiry: jpyinr.expiry },
        }
      } : {}),
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
    if (usdinr) console.log(`     USD/INR ${usdinr.symbol} (${usdinr.token})`)
    if (eurinr) console.log(`     EUR/INR ${eurinr.symbol} (${eurinr.token})`)
    if (gbpinr) console.log(`     GBP/INR ${gbpinr.symbol} (${gbpinr.token})`)
    if (jpyinr) console.log(`     JPY/INR ${jpyinr.symbol} (${jpyinr.token})`)

    // Auto-commit so Vercel picks up the latest instrument tokens
    try {
      execFileSync('git', ['add', 'data/kite-instruments.json'], { cwd: ROOT, stdio: 'pipe' })
      execFileSync('git', ['commit', '-m', `chore: update MCX instrument tokens ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`], { cwd: ROOT, stdio: 'pipe' })
      execFileSync('git', ['push'], { cwd: ROOT, stdio: 'pipe' })
    } catch { /* already up to date or no changes — ignore */ }

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

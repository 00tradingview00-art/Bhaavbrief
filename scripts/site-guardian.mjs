/**
 * site-guardian.mjs — daily Claude-powered full-site health audit
 *
 * Phase 1: Health checks (no Claude) — JSON integrity, snapshot freshness,
 *          brief existence, monitor heartbeat
 * Phase 2: Single batched Claude Haiku call — learn/invest content audit +
 *          regulatory impact scan
 * Phase 3: Write guardian-report.json + email if RED
 * Phase 4: Sunday deep refresh (DEEP_AUDIT=true) — Claude Sonnet rewrites
 *          narrative fields in market-structure.json
 *
 * Exit 0 always — CI never fails because the guardian encountered issues.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.join(__dirname, '..')

const DATA_DIR       = path.join(ROOT, 'data')
const BRIEFS_DIR     = path.join(ROOT, 'content/briefs')
const SNAPSHOT_FILE  = path.join(DATA_DIR, 'market-snapshot.json')
const STRUCTURE_FILE = path.join(DATA_DIR, 'market-structure.json')
const SPECS_FILE     = path.join(DATA_DIR, 'contract-specs.json')
const REPORT_FILE    = path.join(DATA_DIR, 'guardian-report.json')
const LEARN_PAGE     = path.join(ROOT, 'app/learn/page.tsx')
const INVEST_PAGE    = path.join(ROOT, 'app/invest/page.tsx')
const CIRCULARS_FILE = path.join(ROOT, 'scripts/seen-circulars.json')

const SEEN_FILES = [
  'seen-agri', 'seen-articles', 'seen-circulars',
  'seen-geopolitical', 'seen-india-policy', 'seen-macro', 'seen-news',
].map(f => path.join(ROOT, 'scripts', `${f}.json`))

const DEEP_AUDIT = process.env.DEEP_AUDIT === 'true'

// ── Helpers ───────────────────────────────────────────────────────────────

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function safeReadText(file, maxChars = 5000) {
  try { return fs.readFileSync(file, 'utf8').slice(0, maxChars) } catch { return '(file not found)' }
}

function istDateStr() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    .toISOString().slice(0, 10)
}

function isWeekdayIST() {
  const day = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay()
  return day >= 1 && day <= 5
}

// ── Phase 1: Health Checks ────────────────────────────────────────────────

function runHealthChecks() {
  const issues = []

  // 1a. All data/*.json files parseable
  const jsonFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'))
  for (const file of jsonFiles) {
    try {
      JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'))
    } catch (e) {
      issues.push({ level: 'red', component: file, message: `JSON parse error: ${e.message.slice(0, 100)}` })
    }
  }

  // 1b. Snapshot freshness on trading days
  try {
    const snap    = readJSON(SNAPSHOT_FILE)
    const ageMins = (Date.now() - new Date(snap.generatedAt).getTime()) / 60000
    if (isWeekdayIST() && ageMins > 120) {
      issues.push({ level: 'yellow', component: 'market-snapshot.json', message: `Stale: ${Math.round(ageMins)} min old` })
    }
  } catch {
    issues.push({ level: 'red', component: 'market-snapshot.json', message: 'Missing or unreadable' })
  }

  // 1c. Brief existence — today or yesterday IST
  const todayIST     = istDateStr()
  const yesterdayIST = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  let hasBrief = false
  if (fs.existsSync(BRIEFS_DIR)) {
    for (const file of fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith('.mdx'))) {
      const content = fs.readFileSync(path.join(BRIEFS_DIR, file), 'utf8')
      const dm = content.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})/m)
      if (dm && (dm[1] === todayIST || dm[1] === yesterdayIST)) { hasBrief = true; break }
    }
  }
  if (!hasBrief && isWeekdayIST()) {
    issues.push({ level: 'yellow', component: 'content/briefs', message: `No brief dated ${todayIST} or ${yesterdayIST}` })
  }

  // 1d. Monitor heartbeat — seen-*.json touched in last 25h (trading days only)
  if (isWeekdayIST()) {
    const cutoff = Date.now() - 25 * 3600_000
    for (const file of SEEN_FILES) {
      if (!fs.existsSync(file)) continue
      const mtime = fs.statSync(file).mtimeMs
      if (mtime < cutoff) {
        issues.push({ level: 'yellow', component: path.basename(file), message: 'Not updated in >25h — monitor may be stuck' })
      }
    }
  }

  const status = issues.some(i => i.level === 'red')    ? 'red'
    : issues.some(i => i.level === 'yellow') ? 'yellow'
    : 'green'

  return { status, issues }
}

// ── Phase 2: Claude Haiku Audit ───────────────────────────────────────────

async function runAudit(client) {
  const specs      = safeReadText(SPECS_FILE, 3000)
  const learnText  = safeReadText(LEARN_PAGE, 5000)
  const investText = safeReadText(INVEST_PAGE, 5000)

  let recentCirculars = []
  try {
    const all    = readJSON(CIRCULARS_FILE)
    const cutoff = new Date(Date.now() - 7 * 86400_000).toISOString()
    recentCirculars = (Array.isArray(all) ? all : [])
      .filter(c => (c.date ?? c.seenAt ?? '') > cutoff)
      .slice(0, 10)
  } catch {}

  const today = new Date().toISOString().slice(0, 10)

  const prompt =
    `You are auditing BhaavBrief, an Indian MCX commodity intelligence website. Today is ${today}. The last Union Budget was February 2026.\n\n` +
    `Your job: find factual errors in the site's static content compared to ground-truth data.\n\n` +
    `GROUND TRUTH — contract-specs.json (authoritative, refreshed daily from Kite/MCX):\n${specs}\n\n` +
    `LEARN PAGE SOURCE (check factual accuracy — lot sizes, trading hours, tax rates, margin rules):\n${learnText}\n\n` +
    `INVEST PAGE SOURCE (check for outdated ETF names, LTCG tax rates, fund categories):\n${investText}\n\n` +
    `RECENT MCX/SEBI CIRCULARS (check if any require Learn or About page updates):\n${JSON.stringify(recentCirculars)}\n\n` +
    `Return ONLY valid JSON with this exact shape (empty arrays if nothing is wrong):\n` +
    `{"learnIssues":[{"field":"","currentValue":"","correctValue":"","location":""}],"investIssues":[{"item":"","currentText":"","issue":""}],"circularImpact":[{"circular":"","affectedPage":"","change":""}]}\n\n` +
    `Be conservative — only flag clear factual errors (wrong numbers, known regulatory changes). Ignore style or opinion.`

  const res = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw = res.content[0]?.text?.replace(/```json|```/g, '').trim() ?? '{}'
  return JSON.parse(raw)
}

// ── Phase 4: Sunday Deep Refresh ──────────────────────────────────────────

async function runDeepRefresh(client) {
  console.log('Sunday deep refresh: updating market-structure.json narrative fields...')

  let structure, snapshot
  try { structure = readJSON(STRUCTURE_FILE) } catch { console.error('Cannot read market-structure.json'); return }
  try { snapshot  = readJSON(SNAPSHOT_FILE)  } catch { snapshot = null }

  const currentPrices = {}
  if (snapshot?.instruments) {
    for (const [k, v] of Object.entries(snapshot.instruments)) {
      if (v?.price) currentPrices[k] = v.price
    }
  }

  let recentBriefTitles = []
  try {
    const files = fs.readdirSync(BRIEFS_DIR).filter(f => f.endsWith('.mdx')).slice(-5)
    recentBriefTitles = files.map(f => {
      const content = fs.readFileSync(path.join(BRIEFS_DIR, f), 'utf8')
      return content.match(/^title:\s*"?([^"\n]+)/m)?.[1] ?? f
    })
  } catch {}

  const prompt =
    `You are refreshing BhaavBrief's commodity knowledge base. Today is ${new Date().toISOString().slice(0, 10)}.\n\n` +
    `Current MCX prices: ${JSON.stringify(currentPrices)}\n` +
    `Recent brief themes: ${recentBriefTitles.join(' | ')}\n\n` +
    `Review the JSON below and update ONLY these fields if they need refreshing:\n` +
    `- "demandDrivers" — if a major structural shift has occurred (new policy, import duty change, new supply)\n` +
    `- "macroLinks" — ensure the list reflects current relevant macro indicators\n` +
    `- "taxNote" — ensure it reflects Budget 2026 (if any commodity-specific changes)\n` +
    `- "keyRisk" — update to reflect current market dynamics\n\n` +
    `DO NOT change: name, mcxSymbol, unit, lotSize, tickSize, importParity, supplyControl, keyBodies, contractValue, typicalMargin, expiryNote.\n` +
    `Return the COMPLETE updated JSON (same structure). No markdown fences, no explanation.\n\n` +
    `CURRENT market-structure.json:\n${JSON.stringify(structure, null, 2).slice(0, 14000)}`

  const res = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw = res.content[0]?.text?.replace(/```json|```/g, '').trim() ?? ''
  try {
    const updated  = JSON.parse(raw)
    const origKeys = Object.keys(structure)
    const newKeys  = Object.keys(updated)
    if (origKeys.every(k => newKeys.includes(k))) {
      fs.writeFileSync(STRUCTURE_FILE, JSON.stringify(updated, null, 2), 'utf8')
      console.log('Deep refresh complete — market-structure.json updated')
    } else {
      console.error('Deep refresh: key mismatch — not writing to avoid data loss')
    }
  } catch (e) {
    console.error('Deep refresh: JSON parse failed —', e.message)
  }
}

// ── Phase 3: Alert ────────────────────────────────────────────────────────

async function sendAlert(report) {
  const { BREVO_API_KEY, SENDER_EMAIL } = process.env
  if (!BREVO_API_KEY || !SENDER_EMAIL) { console.log('No email credentials — skipping alert'); return }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  })

  const redItems    = report.health.issues.filter(i => i.level === 'red')
  const yellowItems = report.health.issues.filter(i => i.level === 'yellow')
  const auditItems  = [
    ...(report.audit?.learnIssues   ?? []).map(i => `Learn — ${i.field}: ${i.currentValue} → ${i.correctValue}`),
    ...(report.audit?.investIssues  ?? []).map(i => `Invest — ${i.item}: ${i.issue}`),
    ...(report.audit?.circularImpact ?? []).map(i => `Circular → ${i.affectedPage}: ${i.change}`),
  ]

  let html = `<h2>BhaavBrief Site Guardian — ${dateStr}</h2><p>Status: <strong>${report.overallStatus.toUpperCase()}</strong></p>`
  if (redItems.length)
    html += `<h3>Critical</h3><ul>${redItems.map(i => `<li><b>${i.component}</b>: ${i.message}</li>`).join('')}</ul>`
  if (yellowItems.length)
    html += `<h3>Warnings</h3><ul>${yellowItems.map(i => `<li><b>${i.component}</b>: ${i.message}</li>`).join('')}</ul>`
  if (auditItems.length)
    html += `<h3>Content issues</h3><ul>${auditItems.map(i => `<li>${i}</li>`).join('')}</ul>`
  html += `<p>Review <a href="https://bhaavbrief.in">bhaavbrief.in</a> and check data/guardian-report.json for details.</p>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sender:      { name: 'BhaavBrief Guardian', email: SENDER_EMAIL },
        to:          [{ email: '00tradingview00@gmail.com' }],
        subject:     `Site Guardian ${report.overallStatus.toUpperCase()} — ${dateStr}`,
        htmlContent: html,
      }),
    })
    if (!res.ok) console.error('Email API error:', res.status)
    else         console.log('Alert email sent')
  } catch (e) {
    console.error('Email failed:', e.message)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const today = istDateStr()
  console.log(`Site Guardian — ${today} (DEEP_AUDIT=${DEEP_AUDIT})`)

  const client = process.env.ANTHROPIC_API_KEY
    ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    : null

  // Phase 1 — health
  const health = runHealthChecks()
  console.log(`Health: ${health.status.toUpperCase()} (${health.issues.length} issue(s))`)
  for (const i of health.issues) console.log(`  [${i.level.toUpperCase()}] ${i.component}: ${i.message}`)

  // Phase 2 — audit
  let audit = { learnIssues: [], investIssues: [], circularImpact: [] }
  if (client) {
    try {
      audit = await runAudit(client)
      const n = audit.learnIssues.length + audit.investIssues.length + audit.circularImpact.length
      console.log(`Audit: ${n} issue(s) found`)
      if (audit.learnIssues.length)   audit.learnIssues.forEach(i   => console.log(`  Learn: ${i.field} — ${i.currentValue} → ${i.correctValue}`))
      if (audit.investIssues.length)  audit.investIssues.forEach(i  => console.log(`  Invest: ${i.item} — ${i.issue}`))
      if (audit.circularImpact.length) audit.circularImpact.forEach(i => console.log(`  Circular: ${i.affectedPage} — ${i.change}`))
    } catch (e) {
      console.error('Audit Claude call failed:', e.message)
    }
  } else {
    console.log('No ANTHROPIC_API_KEY — skipping content audit')
  }

  // Phase 3 — report
  const hasAuditIssues = audit.learnIssues.length + audit.investIssues.length + audit.circularImpact.length > 0
  const overallStatus  = health.status === 'red' ? 'red'
    : (health.status === 'yellow' || hasAuditIssues) ? 'yellow'
    : 'green'

  const report = { generatedAt: new Date().toISOString(), overallStatus, health, audit }
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8')
  console.log(`Report: ${overallStatus.toUpperCase()} → data/guardian-report.json`)

  if (overallStatus === 'red') await sendAlert(report)

  // Phase 4 — Sunday deep refresh
  if (DEEP_AUDIT && client) await runDeepRefresh(client)
}

main().catch(e => { console.error('Guardian error:', e.message); process.exit(0) })

#!/usr/bin/env node
/**
 * scripts/send-edge-scoreboard.mjs — FIX-12 (D-16) weekly "Edge Scoreboard"
 * email: retention + track-record marketing in one, per the master doc.
 * Summarizes the last 7 days of data/edge-ledger.json resolutions.
 *
 * Mirrors scripts/send-newsletter.js's Brevo campaign pattern (idempotent
 * campaign-by-name lookup before create+send, same env vars) rather than
 * inventing a second way to talk to Brevo.
 *
 * Env vars: BREVO_API_KEY (required), BREVO_LIST_ID, SENDER_EMAIL
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envFile = path.join(__dirname, '../.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const BREVO_API  = 'https://api.brevo.com/v3'
const API_KEY    = process.env.BREVO_API_KEY
const LIST_ID    = Number(process.env.BREVO_LIST_ID ?? 2)
const FROM_EMAIL = process.env.SENDER_EMAIL ?? 'brief@bhaavbrief.in'
const LEDGER_PATH = path.join(__dirname, '../data/edge-ledger.json')

if (!API_KEY) { console.error('BREVO_API_KEY not set'); process.exit(1) }

function loadLedger() {
  try { return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8')) }
  catch { return [] }
}

function weekWindow() {
  const now = new Date()
  const from = new Date(now.getTime() - 7 * 86400000)
  return { from, to: now, weekLabel: from.toISOString().slice(0, 10) }
}

function buildHtml(entries, weekLabel) {
  const confirmed = entries.filter(e => e.verdict === 'confirmed').length
  const rejected  = entries.filter(e => e.verdict === 'rejected').length
  const resolved  = confirmed + rejected
  const hitRate   = resolved > 0 ? Math.round((confirmed / resolved) * 100) : null

  const rows = entries.map(e => {
    const color = e.verdict === 'confirmed' ? '#166534' : e.verdict === 'rejected' ? '#991B1B' : '#78716C'
    const bg    = e.verdict === 'confirmed' ? '#DCFCE7' : e.verdict === 'rejected' ? '#FEE2E2' : '#F5F5F4'
    return `<tr>
      <td style="padding:8px 0;font-size:13px;color:#18180F;font-family:Georgia,serif">Edition #${e.forEdition} — ${e.edgeMetric.replace(/_/g,' ')} ${e.edgeCondition} ${e.edgeLevel.toLocaleString('en-IN')}</td>
      <td style="padding:8px 0;text-align:right"><span style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;color:${color};background:${bg};padding:3px 8px;border-radius:3px">${e.verdict}</span></td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html><html><body style="margin:0;background:#FAFAF6;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-family:monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#C8720A;margin-bottom:8px">Weekly Edge Scoreboard</div>
  <h1 style="font-size:22px;font-weight:800;color:#18180F;margin:0 0 16px">Yesterday's Edge, the week in review</h1>
  <p style="font-size:14px;color:#48483A;line-height:1.7">Every &quot;Edge of the Day&quot; call from the past 7 days (since ${weekLabel}), resolved against real closing prices — wins and misses both, nothing hidden.</p>
  <div style="display:flex;gap:8px;margin:20px 0;background:#DDDDD0">
    <div style="flex:1;background:#F3F2EC;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#18180F">${resolved}</div>
      <div style="font-family:monospace;font-size:9px;color:#8A8A7A;text-transform:uppercase">Resolved</div>
    </div>
    <div style="flex:1;background:#F3F2EC;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#18180F">${hitRate != null ? hitRate + '%' : '—'}</div>
      <div style="font-family:monospace;font-size:9px;color:#8A8A7A;text-transform:uppercase">Hit rate</div>
    </div>
  </div>
  <table style="width:100%;border-collapse:collapse">${rows || '<tr><td style="padding:12px 0;color:#8A8A7A;font-size:13px">No calls resolved this week.</td></tr>'}</table>
  <a href="https://bhaavbrief.in/track-record" style="display:inline-block;margin-top:24px;background:#18180F;color:#FAFAF6;font-family:monospace;font-size:11px;letter-spacing:0.05em;padding:11px 20px;text-decoration:none">See the full track record →</a>
  <div style="border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:10px;color:#8A8A7A;font-family:monospace;line-height:1.8">
    © 2026 BhaavBrief · bhaavbrief.in<br>
    For educational and informational purposes only. Not registered with SEBI or any regulatory authority. Nothing here constitutes investment advice.<br>
    <a href="{{ unsubscribeUrl }}" style="color:#8A8A7A">Unsubscribe</a>
  </div>
</div>
</body></html>`
}

async function findExistingCampaign(name) {
  try {
    const res = await fetch(`${BREVO_API}/emailCampaigns?limit=50&sort=desc`, { headers: { 'api-key': API_KEY } })
    if (!res.ok) return null
    const { campaigns } = await res.json()
    return campaigns?.find(c => c.name === name) ?? null
  } catch { return null }
}

async function sendCampaign(name, subject, htmlContent, previewText) {
  const existing = await findExistingCampaign(name)
  if (existing) {
    if (existing.status === 'sent' || existing.status === 'queued') {
      console.log(`Scoreboard already sent/queued this week (ID ${existing.id}) — skipping`)
      return existing.id
    }
    const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${existing.id}/sendNow`, { method: 'POST', headers: { 'api-key': API_KEY } })
    if (!sendRes.ok) throw new Error(`Send failed: ${JSON.stringify(await sendRes.json())}`)
    console.log(`Scoreboard sent — Campaign ID: ${existing.id}`)
    return existing.id
  }

  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name, subject, previewText,
      sender: { name: 'BhaavBrief', email: FROM_EMAIL },
      type: 'classic', htmlContent,
      recipients: { listIds: [LIST_ID] },
    }),
  })
  if (!createRes.ok) throw new Error(`Create campaign failed: ${JSON.stringify(await createRes.json())}`)
  const { id } = await createRes.json()
  console.log(`Scoreboard campaign created: ID ${id}`)

  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${id}/sendNow`, { method: 'POST', headers: { 'api-key': API_KEY } })
  if (!sendRes.ok) throw new Error(`Send failed: ${JSON.stringify(await sendRes.json())}`)
  console.log(`Scoreboard sent — Campaign ID: ${id}`)
  return id
}

async function main() {
  const ledger = loadLedger()
  const { from, weekLabel } = weekWindow()
  const entries = ledger.filter(e => new Date(e.resolvedAt) >= from)

  if (entries.length === 0) {
    console.log('No edge resolutions in the last 7 days — skipping scoreboard send (nothing to report yet).')
    return
  }

  const campaignName = `BhaavBrief Edge Scoreboard — week of ${weekLabel}`
  const html = buildHtml(entries, weekLabel)
  await sendCampaign(campaignName, "This week's Edge Scoreboard — wins, misses, and the track record", html, 'How many calls held up this week?')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })

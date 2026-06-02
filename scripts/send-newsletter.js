#!/usr/bin/env node
/**
 * Reads the newly generated MDX brief and sends it as an email
 * campaign via Brevo to all subscribers.
 *
 * Env vars:
 *   BREVO_API_KEY  — required
 *   BREVO_LIST_ID  — defaults to 2
 *   SENDER_EMAIL   — defaults to brief@bhaavbrief.in
 *   EDITION        — used to locate the file when BRIEF_FILE is not set
 *   BRIEF_FILE     — explicit path override (optional)
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BREVO_API  = 'https://api.brevo.com/v3'
const API_KEY    = process.env.BREVO_API_KEY
const LIST_ID    = Number(process.env.BREVO_LIST_ID ?? 2)
const FROM_EMAIL = process.env.SENDER_EMAIL ?? 'brief@bhaavbrief.in'
const EDITION    = process.env.EDITION
const BRIEF_FILE = process.env.BRIEF_FILE

if (!API_KEY) { console.error('BREVO_API_KEY not set'); process.exit(1) }

function resolveBriefPath() {
  if (BRIEF_FILE) return path.join(process.cwd(), BRIEF_FILE)
  if (EDITION) {
    const padded = String(EDITION).padStart(3, '0')
    return path.join(__dirname, `../content/briefs/edition-${padded}.mdx`)
  }
  console.error('Either BRIEF_FILE or EDITION must be set'); process.exit(1)
}

// ─── Parse MDX frontmatter (simple regex, no extra deps) ─────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { meta: {}, content: raw }

  const meta = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    if (key && rest.length) {
      let val = rest.join(':').trim().replace(/^"(.*)"$/, '$1')
      if (val.startsWith('[')) {
        try { val = JSON.parse(val) } catch {}
      }
      meta[key.trim()] = val
    }
  }
  return { meta, content: match[2].trim() }
}

// ─── Convert MDX to HTML email ────────────────────────────────────────────────

function mdxToHtml(content, title, edition, date) {
  const body = content
    .replace(/^## \[(\w+)\] (.+)$/gm, (_, tag, heading) => {
      const colors = { WATCH: '#996600', BULLISH: '#1E6630', BEARISH: '#991818', NEUTRAL: '#48483A' }
      const bgs    = { WATCH: '#FFF7E0', BULLISH: '#EAF5EE', BEARISH: '#FDF0F0', NEUTRAL: '#F3F2EC' }
      const c = colors[tag] ?? '#48483A'
      const b = bgs[tag]    ?? '#F3F2EC'
      return `<div style="margin:24px 0 8px"><span style="font-size:9px;font-family:monospace;padding:2px 8px;background:${b};color:${c};border:0.5px solid ${c};text-transform:uppercase;letter-spacing:0.08em">${tag}</span><h2 style="font-family:Georgia,serif;font-size:18px;font-weight:700;margin:6px 0 0;border-left:3px solid #C8720A;padding-left:12px">${heading}</h2></div>`
    })
    .replace(/^## (.+)$/gm, '<h2 style="font-family:Georgia,serif;font-size:18px;font-weight:700;margin:24px 0 8px;border-left:3px solid #C8720A;padding-left:12px">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#18180F;font-weight:600">$1</strong>')
    .replace(/^- (.+)$/gm, '<p style="margin:4px 0;color:#48483A;font-size:14px;font-weight:300">— $1</p>')
    .replace(/\n\n/g, '</p><p style="font-size:15px;line-height:1.75;color:#48483A;font-weight:300;margin:0 0 12px">')

  const slug = `edition-${String(edition).padStart(3, '0')}`

  return `<!DOCTYPE html>
<html lang="en-IN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Georgia,serif;background:#FAFAF6;color:#18180F;margin:0;padding:0">
<div style="max-width:620px;margin:0 auto;padding:32px 24px">
  <div style="border-bottom:3px double #C8C8B8;padding-bottom:16px;margin-bottom:24px">
    <div style="font-family:Georgia,serif;font-size:28px;font-weight:800;letter-spacing:-0.02em;margin-bottom:4px">BhaavBrief</div>
    <div style="font-size:10px;color:#8A8A7A;font-family:monospace;letter-spacing:0.08em;text-transform:uppercase">India's Commodity Intelligence · Edition ${edition} · ${date}</div>
  </div>
  <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:800;line-height:1.2;letter-spacing:-0.02em;margin-bottom:1rem">${title}</h1>
  <div>
    <p style="font-size:15px;line-height:1.75;color:#48483A;font-weight:300;margin:0 0 12px">${body}</p>
  </div>
  <a href="https://bhaavbrief.in/briefs/${slug}" style="display:block;background:#C8720A;color:#FAFAF6;text-decoration:none;padding:12px 24px;text-align:center;font-family:monospace;font-size:12px;letter-spacing:0.04em;margin:24px 0">
    Read full edition on BhaavBrief →
  </a>
  <div style="border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:10px;color:#8A8A7A;font-family:monospace;line-height:1.8">
    © 2026 BhaavBrief · bhaavbrief.in<br>
    For educational and informational purposes only. Not registered with SEBI or any regulatory authority. Nothing here constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity. Past patterns are not indicative of future results. Commodity and equity trading involves substantial risk of loss. Consult a SEBI-registered investment advisor or research analyst before making financial decisions.<br>
    <a href="{{ unsubscribeUrl }}" style="color:#8A8A7A">Unsubscribe</a>
  </div>
</div>
</body></html>`
}

// ─── Send via Brevo ───────────────────────────────────────────────────────────

/** Find an existing Brevo campaign by name. Returns the campaign object or null. */
async function findExistingCampaign(name) {
  try {
    const res = await fetch(`${BREVO_API}/emailCampaigns?limit=50&sort=desc`, {
      headers: { 'api-key': API_KEY },
    })
    if (!res.ok) return null
    const { campaigns } = await res.json()
    return campaigns?.find(c => c.name === name) ?? null
  } catch { return null }
}

async function sendCampaign(subject, htmlContent, previewText) {
  const campaignName = `BhaavBrief — ${subject}`

  // Idempotency: check if this campaign was already created (covers double-send retries)
  const existing = await findExistingCampaign(campaignName)
  if (existing) {
    if (existing.status === 'sent' || existing.status === 'queued') {
      console.log(`Campaign already sent/queued (ID ${existing.id}, status: ${existing.status}) — skipping`)
      return existing.id
    }
    // Draft exists — just send it
    console.log(`Draft campaign found (ID ${existing.id}) — sending now`)
    const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${existing.id}/sendNow`, {
      method: 'POST',
      headers: { 'api-key': API_KEY },
    })
    if (!sendRes.ok) {
      const e = await sendRes.json()
      throw new Error(`Send failed: ${JSON.stringify(e)}`)
    }
    console.log(`Newsletter sent — Campaign ID: ${existing.id}`)
    return existing.id
  }

  // Create new campaign
  const createRes = await fetch(`${BREVO_API}/emailCampaigns`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:        campaignName,
      subject,
      previewText,
      sender:      { name: 'BhaavBrief', email: FROM_EMAIL },
      type:        'classic',
      htmlContent,
      recipients:  { listIds: [LIST_ID] },
    }),
  })

  if (!createRes.ok) {
    const e = await createRes.json()
    throw new Error(`Create campaign failed: ${JSON.stringify(e)}`)
  }

  const { id } = await createRes.json()
  console.log(`Campaign created: ID ${id}`)

  const sendRes = await fetch(`${BREVO_API}/emailCampaigns/${id}/sendNow`, {
    method: 'POST',
    headers: { 'api-key': API_KEY },
  })

  if (!sendRes.ok) {
    const e = await sendRes.json()
    throw new Error(`Send failed: ${JSON.stringify(e)}`)
  }

  console.log(`Newsletter sent — Campaign ID: ${id}`)
  return id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = resolveBriefPath()
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const raw               = fs.readFileSync(filePath, 'utf8')
  const { meta, content } = parseFrontmatter(raw)

  const title   = meta.title   || 'BhaavBrief Morning Edition'
  const edition = meta.edition ?? 1
  const date    = meta.date    || new Date().toISOString().split('T')[0]
  const summary = meta.summary || meta.description || 'Your daily commodity intelligence brief.'

  console.log(`Sending Edition ${edition}: "${title}"`)

  const html = mdxToHtml(content, title, edition, date)
  await sendCampaign(title, html, summary)
}

main().catch(err => {
  console.error('Newsletter send failed:', err.message)
  process.exit(1)
})

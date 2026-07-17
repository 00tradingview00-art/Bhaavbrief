#!/usr/bin/env node
/**
 * scripts/send-welcome-followups.mjs — FIX-12 (D-16) welcome sequence,
 * emails 2 and 3 of 3 (email 1, "what BhaavBrief is", is already sent
 * immediately on signup by lib/brevo.ts's sendWelcomeEmail).
 *
 *   Day 2: "how to read the brief in 3 minutes"
 *   Day 5: "the track record" (links to /track-record and /methodology)
 *
 * Runs daily. For each contact in the list whose SIGNUP_DATE attribute
 * (set by lib/brevo.ts addSubscriber) is exactly 2 or 5 days ago and who
 * hasn't already received that step (WELCOME2_SENT / WELCOME3_SENT), sends
 * the email and marks the contact so it never sends twice.
 *
 * NOTE: Brevo custom contact attributes (SIGNUP_DATE, WELCOME2_SENT,
 * WELCOME3_SENT) may need to be created once in the Brevo dashboard
 * (Contacts → Settings → Attributes) before the API persists them —
 * verify with a real contact before trusting this runs correctly.
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

if (!API_KEY) { console.error('BREVO_API_KEY not set'); process.exit(1) }

function daysAgo(dateStr) {
  if (!dateStr) return null
  const then = new Date(dateStr + 'T00:00:00Z').getTime()
  const now  = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
  return Math.round((now - then) / 86400000)
}

async function fetchAllContacts() {
  const contacts = []
  let offset = 0
  const limit = 500
  while (true) {
    const res = await fetch(`${BREVO_API}/contacts/lists/${LIST_ID}/contacts?limit=${limit}&offset=${offset}`, {
      headers: { 'api-key': API_KEY },
    })
    if (!res.ok) throw new Error(`Fetch contacts failed: ${res.status}`)
    const data = await res.json()
    contacts.push(...(data.contacts ?? []))
    if (!data.contacts || data.contacts.length < limit) break
    offset += limit
  }
  return contacts
}

async function sendTransactional(email, subject, htmlContent) {
  const res = await fetch(`${BREVO_API}/smtp/email`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'BhaavBrief', email: FROM_EMAIL },
      to: [{ email }],
      subject,
      htmlContent,
    }),
  })
  if (!res.ok) throw new Error(`Send failed for ${email}: ${JSON.stringify(await res.json())}`)
}

async function markSent(email, attribute) {
  const res = await fetch(`${BREVO_API}/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ attributes: { [attribute]: true } }),
  })
  if (!res.ok) console.warn(`Failed to mark ${attribute} for ${email}: ${res.status}`)
}

function wrap(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#FAFAF6;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:24px">Bhaav<span style="color:#C8720A">Brief</span></div>
  <h1 style="font-size:19px;font-weight:700;color:#18180F;margin:0 0 16px">${title}</h1>
  ${body}
  <div style="border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:10px;color:#8A8A7A;font-family:monospace;line-height:1.8">
    © 2026 BhaavBrief · bhaavbrief.in<br>
    For educational and informational purposes only. Not registered with SEBI or any regulatory authority. Nothing here constitutes investment advice.<br>
    <a href="{{ unsubscribeUrl }}" style="color:#8A8A7A">Unsubscribe</a>
  </div>
</div>
</body></html>`
}

const EMAIL_2 = {
  subject: 'How to read a BhaavBrief in 3 minutes',
  html: wrap('How to read a BhaavBrief in 3 minutes', `
    <p style="font-size:14px;line-height:1.75;color:#48483A">Every brief follows the same five-section structure, in this order — knowing the shape makes it a 3-minute read, not a 10-minute one:</p>
    <ol style="font-size:14px;line-height:2;color:#48483A;padding-left:20px">
      <li><strong style="color:#18180F">Price Bridge</strong> — the raw numbers, global price to MCX, in one glance.</li>
      <li><strong style="color:#18180F">The dominant narrative</strong> — one macro story, and whether it's building, fading, or shifting.</li>
      <li><strong style="color:#18180F">Historical Context</strong> — how this pattern has played out before, from a verified statistical record — never an invented statistic.</li>
      <li><strong style="color:#18180F">What Kills It</strong> — the specific trigger that would reverse the narrative.</li>
      <li><strong style="color:#18180F">Edge of the Day</strong> — one falsifiable level to watch, resolved the next morning against real data.</li>
    </ol>
    <a href="https://bhaavbrief.in/briefs" style="display:inline-block;margin-top:8px;background:#18180F;color:#FAFAF6;font-family:monospace;font-size:11px;letter-spacing:0.05em;padding:11px 20px;text-decoration:none">Read today's brief →</a>
  `),
}

const EMAIL_3 = {
  subject: "BhaavBrief's track record — every call, resolved",
  html: wrap('Every Edge of the Day call, resolved', `
    <p style="font-size:14px;line-height:1.75;color:#48483A">Most market commentary makes a call and moves on. We don't — every "Edge of the Day" is a specific, falsifiable level, and the next morning's brief resolves it against the real closing price before writing anything new. Misses stay on the record; nothing gets quietly deleted.</p>
    <a href="https://bhaavbrief.in/track-record" style="display:inline-block;margin-top:8px;background:#18180F;color:#FAFAF6;font-family:monospace;font-size:11px;letter-spacing:0.05em;padding:11px 20px;text-decoration:none">See the full track record →</a>
  `),
}

async function main() {
  const contacts = await fetchAllContacts()
  let sent2 = 0, sent3 = 0

  for (const contact of contacts) {
    const attrs = contact.attributes ?? {}
    const age = daysAgo(attrs.SIGNUP_DATE)
    if (age == null) continue

    if (age === 2 && !attrs.WELCOME2_SENT) {
      await sendTransactional(contact.email, EMAIL_2.subject, EMAIL_2.html)
      await markSent(contact.email, 'WELCOME2_SENT')
      sent2++
    }
    if (age === 5 && !attrs.WELCOME3_SENT) {
      await sendTransactional(contact.email, EMAIL_3.subject, EMAIL_3.html)
      await markSent(contact.email, 'WELCOME3_SENT')
      sent3++
    }
  }

  console.log(`Welcome followups: ${sent2} day-2 emails, ${sent3} day-3 emails sent (of ${contacts.length} contacts checked).`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })

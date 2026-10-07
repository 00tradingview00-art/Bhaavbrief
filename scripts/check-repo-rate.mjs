/**
 * scripts/check-repo-rate.mjs — daily check that lib/rbiRepoRate.js still
 * matches RBI's published repo rate. Emails the founder when it doesn't, or
 * when RBI's page can't be read (so the check can't silently die).
 * Run by .github/workflows/check-repo-rate.yml.
 */
import { REPO_RATE_PCT, REPO_RATE_ASOF } from '../lib/rbiRepoRate.js'
import { parseRbiRepoRate, compareRepoRate } from './lib/repoRateCheck.mjs'

const RBI_URL = 'https://www.rbi.org.in/'
const { BREVO_API_KEY, SENDER_EMAIL } = process.env

async function fetchRbiRate() {
  try {
    const res = await fetch(RBI_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BhaavBrief repo-rate check)' },
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return { rate: null, error: `HTTP ${res.status}` }
    return { rate: parseRbiRepoRate(await res.text()), error: null }
  } catch (e) {
    return { rate: null, error: e.message }
  }
}

async function sendEmail(subject, html) {
  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    console.log('BREVO_API_KEY/SENDER_EMAIL not set — skipping email')
    return
  }
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sender:      { name: 'BhaavBrief Bot', email: SENDER_EMAIL },
        to:          [{ email: '00tradingview00@gmail.com' }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) console.error('Email API error:', res.status)
    else         console.log('Alert email sent')
  } catch (e) {
    console.error('Email failed:', e.message)
  }
}

const today = new Date().toISOString().slice(0, 10)
const { rate: rbiRate, error } = await fetchRbiRate()
const { status } = compareRepoRate({ rbiRate, siteRate: REPO_RATE_PCT, siteAsOf: REPO_RATE_ASOF, today })

console.log(`BhaavBrief: ${REPO_RATE_PCT}% (as of ${REPO_RATE_ASOF}) · RBI: ${rbiRate ?? 'unreadable'}${error ? ` (${error})` : ''} → ${status}`)

if (status === 'mismatch') {
  await sendEmail(
    `ACTION REQUIRED: BhaavBrief repo rate is out of date (${REPO_RATE_PCT}% vs RBI ${rbiRate}%)`,
    `<p>RBI's website shows a repo rate of <b>${rbiRate}%</b>. BhaavBrief still shows <b>${REPO_RATE_PCT}%</b> (last updated ${REPO_RATE_ASOF}).</p>
     <p>This number appears on the /markets Repo Rate card and is passed to the AI-written news as a known fact.</p>
     <p>To fix: update <code>lib/rbiRepoRate.js</code> (or ask Claude Code to "update the BhaavBrief repo rate").</p>
     <p><a href="${RBI_URL}">Check RBI's homepage</a></p>`,
  )
  process.exit(1)
}

if (status === 'unreadable') {
  await sendEmail(
    `Repo rate check couldn't read RBI's website — ${today}`,
    `<p>The daily repo rate check couldn't find the "Policy Repo Rate" figure on <a href="${RBI_URL}">rbi.org.in</a>${error ? ` (${error})` : ''}.</p>
     <p>BhaavBrief currently shows ${REPO_RATE_PCT}% (last updated ${REPO_RATE_ASOF}). If RBI redesigned its homepage, the check needs updating.</p>`,
  )
  process.exit(1)
}

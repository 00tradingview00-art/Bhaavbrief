#!/usr/bin/env node
/**
 * scripts/generate-reel-report.mjs — weekly Instagram Reels performance
 * report, emailed to the founder. Read-only — never writes anything.
 * Dormant (logs and exits 0) unless BREVO_API_KEY/SENDER_EMAIL are set,
 * same guard pattern as scripts/send-telemetry-digest.mjs's Telegram gate.
 *
 * Exists because there was previously no visibility into reel performance
 * short of reading data/reel-history.json by hand — this is what actually
 * answers "are the reels attracting an audience", using the real
 * views/reach/watch-time/engagement data scripts/fetch-reel-insights.mjs
 * collects, and the follower-count trend from data/follower-history.json.
 *
 * Sent as a single transactional email (Brevo's smtp/email endpoint) to the
 * founder's own address — this is an internal report to one person, not a
 * subscriber campaign, so it deliberately does NOT use the emailCampaigns
 * list-send API scripts/send-newsletter.js/send-edge-scoreboard.mjs use;
 * it reuses the same smtp/email request shape as generate-brief.yml's
 * "Alert on failure" step instead.
 *
 * Usage: node scripts/generate-reel-report.mjs
 * Env:   BREVO_API_KEY, SENDER_EMAIL (required to send; otherwise the
 *        report is only printed to the console)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { followerDelta } from './lib/followerHistory.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const envFile = path.join(ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  }
}

const HISTORY_FILE = path.join(ROOT, 'data/reel-history.json')
const FOLLOWER_HISTORY_FILE = path.join(ROOT, 'data/follower-history.json')
const REPORT_RECIPIENT = '00tradingview00@gmail.com'
const WINDOW_DAYS = 7

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return fallback }
}

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null)
const round1 = (n) => (n == null ? null : Math.round(n * 10) / 10)

/**
 * Pure — exported for tests. Everything the report needs, computed from
 * data already on disk; no I/O and no network here.
 * @param {{history: object[], followerHistory: object[], now?: number, windowDays?: number}} args
 */
export function buildReport({ history, followerHistory, now = Date.now(), windowDays = WINDOW_DAYS }) {
  const withInsights = (history ?? []).filter((e) => e?.insights && e?.posted_at)
  const cutoffThis = now - windowDays * 24 * 3600 * 1000
  const cutoffPrior = now - 2 * windowDays * 24 * 3600 * 1000

  const thisWeek = withInsights.filter((e) => new Date(e.posted_at).getTime() >= cutoffThis)
  const priorWeek = withInsights.filter((e) => {
    const t = new Date(e.posted_at).getTime()
    return t >= cutoffPrior && t < cutoffThis
  })

  const viewsThis = thisWeek.map((e) => e.insights.views).filter(Number.isFinite)
  const viewsPrior = priorWeek.map((e) => e.insights.views).filter(Number.isFinite)
  const reachThis = thisWeek.map((e) => e.insights.reach).filter(Number.isFinite)
  const watchThis = thisWeek.map((e) => e.insights.ig_reels_avg_watch_time).filter(Number.isFinite)

  const avgViewsThis = avg(viewsThis)
  const avgViewsPrior = avg(viewsPrior)
  const viewsChangePct = avgViewsThis != null && avgViewsPrior ? round1(((avgViewsThis - avgViewsPrior) / avgViewsPrior) * 100) : null

  const sortedByViews = [...thisWeek].sort((a, b) => (b.insights.views ?? 0) - (a.insights.views ?? 0))
  const toSummary = (e) => ({ file: e.file, hook: e.hook_caption || e.topic || e.file, views: e.insights.views ?? null })
  const top3 = sortedByViews.slice(0, 3).map(toSummary)
  const bottom3 = sortedByViews.length > 3 ? sortedByViews.slice(-3).reverse().map(toSummary) : []

  const byType = {}
  for (const e of thisWeek) {
    const t = e.content_type ?? 'unknown'
    ;(byType[t] ??= []).push(e)
  }
  const contentTypeBreakdown = Object.entries(byType)
    .map(([type, entries]) => ({
      type,
      count: entries.length,
      avgViews: round1(avg(entries.map((e) => e.insights.views).filter(Number.isFinite))),
    }))
    .sort((a, b) => (b.avgViews ?? 0) - (a.avgViews ?? 0))

  const withChartInfo = thisWeek.filter((e) => e.charts)
  const chartCoveragePct = withChartInfo.length
    ? Math.round(
        (withChartInfo.filter((e) => Object.values(e.charts).some((t) => t && t !== 'none')).length / withChartInfo.length) * 100
      )
    : null

  return {
    windowDays,
    reelsThisWeek: thisWeek.length,
    reelsPriorWeek: priorWeek.length,
    avgViewsThis: round1(avgViewsThis),
    avgViewsPrior: round1(avgViewsPrior),
    viewsChangePct,
    avgReachThis: round1(avg(reachThis)),
    avgWatchSecThis: round1(avg(watchThis) != null ? avg(watchThis) / 1000 : null),
    top3,
    bottom3,
    contentTypeBreakdown,
    chartCoveragePct,
    followerDelta: followerDelta(followerHistory ?? [], windowDays),
  }
}

function buildHtml(r) {
  const changeColor = r.viewsChangePct == null ? '#8A8A7A' : r.viewsChangePct >= 0 ? '#166534' : '#991B1B'
  const changeLabel = r.viewsChangePct == null ? 'n/a (no prior-week data)' : `${r.viewsChangePct >= 0 ? '+' : ''}${r.viewsChangePct}% vs prior week`

  const listRow = (e) => `<tr><td style="padding:6px 0;font-size:13px;color:#18180F;font-family:Georgia,serif">${e.hook}</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;color:#48483A">${e.views ?? '?'}</td></tr>`

  const typeRows = r.contentTypeBreakdown
    .map((t) => `<tr><td style="padding:6px 0;font-size:13px;color:#18180F;font-family:Georgia,serif">${t.type}</td><td style="padding:6px 0;text-align:right;font-family:monospace;font-size:12px;color:#48483A">${t.avgViews ?? '?'} avg (${t.count})</td></tr>`)
    .join('')

  const followerLine = r.followerDelta
    ? `${r.followerDelta.latest} followers (${r.followerDelta.delta >= 0 ? '+' : ''}${r.followerDelta.delta} vs ${r.followerDelta.priorDate})`
    : 'not enough follower-history data yet'

  return `<!DOCTYPE html><html><body style="margin:0;background:#FAFAF6;font-family:Georgia,serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="font-family:monospace;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#C8720A;margin-bottom:8px">Weekly Reel Report</div>
  <h1 style="font-size:22px;font-weight:800;color:#18180F;margin:0 0 16px">BhaavBrief Reels — last ${r.windowDays} days</h1>

  <div style="display:flex;gap:8px;margin:20px 0;background:#DDDDD0">
    <div style="flex:1;background:#F3F2EC;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#18180F">${r.avgViewsThis ?? '—'}</div>
      <div style="font-family:monospace;font-size:9px;color:#8A8A7A;text-transform:uppercase">Avg views</div>
    </div>
    <div style="flex:1;background:#F3F2EC;padding:12px;text-align:center">
      <div style="font-size:16px;font-weight:800;color:${changeColor}">${changeLabel}</div>
      <div style="font-family:monospace;font-size:9px;color:#8A8A7A;text-transform:uppercase">Trend</div>
    </div>
    <div style="flex:1;background:#F3F2EC;padding:12px;text-align:center">
      <div style="font-size:22px;font-weight:800;color:#18180F">${r.chartCoveragePct != null ? r.chartCoveragePct + '%' : '—'}</div>
      <div style="font-family:monospace;font-size:9px;color:#8A8A7A;text-transform:uppercase">Chart coverage</div>
    </div>
  </div>

  <p style="font-size:13px;color:#48483A;line-height:1.7">${r.reelsThisWeek} reel(s) posted with data this week (${r.reelsPriorWeek} prior week). Avg reach ${r.avgReachThis ?? '—'}, avg watch time ${r.avgWatchSecThis ?? '—'}s. Followers: ${followerLine}.</p>

  <h2 style="font-size:14px;color:#18180F;margin:24px 0 8px">Top 3 this week</h2>
  <table style="width:100%;border-collapse:collapse">${top3RowsOrEmpty(r.top3, listRow)}</table>

  <h2 style="font-size:14px;color:#18180F;margin:24px 0 8px">Bottom 3 this week</h2>
  <table style="width:100%;border-collapse:collapse">${top3RowsOrEmpty(r.bottom3, listRow)}</table>

  <h2 style="font-size:14px;color:#18180F;margin:24px 0 8px">By content type</h2>
  <table style="width:100%;border-collapse:collapse">${typeRows || '<tr><td style="padding:12px 0;color:#8A8A7A;font-size:13px">No content-type data this week.</td></tr>'}</table>

  <div style="border-top:0.5px solid #DDDDD0;margin-top:32px;padding-top:16px;font-size:10px;color:#8A8A7A;font-family:monospace;line-height:1.8">
    Generated by scripts/generate-reel-report.mjs — data/reel-history.json + data/follower-history.json
  </div>
</div>
</body></html>`
}

function top3RowsOrEmpty(list, rowFn) {
  return list.length ? list.map(rowFn).join('') : '<tr><td style="padding:12px 0;color:#8A8A7A;font-size:13px">No reels with insights data this week.</td></tr>'
}

async function sendEmail(html, subject) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'BhaavBrief Bot', email: process.env.SENDER_EMAIL },
      to: [{ email: REPORT_RECIPIENT }],
      subject,
      htmlContent: html,
    }),
  })
  if (!res.ok) throw new Error(`Brevo send failed (${res.status}): ${await res.text()}`)
}

async function main() {
  const history = readJson(HISTORY_FILE, [])
  const followerHistory = readJson(FOLLOWER_HISTORY_FILE, [])
  const report = buildReport({ history, followerHistory })

  console.log(`Reels this week: ${report.reelsThisWeek} (prior: ${report.reelsPriorWeek})`)
  console.log(`Avg views: ${report.avgViewsThis ?? 'n/a'} (${report.viewsChangePct != null ? report.viewsChangePct + '%' : 'n/a'} vs prior week)`)
  console.log(`Avg reach: ${report.avgReachThis ?? 'n/a'} · avg watch: ${report.avgWatchSecThis ?? 'n/a'}s · chart coverage: ${report.chartCoveragePct != null ? report.chartCoveragePct + '%' : 'n/a'}`)
  console.log(`Followers: ${report.followerDelta ? `${report.followerDelta.latest} (${report.followerDelta.delta >= 0 ? '+' : ''}${report.followerDelta.delta})` : 'n/a'}`)

  if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
    console.log('\nBREVO_API_KEY/SENDER_EMAIL not set — report logged above only, not emailed.')
    return
  }
  const html = buildHtml(report)
  await sendEmail(html, `BhaavBrief Reels — weekly report (${new Date().toISOString().slice(0, 10)})`)
  console.log('\nWeekly reel report emailed.')
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })

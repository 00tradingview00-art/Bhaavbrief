#!/usr/bin/env node
/**
 * scripts/send-monitor-alert.mjs — Telegram notification for a new
 * synthetic-monitor incident (see .github/workflows/synthetic-monitor.yml).
 * Dormant unless TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID are set, same pattern
 * as scripts/apply-human-gate.mjs.
 *
 * Usage: node scripts/send-monitor-alert.mjs <report.json path> <issue URL>
 */
import fs from 'node:fs'
import { sendTelegramMessage } from './lib/telegram.mjs'

const [, , reportPath, issueUrl] = process.argv

async function main() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — skipping Telegram alert.')
    return
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  const text = [
    '<b>BhaavBrief synthetic monitor — new incident</b>',
    ...report.issues,
    '',
    issueUrl,
  ].join('\n')
  const result = await sendTelegramMessage(text)
  if (!result.ok) console.warn('Telegram alert not sent:', result.reason)
  else console.log('Telegram alert sent.')
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })

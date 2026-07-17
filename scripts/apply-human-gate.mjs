#!/usr/bin/env node
/**
 * scripts/apply-human-gate.mjs — G-12 human-approval gate, run after
 * validate-brief.mjs passes (exit 0) and before the brief is committed.
 *
 * SAFETY: the entire gate is dormant — this script always exits 0 and
 * leaves the brief as generated (published: true, current behavior,
 * unchanged) — unless BOTH TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
 * Without those, there would be nobody to receive the approval ping and a
 * staged brief would stay hidden forever — that would silently break the
 * flagship product's daily publish, which is worse than not having the
 * human gate at all. See docs/runbooks/g12-human-gate-setup.md.
 *
 * Usage: node scripts/apply-human-gate.mjs <brief-path> <edition>
 * Env:   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (both required to activate)
 */

import fs from 'node:fs'
import path from 'node:path'
import { computeNextStreak, writeStreak, AUTO_PUBLISH_THRESHOLD } from './lib/gateStreak.mjs'
import { sendTelegramMessage, formatApprovalMessage } from './lib/telegram.mjs'

const [, , briefPath, editionArg] = process.argv
const edition = parseInt(editionArg, 10)

async function main() {
  if (!briefPath || !Number.isFinite(edition)) {
    console.error('usage: node apply-human-gate.mjs <brief-path> <edition>')
    process.exit(1)
  }

  const telegramConfigured = !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID
  if (!telegramConfigured) {
    console.log('G-12 human gate: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set — gate is dormant, publishing as generated (current behavior).')
    process.exit(0)
  }

  let gateResult = { clean: false, warnings: [], blockers: [] }
  try {
    gateResult = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/last-gate-result.json'), 'utf8'))
  } catch (e) {
    console.warn('Could not read data/last-gate-result.json — treating as not-clean for streak purposes:', e.message)
  }

  const streak = computeNextStreak(gateResult.clean, edition)
  writeStreak(streak)
  console.log(`G-12 streak: ${streak.consecutiveCleanPasses}/${AUTO_PUBLISH_THRESHOLD} consecutive clean passes.`)

  if (streak.autoPublishEligible) {
    console.log('Streak threshold met — auto-publishing (human gate graduated).')
    process.exit(0)
  }

  // Stage: rewrite published:true -> published:false before commit.
  let content = fs.readFileSync(briefPath, 'utf8')
  if (!/^published:\s*true/m.test(content)) {
    console.warn('Brief does not have "published: true" as generated — leaving as-is (may already be staged or malformed).')
  } else {
    content = content.replace(/^published:\s*true/m, 'published: false')
    fs.writeFileSync(briefPath, content)
    console.log(`Staged edition #${edition} (published: false) pending approval.`)
  }

  const titleMatch = content.match(/^title:\s*"([^"]+)"/m)
  const edgeMatch = content.match(/\*\*Edge of the Day:\*\*\s*([^\n]*)/)
  const repo = process.env.GITHUB_REPOSITORY ?? 'org/repo'

  const message = formatApprovalMessage({
    edition,
    title: titleMatch?.[1] ?? '(title unavailable)',
    edgeText: edgeMatch?.[1]?.slice(0, 200) ?? null,
    warnings: gateResult.warnings ?? [],
    repo,
  })

  const result = await sendTelegramMessage(message)
  if (!result.ok) {
    console.warn('Telegram notification failed (non-fatal, brief is still staged):', result.reason)
  } else {
    console.log('Telegram approval notification sent.')
  }
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })

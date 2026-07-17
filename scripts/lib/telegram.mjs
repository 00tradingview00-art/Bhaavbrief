/**
 * scripts/lib/telegram.mjs — G-12 human-approval-gate notification.
 * Requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID env vars (repo secrets in
 * CI). Deliberately NOT wired to auto-activate anything by itself — the
 * caller (generate-brief.yml) only invokes this when both secrets are
 * present, so the whole G-12 gate stays fully dormant (current auto-publish
 * behavior, unchanged) until those are actually configured. See
 * docs/runbooks/g12-human-gate-setup.md for the one-time setup steps.
 */

export async function sendTelegramMessage(text) {
  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set' }
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, reason: `Telegram API ${res.status}: ${body}` }
  }
  return { ok: true }
}

/**
 * The "3-line summary" the master doc specifies: headline, edge, warnings.
 * @param {{edition: number, title: string, edgeText: string|null, warnings: string[], repo: string}} params
 */
export function formatApprovalMessage({ edition, title, edgeText, warnings, repo }) {
  const lines = [
    `<b>BhaavBrief #${edition} — awaiting approval</b>`,
    title,
    edgeText ? `Edge: ${edgeText}` : null,
    warnings.length ? `⚠ ${warnings.length} warning(s): ${warnings.join('; ')}` : '✓ Clean pass',
    '',
    `Approve: gh workflow run approve-edition.yml -f edition=${edition} --repo ${repo}`,
  ].filter((l) => l !== null)
  return lines.join('\n')
}

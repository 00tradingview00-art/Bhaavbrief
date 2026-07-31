/**
 * scripts/lib/historyReader.mjs — plain-JS port of lib/history.ts's
 * getSparklineCloses, for the reel/card generator scripts (plain `node`,
 * no ts-node/tsx loader, so the .ts version can't be imported directly).
 * Same read-sort-slice logic over data/history/YYYY-MM-DD.json — keep this
 * in sync with lib/history.ts by hand if that file's algorithm changes;
 * there is no build step linking the two.
 *
 * Unlike lib/history.ts (which maps a friendly "commodity" name to one of
 * five MCX_* fields for the website's sparkline), this takes the raw
 * instrument key directly (e.g. 'MCX_GOLD', 'USDINR') to match how
 * generate-brief-reel.mjs's dominantMover() already addresses instruments —
 * no extra name-mapping layer needed in the reel/card pipeline.
 */

import fs from 'node:fs'
import path from 'node:path'

const DATE_FILE_RE = /^\d{4}-\d{2}-\d{2}\.json$/

/**
 * Reads up to `days` most recent data/history/YYYY-MM-DD.json files and
 * returns `instrumentKey`'s daily closes, oldest -> newest.
 * @param {string} instrumentKey - e.g. 'MCX_GOLD', 'MCX_CRUDE', 'USDINR'
 * @param {number} days
 * @param {string} [historyDir] - override for tests; defaults to <cwd>/data/history
 * @returns {number[]}
 */
export function getCloses(instrumentKey, days = 30, historyDir) {
  if (!instrumentKey) return []

  const dir = historyDir ?? path.join(process.cwd(), 'data/history')
  if (!fs.existsSync(dir)) return []

  const dateFiles = fs.readdirSync(dir)
    .filter(f => DATE_FILE_RE.test(f))
    .sort() // ascending YYYY-MM-DD
    .slice(-days) // safe even when fewer than `days` files exist — slice(-30) on a 5-item array just returns all 5

  const closes = []
  for (const fileName of dateFiles) {
    try {
      const raw   = fs.readFileSync(path.join(dir, fileName), 'utf8')
      const data  = JSON.parse(raw)
      const price = data?.instruments?.[instrumentKey]?.price
      if (typeof price === 'number' && Number.isFinite(price) && price > 0) closes.push(price)
    } catch {
      // skip unreadable/corrupt/malformed day file — a gap in the sparkline
      // is better than crashing reel/card generation
    }
  }
  return closes
}

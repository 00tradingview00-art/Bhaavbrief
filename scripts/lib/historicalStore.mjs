/**
 * scripts/lib/historicalStore.mjs — C-05 historical store: an append-only
 * daily archive of canonical values under data/history/YYYY-MM-DD.json.
 *
 * "This is what powers the claims ledger verification, Yesterday's-Edge
 * resolution, and future 'event impact statistics' honestly." (master doc)
 *
 * One file per IST calendar day. fetch-snapshot.mjs runs multiple times a
 * day (morning brief, evening close, site-guardian, intelligence-engine),
 * so this overwrites *today's* file on every call — it always reflects the
 * latest validated snapshot of the current day — but a file for a day that
 * has already ended is never touched again once the date rolls over, which
 * is the "append-only" property that matters: yesterday's canonical values
 * are frozen the moment today's file is created.
 */
import fs from 'node:fs'
import path from 'node:path'

export function historyFilePath(historyDir, istDateStr) {
  return path.join(historyDir, `${istDateStr}.json`)
}

/**
 * @param {string} historyDir - absolute path to data/history/
 * @param {string} istDateStr - YYYY-MM-DD (IST), the day this snapshot belongs to
 * @param {object} snapshot - the validated snapshot object to archive
 */
export function appendDailySnapshot(historyDir, istDateStr, snapshot) {
  fs.mkdirSync(historyDir, { recursive: true })
  const filePath = historyFilePath(historyDir, istDateStr)
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
  return filePath
}

/**
 * @param {string} historyDir
 * @param {string} istDateStr
 * @returns {object|null}
 */
export function readDailySnapshot(historyDir, istDateStr) {
  const filePath = historyFilePath(historyDir, istDateStr)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

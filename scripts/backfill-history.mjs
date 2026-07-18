/**
 * scripts/backfill-history.mjs — Part 12 UI-04: one-time seed of 30 days of
 * MCX daily closes into data/history/, so components/ui/Sparkline.tsx has
 * real data on day one instead of a flat/empty line.
 *
 * Run once manually:
 *   node --env-file=.env.local scripts/backfill-history.mjs
 *
 * After this, the existing fetch-snapshot.mjs cron keeps data/history/
 * current day-by-day — this script never runs on a schedule and never
 * overwrites a day that already has a file (in particular, it will never
 * touch today's file, which the live cron owns).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchKiteHistorical } from './lib/technicals.js'
import { historyFilePath } from './lib/historicalStore.mjs'
import { todayIST } from './lib/holidays.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const HISTORY_DIR = path.join(ROOT, 'data/history')

// commodity key -> [instruments.json key, MCX_* instruments field, unit]
const COMMODITIES = [
  { key: 'gold',   field: 'MCX_GOLD',   unit: 'INR/10g'  },
  { key: 'silver', field: 'MCX_SILVER', unit: 'INR/kg'   },
  { key: 'crude',  field: 'MCX_CRUDE',  unit: 'INR/bbl'  },
  { key: 'copper', field: 'MCX_COPPER', unit: 'INR/kg'   },
  { key: 'natgas', field: 'MCX_NATGAS', unit: 'INR/mmBtu' },
]

function loadInstrumentTokens() {
  const raw = fs.readFileSync(path.join(ROOT, 'data/kite-instruments.json'), 'utf8')
  return JSON.parse(raw)
}

async function main() {
  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    console.error('KITE_API_KEY / KITE_ACCESS_TOKEN not set — run with `node --env-file=.env.local scripts/backfill-history.mjs`')
    process.exitCode = 1
    return
  }

  const instruments = loadInstrumentTokens()
  const todayStr = todayIST()

  // date (YYYY-MM-DD, from candle timestamp) -> { field -> { close, prevClose } }
  const byDate = new Map()

  for (const { key, field } of COMMODITIES) {
    const token = instruments[key]?.token
    if (!token) {
      console.warn(`No instrument token for "${key}" in data/kite-instruments.json — skipping`)
      continue
    }
    const candles = await fetchKiteHistorical(token, 45)
    if (!candles || candles.length === 0) {
      console.warn(`No historical candles returned for "${key}" — skipping`)
      continue
    }
    for (let i = 0; i < candles.length; i++) {
      const [timestamp, , , , close] = candles[i]
      const dateStr = String(timestamp).split('T')[0]
      const prevClose = i > 0 ? candles[i - 1][4] : close
      if (!byDate.has(dateStr)) byDate.set(dateStr, {})
      byDate.get(dateStr)[field] = { close, prevClose }
    }
    console.log(`Fetched ${candles.length} days for ${key}`)
  }

  let written = 0
  let skipped = 0
  for (const [dateStr, fields] of byDate) {
    if (dateStr === todayStr) { skipped++; continue } // live cron owns today's file
    const filePath = historyFilePath(HISTORY_DIR, dateStr)
    if (fs.existsSync(filePath)) { skipped++; continue } // never overwrite an existing day

    const instrumentsOut = {}
    for (const { field, unit } of COMMODITIES) {
      const d = fields[field]
      if (!d) continue
      const changePct = d.prevClose ? ((d.close - d.prevClose) / d.prevClose) * 100 : 0
      instrumentsOut[field] = {
        price: d.close,
        prevClose: d.prevClose,
        changePct: Math.round(changePct * 10000) / 10000,
        unit,
      }
    }
    if (Object.keys(instrumentsOut).length === 0) continue

    const snapshot = {
      generatedAt: new Date(`${dateStr}T12:00:00Z`).toISOString(),
      generatedAtIST: `${dateStr} (backfilled)`,
      source: 'kite-backfill',
      backfilled: true,
      instruments: instrumentsOut,
    }
    fs.mkdirSync(HISTORY_DIR, { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8')
    written++
  }

  console.log(`Backfill complete: ${written} day(s) written, ${skipped} skipped (already existed or is today).`)
}

main()

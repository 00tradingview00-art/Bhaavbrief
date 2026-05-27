#!/usr/bin/env node
/**
 * Fetches MCX market holidays from NSE Holiday API (CBM segment = commodity/bond market).
 * MCX follows the same regulatory holidays as NSE's commodity segment.
 * Saves to data/market-holidays.json for use by brief generators.
 *
 * Run: node scripts/fetch-holidays.js
 * Scheduled: weekly via GitHub Actions
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_FILE = path.join(ROOT, 'data/market-holidays.json')

async function fetchHolidays() {
  const res = await fetch(
    'https://www.nseindia.com/api/holiday-master?type=trading',
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.nseindia.com/',
      },
      signal: AbortSignal.timeout(15000),
    }
  )
  if (!res.ok) throw new Error(`NSE API ${res.status}`)
  const data = await res.json()

  // CBM = Commodity and Bond Market — the segment MCX follows
  const cbm = data?.CBM ?? data?.CM ?? []
  if (!cbm.length) throw new Error('Empty CBM holiday list')

  // Normalise to YYYY-MM-DD
  const holidays = cbm.map(h => {
    const raw = h.tradingDate ?? h.date ?? ''
    // NSE returns "15-Jan-2026" or "2026-01-15"
    let iso = raw
    if (raw.match(/^\d{2}-[A-Za-z]{3}-\d{4}$/)) {
      const [d, mon, y] = raw.split('-')
      const months = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }
      iso = `${y}-${String(months[mon]).padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    return { date: iso, description: h.description ?? h.weekDay ?? '' }
  }).filter(h => h.date.match(/^\d{4}-\d{2}-\d{2}$/))

  holidays.sort((a, b) => a.date.localeCompare(b.date))
  return holidays
}

async function main() {
  console.log('Fetching MCX/NSE holiday list...')
  try {
    const holidays = await fetchHolidays()
    fs.writeFileSync(OUT_FILE, JSON.stringify(holidays, null, 2), 'utf8')
    console.log(`Saved ${holidays.length} holidays to data/market-holidays.json`)
    const upcoming = holidays.filter(h => h.date >= new Date().toISOString().slice(0, 10)).slice(0, 5)
    if (upcoming.length) {
      console.log('Upcoming:')
      upcoming.forEach(h => console.log(`  ${h.date} — ${h.description}`))
    }
  } catch (e) {
    console.error('Failed:', e.message)
    // Don't fail the workflow — stale holidays are better than crashing
    if (!fs.existsSync(OUT_FILE)) {
      fs.writeFileSync(OUT_FILE, '[]', 'utf8')
    }
    process.exit(0)
  }
}

main()

import fs from 'fs'
import path from 'path'

const FIELD_BY_COMMODITY: Record<string, string> = {
  gold: 'MCX_GOLD',
  silver: 'MCX_SILVER',
  crude: 'MCX_CRUDE',
  copper: 'MCX_COPPER',
  natgas: 'MCX_NATGAS',
}

interface DailySnapshotFile {
  instruments?: Record<string, { price?: number }>
}

/**
 * Reads up to `days` most recent data/history/YYYY-MM-DD.json files and
 * returns that commodity's daily closes, oldest → newest, for
 * components/ui/Sparkline.tsx. Seeded by scripts/backfill-history.mjs,
 * kept current day-by-day by the existing fetch-snapshot.mjs cron.
 */
export function getSparklineCloses(commodity: string, days = 30): number[] {
  const field = FIELD_BY_COMMODITY[commodity]
  if (!field) return []

  const dir = path.join(process.cwd(), 'data/history')
  if (!fs.existsSync(dir)) return []

  const dateFiles = fs.readdirSync(dir)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort() // ascending YYYY-MM-DD
    .slice(-days)

  const closes: number[] = []
  for (const fileName of dateFiles) {
    try {
      const raw = fs.readFileSync(path.join(dir, fileName), 'utf8')
      const data = JSON.parse(raw) as DailySnapshotFile
      const price = data.instruments?.[field]?.price
      if (typeof price === 'number' && price > 0) closes.push(price)
    } catch {
      // skip unreadable/corrupt day file — a gap in the sparkline is better
      // than crashing the page render
    }
  }
  return closes
}

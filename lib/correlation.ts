import fs from 'fs'
import path from 'path'

// 5 core MCX commodities + USDINR — matches the plan's "6×6, no Nifty 50"
// scope: no NSE equity-index data source exists anywhere in this codebase.
export const CORRELATION_KEYS = ['gold', 'silver', 'crude', 'copper', 'natgas', 'usdinr'] as const
export type CorrelationKey = typeof CORRELATION_KEYS[number]

export const CORRELATION_LABELS: Record<CorrelationKey, string> = {
  gold: 'Gold', silver: 'Silver', crude: 'Crude', copper: 'Copper', natgas: 'Nat Gas', usdinr: 'USDINR',
}

const FIELD_BY_KEY: Record<CorrelationKey, string> = {
  gold: 'MCX_GOLD', silver: 'MCX_SILVER', crude: 'MCX_CRUDE', copper: 'MCX_COPPER', natgas: 'MCX_NATGAS', usdinr: 'USDINR',
}

interface DailySnapshotFile {
  instruments?: Record<string, { price?: number }>
}

/**
 * Pearson correlation coefficient of two equal-length numeric series.
 * Returns null (never a fabricated 0) when there isn't enough variance or
 * data to compute a meaningful value — a flat/zero-variance series has an
 * undefined correlation, not a correlation of exactly 0.
 */
export function pearsonCorrelation(a: number[], b: number[]): number | null {
  if (a.length !== b.length || a.length < 2) return null
  const n = a.length
  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n
  let cov = 0, varA = 0, varB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB
    cov += da * db
    varA += da * da
    varB += db * db
  }
  if (varA === 0 || varB === 0) return null
  return cov / Math.sqrt(varA * varB)
}

/** Day-over-day log returns of a price series, same idea as lib/vix.ts's realized-vol input. */
export function dailyLogReturns(closes: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]))
  }
  return out
}

/**
 * Reads every data/history/*.json file and returns one row per date where
 * ALL SIX instruments have a real price — a date missing even one field is
 * dropped entirely, not filled with a carried-forward or zero value. This
 * matters: computing each instrument's returns independently (e.g. via
 * lib/history.ts's getSparklineCloses per-field) can silently misalign two
 * series if one skipped a different day than the other, corrupting every
 * correlation in the matrix without any visible sign of it. Reading once
 * and requiring a complete row is the only way to guarantee paired days.
 */
export function readAlignedCloses(): { dates: string[]; series: Record<CorrelationKey, number[]> } {
  const dir = path.join(process.cwd(), 'data/history')
  const series: Record<CorrelationKey, number[]> = { gold: [], silver: [], crude: [], copper: [], natgas: [], usdinr: [] }
  const dates: string[] = []
  if (!fs.existsSync(dir)) return { dates, series }

  const files = fs.readdirSync(dir)
    .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()

  for (const fileName of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, fileName), 'utf8')
      const data = JSON.parse(raw) as DailySnapshotFile
      const row: Partial<Record<CorrelationKey, number>> = {}
      let complete = true
      for (const key of CORRELATION_KEYS) {
        const price = data.instruments?.[FIELD_BY_KEY[key]]?.price
        if (typeof price !== 'number' || price <= 0) { complete = false; break }
        row[key] = price
      }
      if (!complete) continue
      dates.push(fileName.replace('.json', ''))
      for (const key of CORRELATION_KEYS) series[key].push(row[key] as number)
    } catch {
      // skip unreadable/corrupt day file
    }
  }
  return { dates, series }
}

export interface CorrelationMatrix {
  labels:     string[]
  matrix:     (number | null)[][]
  sampleSize: number // number of paired daily returns actually used
}

/**
 * Builds the 6×6 correlation matrix over the most recent `days` trading
 * days of aligned daily returns. sampleSize tells the caller (and should be
 * shown in the UI) exactly how many observations back each number — with
 * only ~86 days of history on disk today, a 20-day window is meaningful,
 * but this is written to degrade honestly (fewer real observations, not a
 * silently-padded window) as the window size approaches what's on disk.
 */
export function getCorrelationMatrix(days = 20): CorrelationMatrix {
  const { series } = readAlignedCloses()
  const windowed: Record<CorrelationKey, number[]> = { gold: [], silver: [], crude: [], copper: [], natgas: [], usdinr: [] }
  for (const key of CORRELATION_KEYS) {
    const closes = series[key].slice(-(days + 1)) // +1 close to get `days` returns
    windowed[key] = dailyLogReturns(closes)
  }

  const sampleSize = windowed.gold.length
  const labels = CORRELATION_KEYS.map(k => CORRELATION_LABELS[k])
  const matrix: (number | null)[][] = CORRELATION_KEYS.map(rowKey =>
    CORRELATION_KEYS.map(colKey => {
      if (rowKey === colKey) return sampleSize > 0 ? 1 : null
      return pearsonCorrelation(windowed[rowKey], windowed[colKey])
    }),
  )

  return { labels, matrix, sampleSize }
}

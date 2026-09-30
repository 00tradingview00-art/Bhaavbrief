import { redisCommand } from './redis'
import { MCX_INSTRUMENTS } from './options'
import { ivRankSeries, type IVHistoryPoint } from './ivAnalysis'

// Stored daily ATM IV for one instrument (iv-hist:{instrument}, written by
// app/api/cron/iv-snapshot), oldest first. Throws if Redis is unreachable —
// callers decide whether that's an empty series or an error.
export async function readIVHistory(instrument: string): Promise<IVHistoryPoint[]> {
  const raw = await redisCommand('hgetall', `iv-hist:${instrument}`) as string[] | null
  const history: IVHistoryPoint[] = []
  if (raw) {
    for (let i = 0; i < raw.length; i += 2) {
      const iv = parseFloat(raw[i + 1])
      if (!isNaN(iv)) history.push({ date: raw[i], iv })
    }
  }
  history.sort((a, b) => a.date.localeCompare(b.date))
  return history
}

export interface IVRankInstrumentSeries {
  key: string
  label: string
  series: { date: string; ivRank: number }[]
}

// Per-instrument IV Rank series over the last 90 stored days — the Pro-only
// history chart on /tools/mcx-iv-rank. Same window the page used to compute
// inline (history.slice(-90) → ivRankSeries).
export async function getIVRankHistories(): Promise<IVRankInstrumentSeries[]> {
  return Promise.all(
    Object.entries(MCX_INSTRUMENTS).map(async ([key, meta]) => {
      const history = await readIVHistory(key).catch(() => [])
      return { key, label: meta.label, series: ivRankSeries(history.slice(-90)) }
    }),
  )
}

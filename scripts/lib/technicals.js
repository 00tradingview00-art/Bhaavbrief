/**
 * BhaavBrief — Kite Historical OHLC + Technical Level Calculator
 * Shared module used by intelligence-engine.js and daily-open-brief.js
 */

/**
 * Fetch N trading days of daily OHLC candles from Kite historical API.
 * Returns array of [timestamp, open, high, low, close, volume, oi] or null.
 */
export async function fetchKiteHistorical(instrumentToken, days = 22) {
  const KITE_API_KEY      = process.env.KITE_API_KEY
  const KITE_ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN
  if (!KITE_API_KEY || !KITE_ACCESS_TOKEN || !instrumentToken) return null

  const to   = new Date()
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const fmt  = d => d.toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://api.kite.trade/instruments/historical/${instrumentToken}/day?from=${fmt(from)}&to=${fmt(to)}`,
      {
        headers: {
          'X-Kite-Version': '3',
          Authorization: `token ${KITE_API_KEY}:${KITE_ACCESS_TOKEN}`,
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) {
      console.warn(`  Historical API ${res.status} for token ${instrumentToken}`)
      return null
    }
    const json = await res.json()
    return json?.data?.candles ?? null
  } catch (e) {
    console.warn(`  Historical fetch failed: ${e.message}`)
    return null
  }
}

/**
 * Compute technical levels from OHLC candles.
 * candle format: [timestamp, open, high, low, close, volume, oi]
 */
export function computeTechnicalLevels(candles, currentPrice) {
  if (!candles || candles.length < 3) return null

  const closes = candles.map(c => c[4])
  const highs  = candles.map(c => c[2])
  const lows   = candles.map(c => c[3])
  const n      = candles.length

  // Most recent completed session
  const prev      = candles[n - 1]
  const prevHigh  = Math.round(prev[2])
  const prevLow   = Math.round(prev[3])
  const prevClose = Math.round(prev[4])

  // Rolling windows
  const weekHigh  = Math.round(Math.max(...highs.slice(-5)))
  const weekLow   = Math.round(Math.min(...lows.slice(-5)))
  const monthHigh = Math.round(Math.max(...highs.slice(-22)))
  const monthLow  = Math.round(Math.min(...lows.slice(-22)))

  // 20-day SMA of closes
  const sma20 = Math.round(
    closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length)
  )

  // Nearest psychologically significant round number
  const magnitude = currentPrice > 50000 ? 5000
                  : currentPrice > 10000 ? 1000
                  : currentPrice > 1000  ? 500
                  : 100
  const nearestRound  = Math.round(currentPrice / magnitude) * magnitude
  const distToRoundPct = ((nearestRound - currentPrice) / currentPrice * 100).toFixed(2)

  // Immediate resistance: closest recent highs above current
  const recentHighs = highs.slice(-10).filter(h => h > currentPrice).sort((a, b) => a - b)
  // Immediate support: closest recent lows below current
  const recentLows  = lows.slice(-10).filter(l => l < currentPrice).sort((a, b) => b - a)

  return {
    prevHigh, prevLow, prevClose,
    weekHigh, weekLow,
    monthHigh, monthLow,
    sma20,
    nearestRound,
    distToRoundPct,
    aboveRound: Number(distToRoundPct) < 0,
    resistance1: recentHighs[0] ? Math.round(recentHighs[0]) : null,
    resistance2: recentHighs[1] ? Math.round(recentHighs[1]) : null,
    support1:    recentLows[0]  ? Math.round(recentLows[0])  : null,
    support2:    recentLows[1]  ? Math.round(recentLows[1])  : null,
  }
}

/**
 * Format a technical levels object into a Claude-readable block.
 */
export function formatTechnicalBlock(label, unit, currentPrice, levels) {
  if (!levels || !currentPrice) return ''
  const price = typeof currentPrice === 'number' ? Math.round(currentPrice) : currentPrice
  const r1    = levels.resistance1 ?? '—'
  const r2    = levels.resistance2 ?? '—'
  const s1    = levels.support1    ?? '—'
  const s2    = levels.support2    ?? '—'

  return [
    `${label} (${unit}) — Kite OHLC 20-day:`,
    `  Current: ${price} | Prev Close: ${levels.prevClose} | Day range: ${levels.prevLow}–${levels.prevHigh}`,
    `  Week:  ${levels.weekLow}–${levels.weekHigh} | Month: ${levels.monthLow}–${levels.monthHigh} | 20-SMA: ${levels.sma20}`,
    `  Resistance: ${r1}${r2 !== '—' ? ` → ${r2}` : ''} | Support: ${s1}${s2 !== '—' ? ` → ${s2}` : ''}`,
    `  Round number: ${levels.nearestRound} (${Math.abs(levels.distToRoundPct)}% ${levels.aboveRound ? 'above' : 'below'})`,
  ].join('\n')
}

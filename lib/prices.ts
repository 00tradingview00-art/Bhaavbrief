export interface PriceItem {
  name:   string
  symbol: string
  price:  string
  change: string
  pct:    string
  up:     boolean
}

const SYMBOLS: { symbol: string; name: string; prefix: string; decimals: number }[] = [
  { symbol: 'CL=F', name: 'MCX Crude',  prefix: '₹', decimals: 0 },
  { symbol: 'GC=F', name: 'MCX Gold',   prefix: '₹', decimals: 0 },
  { symbol: 'SI=F', name: 'MCX Silver', prefix: '₹', decimals: 0 },
  { symbol: 'HG=F', name: 'MCX Copper', prefix: '₹', decimals: 1 },
  { symbol: 'NG=F', name: 'Nat Gas',    prefix: '₹', decimals: 1 },
]

async function fetchUSDINR(): Promise<number> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 900 },
    })
    if (!res.ok) return 84
    const json = await res.json()
    return json?.rates?.INR ?? 84
  } catch {
    return 84
  }
}

async function fetchYahoo(symbol: string): Promise<{ price: number; change: number; pct: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 },
    })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price  = meta.regularMarketPrice ?? 0
    const prev   = meta.previousClose      ?? price
    const change = price - prev
    const pct    = prev ? (change / prev) * 100 : 0
    return { price, change, pct }
  } catch {
    return null
  }
}

function toMCX(symbol: string, usd: number, fx: number): number {
  if (symbol === 'GC=F') return (usd / 31.1035) * 10 * fx * 1.132
  if (symbol === 'SI=F') return (usd / 31.1035) * 1000 * fx * 1.157
  if (symbol === 'HG=F') return usd * 2.20462 * fx
  return usd * fx // CL=F, NG=F
}

export async function fetchPrices(): Promise<PriceItem[]> {
  const fx = await fetchUSDINR()

  const results: PriceItem[] = []

  for (const sym of SYMBOLS) {
    const data = await fetchYahoo(sym.symbol)
    if (!data) continue

    const price  = toMCX(sym.symbol, data.price,  fx)
    const prev   = toMCX(sym.symbol, data.price - data.change, fx)
    const change = price - prev
    const pct    = data.pct

    results.push({
      name:   sym.name,
      symbol: sym.symbol,
      price:  `${sym.prefix}${Math.round(price).toLocaleString('en-IN')}`,
      change: `${change >= 0 ? '+' : ''}${Math.round(change).toLocaleString('en-IN')}`,
      pct:    `${change >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
      up:     change >= 0,
    })
  }

  return results
}

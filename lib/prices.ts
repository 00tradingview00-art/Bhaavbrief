export interface PriceItem {
  name:   string
  symbol: string
  price:  string
  change: string
  pct:    string
  up:     boolean
}

const SYMBOLS: { symbol: string; name: string; prefix: string; decimals: number }[] = [
  { symbol: 'CL=F',  name: 'MCX Crude',   prefix: '₹', decimals: 0 },
  { symbol: 'GC=F',  name: 'MCX Gold',    prefix: '₹', decimals: 0 },
  { symbol: 'SI=F',  name: 'MCX Silver',  prefix: '₹', decimals: 0 },
  { symbol: 'HG=F',  name: 'MCX Copper',  prefix: '₹', decimals: 1 },
  { symbol: 'NG=F',  name: 'Nat Gas',     prefix: '₹', decimals: 1 },
  { symbol: 'INR=X', name: 'USDINR',      prefix: '₹', decimals: 2 },
]

async function fetchYahoo(symbol: string): Promise<{ price: number; change: number; pct: number } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 900 }, // 15 min cache
    })
    if (!res.ok) return null
    const json = await res.json()
    const meta = json?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price  = meta.regularMarketPrice  ?? 0
    const prev   = meta.previousClose       ?? price
    const change = price - prev
    const pct    = prev ? (change / prev) * 100 : 0
    return { price, change, pct }
  } catch {
    return null
  }
}

export async function fetchPrices(usdinr?: number): Promise<PriceItem[]> {
  // First fetch USDINR so we can convert USD prices to INR
  const fxData = await fetchYahoo('INR=X')
  const fx = fxData?.price ?? usdinr ?? 83.5

  const results: PriceItem[] = []

  for (const sym of SYMBOLS) {
    const data = await fetchYahoo(sym.symbol)
    if (!data) continue

    let price = data.price
    let change = data.change
    let pct = data.pct

    // Convert USD commodities to approximate INR (MCX parity)
    if (sym.symbol !== 'INR=X') {
      if (sym.symbol === 'CL=F') {
        // Crude: USD/barrel → INR/barrel (MCX quotes in INR/barrel for 100-barrel lots)
        price  *= fx
        change *= fx
      } else if (sym.symbol === 'GC=F') {
        // Gold: USD/troy oz → INR/10g (MCX quotes per 10g)
        // 1 troy oz = 31.1035g, MCX lot = 1kg, quote per 10g
        price  = (price / 31.1035) * 10 * fx
        change = (change / 31.1035) * 10 * fx
      } else if (sym.symbol === 'SI=F') {
        // Silver: USD/troy oz → INR/kg (MCX quotes per kg)
        // 1 troy oz = 31.1035g, 1kg = 1000g
        price  = (price / 31.1035) * 1000 * fx
        change = (change / 31.1035) * 1000 * fx
      } else if (sym.symbol === 'HG=F') {
        // Copper: USD/lb → INR/kg (MCX quotes per kg)
        // 1 lb = 0.453592 kg
        price  = (price / 0.453592) * fx
        change = (change / 0.453592) * fx
      } else if (sym.symbol === 'NG=F') {
        // Nat Gas: USD/MMBtu → INR/MMBtu (approximate MCX)
        price  *= fx
        change *= fx
      }
    }

    const fmt = (n: number) => {
      if (sym.symbol === 'INR=X') return n.toFixed(sym.decimals)
      return Math.round(n).toLocaleString('en-IN')
    }

    const sign = change >= 0 ? '+' : ''
    results.push({
      name:   sym.name,
      symbol: sym.symbol,
      price:  `${sym.prefix}${fmt(price)}`,
      change: `${sign}${Math.round(change).toLocaleString('en-IN')}`,
      pct:    `${change >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`,
      up:     change >= 0,
    })
  }

  return results
}

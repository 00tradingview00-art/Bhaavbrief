interface YQuote {
  price: number
  pct:   number
}

async function fetchSymbol(symbol: string): Promise<YQuote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta) return null
    const price = meta.regularMarketPrice ?? 0
    const prev  = meta.previousClose ?? meta.chartPreviousClose ?? price
    const pct   = prev ? ((price - prev) / prev) * 100 : 0
    return { price, pct }
  } catch {
    return null
  }
}

const SYMBOLS = [
  'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'HG=F', 'NG=F',
  'USDINR=X', 'DX-Y.NYB', '^TNX', '^BSESN', '^NSEI',
]

export async function getPrices(): Promise<Record<string, unknown>> {
  const results = await Promise.all(SYMBOLS.map(s => fetchSymbol(s)))
  const q: Record<string, YQuote> = {}
  SYMBOLS.forEach((s, i) => { if (results[i]) q[s] = results[i]! })

  if (Object.keys(q).length === 0) return {}

  const usdinr    = q['USDINR=X']?.price  || 84
  const usdinrPct = q['USDINR=X']?.pct    || 0

  const comexGold = q['GC=F']?.price || 0
  const goldPct   = q['GC=F']?.pct   || 0

  const comexSilver = q['SI=F']?.price || 0
  const silverPct   = q['SI=F']?.pct   || 0

  const wti      = q['CL=F']?.price || 0
  const crudePct = q['CL=F']?.pct   || 0

  const brent    = q['BZ=F']?.price || 0
  const brentPct = q['BZ=F']?.pct   || 0

  const comexCopper = q['HG=F']?.price || 0  // USD/lb
  const copperPct   = q['HG=F']?.pct   || 0

  const henryHub = q['NG=F']?.price || 0
  const gasPct   = q['NG=F']?.pct   || 0


  const dxy    = q['DX-Y.NYB']?.price || 0
  const dxyPct = q['DX-Y.NYB']?.pct  || 0

  const treasury10y = q['^TNX']?.price || 0

  const sensex    = q['^BSESN']?.price || 0
  const sensexPct = q['^BSESN']?.pct  || 0

  const nifty    = q['^NSEI']?.price || 0
  const niftyPct = q['^NSEI']?.pct   || 0

  // MCX derived
  const mcxGold   = comexGold   > 0 ? (comexGold   / 31.1035) * 10   * usdinr * 1.132 : 0
  const mcxSilver = comexSilver > 0 ? (comexSilver / 31.1035) * 1000 * usdinr * 1.157 : 0
  const mcxCrude  = wti         > 0 ? wti          * usdinr   * 1.02               : 0
  const mcxCopper = comexCopper > 0 ? comexCopper  * 2.20462  * usdinr * 1.05      : 0
  const mcxNatGas = henryHub    > 0 ? henryHub     * usdinr                        : 0

  // LME Copper approximation (COMEX USD/lb → USD/MT)
  const lmeCopper = comexCopper > 0 ? comexCopper * 2204.62 : 0

  return {
    // Nested commodity objects — used by PriceCards and PricesTable
    gold:      { mcx: mcxGold,   mcxChangePct: goldPct,   comex: comexGold,   comexChangePct: goldPct   },
    silver:    { mcx: mcxSilver, mcxChangePct: silverPct, comex: comexSilver, comexChangePct: silverPct },
    crude:     { mcx: mcxCrude,  mcxChangePct: crudePct,  wti, wtiChangePct: crudePct, brent, brentChangePct: brentPct },
    copper:    { mcx: mcxCopper, mcxChangePct: copperPct, lme: lmeCopper, lmeChangePct: copperPct },
    natgas:    { mcx: mcxNatGas, mcxChangePct: gasPct },
    aluminium: { lme: 0,          lmeChangePct: 0 },
    usdinr:    { spot: usdinr,   spotChangePct: usdinrPct },

    // Flat reference values — used by TickerStrip and RefPanel
    comexGold,    goldComexPct:   goldPct,
    comexSilver,  silverComexPct: silverPct,
    wti,          crudePct,
    brent,        brentPct,
    comexCopper,  copperComexPct: copperPct,
    henryHub,     gasPct,
    dxy,          dxyPct,
    treasury10y,
    sensex,       sensexPct,
    nifty,        niftyPct,

    updatedAt: new Date().toISOString(),
    source: 'Yahoo Finance',
  }
}

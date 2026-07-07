import { KiteClient }   from '@/lib/kite'
import { black76, calculateIV, calculateMaxPain } from '@/lib/black76'
import { computeIVIX, computeAAV }                from '@/lib/vix'

const RISK_FREE_RATE = 0.065

export const MCX_INSTRUMENTS: Record<string, { label: string; unit: string; lotSize: number }> = {
  GOLD:        { label: 'Gold',         unit: '10g',     lotSize: 100  },
  SILVER:      { label: 'Silver',       unit: '1kg',     lotSize: 30   },
  CRUDEOIL:    { label: 'Crude Oil',    unit: 'bbl',     lotSize: 100  },
  NATURALGAS:  { label: 'Natural Gas',  unit: 'mmBtu',   lotSize: 1250 },
  COPPER:      { label: 'Copper',       unit: 'kg',      lotSize: 2500 },
}

export function isMCXMarketOpen(): boolean {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const mins = ist.getHours() * 60 + ist.getMinutes()
  if (ist.getDay() === 0) return false
  return mins >= 9 * 60 && mins < 23 * 60 + 30
}

export async function getOptionsChain(instrument: string, requestedExpiry: string | null = null) {
  if (!MCX_INSTRUMENTS[instrument]) {
    throw new Error(`Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}`)
  }
  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    throw new Error('Kite credentials not configured')
  }

  const kc = new KiteClient(process.env.KITE_API_KEY, process.env.KITE_ACCESS_TOKEN)

  // Fetch all MCX instruments (FUT + CE + PE)
  const allInstruments = await kc.getFullMCXInstruments()

  // Filter options for this instrument
  const allOptions = allInstruments.filter(
    i => i.name.toUpperCase() === instrument && (i.instrument_type === 'CE' || i.instrument_type === 'PE'),
  )
  const expiries = [...new Set(allOptions.map(i => i.expiry))].sort()
  if (!expiries.length) {
    throw new Error(`No options found for ${instrument}`)
  }

  const activeExpiry  = requestedExpiry ?? expiries[0]
  const activeOptions = allOptions.filter(i => i.expiry === activeExpiry)

  // Nearest future
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const nearFut = allInstruments
    .filter(i => i.name.toUpperCase() === instrument && i.instrument_type === 'FUT' && new Date(i.expiry) >= today)
    .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())[0]

  // Fetch quotes (future + active-expiry options, up to 500)
  const optionTokens = activeOptions.map(i => i.instrument_token)
  const allTokens    = nearFut ? [nearFut.instrument_token, ...optionTokens] : optionTokens
  const quotes       = await kc.getQuotes(allTokens.slice(0, 500))

  const futurePrice = nearFut ? (quotes[String(nearFut.instrument_token)]?.last_price ?? 0) : 0

  // Time to expiry in years
  const T = Math.max(
    (new Date(activeExpiry).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000),
    1 / 365,
  )

  // Build chain rows grouped by strike
  const strikeMap: Record<number, { CE?: typeof activeOptions[0]; PE?: typeof activeOptions[0] }> = {}
  activeOptions.forEach(opt => {
    const k = opt.strike
    if (!strikeMap[k]) strikeMap[k] = {}
    strikeMap[k][opt.instrument_type as 'CE' | 'PE'] = opt
  })

  const chain = Object.entries(strikeMap)
    .map(([strikeStr, opts]) => {
      const strike = parseFloat(strikeStr)
      const ceOpt  = opts['CE']
      const peOpt  = opts['PE']
      const ceQ    = ceOpt ? quotes[String(ceOpt.instrument_token)] : null
      const peQ    = peOpt ? quotes[String(peOpt.instrument_token)] : null
      const ceLTP  = ceQ?.last_price ?? 0
      const peLTP  = peQ?.last_price ?? 0

      const ceIV = ceLTP > 0 ? calculateIV(ceLTP, futurePrice, strike, T, RISK_FREE_RATE, 'CE') : 0
      const peIV = peLTP > 0 ? calculateIV(peLTP, futurePrice, strike, T, RISK_FREE_RATE, 'PE') : 0
      const ceGreeks = ceIV > 0 ? black76(futurePrice, strike, T, RISK_FREE_RATE, ceIV, 'CE') : {}
      const peGreeks = peIV > 0 ? black76(futurePrice, strike, T, RISK_FREE_RATE, peIV, 'PE') : {}

      const distFromATM = futurePrice > 0 ? Math.abs(strike - futurePrice) / futurePrice : 1

      return {
        strike,
        isATM:    distFromATM < 0.005,
        isITM_CE: strike < futurePrice,
        isITM_PE: strike > futurePrice,
        CE: {
          symbol:   ceOpt?.tradingsymbol ?? null,
          ltp:      ceLTP,
          absChng:  ceQ ? parseFloat((ceLTP - (ceQ.ohlc?.close ?? ceLTP)).toFixed(2)) : 0,
          oi:       ceQ?.oi ?? 0,
          oiChange: ceQ ? (ceQ.oi - (ceQ.oi_day_low ?? ceQ.oi)) : 0,
          volume:   ceQ?.volume ?? 0,
          iv:       ceIV > 0 ? parseFloat((ceIV * 100).toFixed(2)) : null,
          delta:    (ceGreeks as any).delta ?? null,
          gamma:    (ceGreeks as any).gamma ?? null,
          theta:    (ceGreeks as any).theta ?? null,
          vega:     (ceGreeks as any).vega  ?? null,
        },
        PE: {
          symbol:   peOpt?.tradingsymbol ?? null,
          ltp:      peLTP,
          absChng:  peQ ? parseFloat((peLTP - (peQ.ohlc?.close ?? peLTP)).toFixed(2)) : 0,
          oi:       peQ?.oi ?? 0,
          oiChange: peQ ? (peQ.oi - (peQ.oi_day_low ?? peQ.oi)) : 0,
          volume:   peQ?.volume ?? 0,
          iv:       peIV > 0 ? parseFloat((peIV * 100).toFixed(2)) : null,
          delta:    (peGreeks as any).delta ?? null,
          gamma:    (peGreeks as any).gamma ?? null,
          theta:    (peGreeks as any).theta ?? null,
          vega:     (peGreeks as any).vega  ?? null,
        },
      }
    })
    .sort((a, b) => a.strike - b.strike)

  // Analytics
  const totalCEOI = chain.reduce((s, r) => s + r.CE.oi, 0)
  const totalPEOI = chain.reduce((s, r) => s + r.PE.oi, 0)
  const maxPain   = calculateMaxPain(chain)
  const pcr       = totalCEOI > 0 ? parseFloat((totalPEOI / totalCEOI).toFixed(3)) : 0
  const ivix      = computeIVIX(chain, futurePrice, T, RISK_FREE_RATE)

  // AAV — fetch 75 calendar days of daily closes
  let aav: ReturnType<typeof computeAAV> = { '5d': null, '10d': null, '20d': null, '40d': null, '60d': null }
  if (nearFut) {
    try {
      const toDate   = new Date(); toDate.setDate(toDate.getDate() - 1)
      const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 75)
      const fmt = (d: Date) => d.toISOString().slice(0, 10)
      const hist = await kc.getHistorical(nearFut.instrument_token, 'day', fmt(fromDate), fmt(toDate))
      if (hist.length >= 6) aav = computeAAV(hist.map(h => h.price))
    } catch { /* non-fatal */ }
  }

  const volPremium = ivix != null && aav['20d'] != null
    ? parseFloat((ivix - aav['20d']).toFixed(2))
    : null

  return {
    instrument,
    meta:        MCX_INSTRUMENTS[instrument],
    expiry:      activeExpiry,
    expiries,
    futurePrice,
    maxPain,
    pcr,
    ivix,
    aav,
    volPremium,
    marketOpen:  isMCXMarketOpen(),
    chain,
    lastUpdated: new Date().toISOString(),
  }
}

import { KiteClient, getFullMCXInstrumentsCached } from '@/lib/kite'
import { black76, calculateIV, calculateMaxPain, type Greeks } from '@/lib/black76'
import { computeIVIX, computeAAV }                from '@/lib/vix'

// Code-review follow-up: these were all bare constants requiring a code
// review + deploy to adjust, even though they're tuning knobs calibrated
// against one live spot-check (2026-07-17), not facts about the world.
// Env-overridable with the same defaults, so a threshold can be loosened at
// 9:05 AM without a hotfix deploy.
function envNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

// Single source of truth for the risk-free rate — read by the chain response
// below so the UI (components/mcx/OptionChain.tsx) can display the same value
// instead of an independently hardcoded string that can drift out of sync.
// TODO: replace with a daily-fetched 91-day T-bill / MIBOR rate (D-11); this
// constant is a dated, disclosed fallback in the meantime, not a silent one.
const RISK_FREE_RATE = envNumber('OPTIONS_RISK_FREE_RATE', 0.065)
const RISK_FREE_RATE_ASOF = process.env.OPTIONS_RISK_FREE_RATE_ASOF ?? '2026-08'

// ── Quote quality tiering (D-06) ────────────────────────────────────────────
// Verified live 2026-07-17 against the real GOLD chain: zero-OI/zero-volume
// strikes carry stale LTPs that violate Black-76 no-arbitrage bounds (e.g.
// strike 143500 PE priced BELOW its own intrinsic value) and get solved into
// garbage IVs (0.1% floor, 100%+ readings) with zero filtering today. Genuine
// liquid strikes (OI>0, traded today, tight bid-ask) show sane, matched IVs.
const SPREAD_LIVE_MAX_RATIO = envNumber('OPTIONS_SPREAD_LIVE_MAX_RATIO', 0.15)  // LIVE requires spread <= 15% of mid
const SPREAD_JUNK_MAX_RATIO = envNumber('OPTIONS_SPREAD_JUNK_MAX_RATIO', 0.40)  // spread > 40% of mid is JUNK regardless of liquidity
const IV_PARITY_TOLERANCE_VOL_PTS = envNumber('OPTIONS_IV_PARITY_TOLERANCE_VOL_PTS', 5)  // CE/PE IV mismatch beyond this at the same strike demotes both

export type Tier = 'LIVE' | 'STALE' | 'JUNK'

// Exported for lib/options.test.ts — this is the financially-consequential
// no-arbitrage/liquidity filter (D-06), it should not be tested only by
// manual live-data spot-checks that don't survive the next refactor.
export function classifyQuote(
  ltp: number, oi: number, volume: number,
  bid: number | null, ask: number | null,
  intrinsic: number, upperBound: number,
): { tier: Tier; validForSolve: boolean } {
  // Code-review finding: NaN/non-finite comparisons are always false in JS
  // (`NaN <= 0`, `NaN < x` both evaluate false), so a malformed upstream Kite
  // value would silently skip every check below instead of being caught by
  // them — reject it explicitly, up front, before it can slip through.
  if (!Number.isFinite(ltp) || !Number.isFinite(oi) || !Number.isFinite(volume)) {
    return { tier: 'JUNK', validForSolve: false }
  }

  // No-arbitrage bound violation — never feed to the solver regardless of
  // liquidity; this is the source of the 0.1%/66%+ IV readings today.
  const tolerance = Math.max(intrinsic, upperBound, 1) * 0.001
  if (ltp <= 0 || ltp < intrinsic - tolerance || ltp > upperBound + tolerance) {
    return { tier: 'JUNK', validForSolve: false }
  }

  const hasTwoSidedQuote =
    bid != null && ask != null && Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0
  const tradedToday = oi > 0 && volume > 0

  if (!hasTwoSidedQuote) {
    // No live market at all — the LTP may be a leftover print from whenever
    // this contract last traded, not a current tradeable price. Some open
    // interest with no current quote is still worth showing as STALE; truly
    // dead strikes (no OI, no volume, no quote) are JUNK.
    return tradedToday || oi > 0
      ? { tier: 'STALE', validForSolve: true }
      : { tier: 'JUNK', validForSolve: false }
  }

  // A crossed market (ask < bid) is a data-quality fault in its own right —
  // Kite depth-data glitches can produce one — and must be caught explicitly:
  // a negative (ask-bid) makes the spread-ratio check below pass trivially
  // (a negative number is never > SPREAD_JUNK_MAX_RATIO), so without this it
  // would sail through as if it were a suspiciously tight spread.
  if (ask < bid) {
    return { tier: 'JUNK', validForSolve: false }
  }

  const mid = (bid + ask) / 2
  const spreadRatio = mid > 0 ? (ask - bid) / mid : Infinity
  if (spreadRatio > SPREAD_JUNK_MAX_RATIO) {
    return { tier: 'JUNK', validForSolve: false }
  }

  if (tradedToday && spreadRatio <= SPREAD_LIVE_MAX_RATIO) {
    return { tier: 'LIVE', validForSolve: true }
  }

  return { tier: 'STALE', validForSolve: true }
}

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

  // Fetch all MCX instruments (FUT + CE + PE) — cached, changes rarely intraday
  const allInstruments = await getFullMCXInstrumentsCached()

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

  const df = Math.exp(-RISK_FREE_RATE * T)

  const chain = Object.entries(strikeMap)
    .map(([strikeStr, opts]) => {
      const strike = parseFloat(strikeStr)
      const ceOpt  = opts['CE']
      const peOpt  = opts['PE']
      const ceQ    = ceOpt ? quotes[String(ceOpt.instrument_token)] : null
      const peQ    = peOpt ? quotes[String(peOpt.instrument_token)] : null
      const ceLTP  = ceQ?.last_price ?? 0
      const peLTP  = peQ?.last_price ?? 0
      const ceOI     = ceQ?.oi ?? 0
      const peOI     = peQ?.oi ?? 0
      const ceVolume = ceQ?.volume ?? 0
      const peVolume = peQ?.volume ?? 0
      const ceBid = ceQ?.depth?.buy?.[0]?.price  || null
      const ceAsk = ceQ?.depth?.sell?.[0]?.price || null
      const peBid = peQ?.depth?.buy?.[0]?.price  || null
      const peAsk = peQ?.depth?.sell?.[0]?.price || null

      // No-arbitrage bounds (D-06): max(0, discounted intrinsic) <= price <= discounted upper bound.
      const ceIntrinsic   = df * Math.max(futurePrice - strike, 0)
      const ceUpperBound  = df * futurePrice
      const peIntrinsic   = df * Math.max(strike - futurePrice, 0)
      const peUpperBound  = df * strike

      let ce = classifyQuote(ceLTP, ceOI, ceVolume, ceBid, ceAsk, ceIntrinsic, ceUpperBound)
      let pe = classifyQuote(peLTP, peOI, peVolume, peBid, peAsk, peIntrinsic, peUpperBound)

      const ceIV = ce.validForSolve && ceLTP > 0 ? calculateIV(ceLTP, futurePrice, strike, T, RISK_FREE_RATE, 'CE') : null
      const peIV = pe.validForSolve && peLTP > 0 ? calculateIV(peLTP, futurePrice, strike, T, RISK_FREE_RATE, 'PE') : null

      // Per-strike put-call parity check: two LIVE-tier quotes at the same
      // strike/expiry whose IVs diverge sharply mean one side's quote is off
      // even though it individually passed the liquidity/spread bar — demote
      // both rather than render one as trustworthy and the other not.
      if (ce.tier === 'LIVE' && pe.tier === 'LIVE' && ceIV !== null && peIV !== null && ceIV > 0 && peIV > 0) {
        const ivGapPts = Math.abs(ceIV - peIV) * 100
        if (ivGapPts > IV_PARITY_TOLERANCE_VOL_PTS) {
          ce = { ...ce, tier: 'STALE' }
          pe = { ...pe, tier: 'STALE' }
        }
      }

      const ceGreeks: Partial<Greeks> = ceIV !== null && ceIV > 0 ? black76(futurePrice, strike, T, RISK_FREE_RATE, ceIV, 'CE') : {}
      const peGreeks: Partial<Greeks> = peIV !== null && peIV > 0 ? black76(futurePrice, strike, T, RISK_FREE_RATE, peIV, 'PE') : {}

      return {
        strike,
        isATM:    false,  // set in post-pass below
        isITM_CE: strike < futurePrice,
        isITM_PE: strike > futurePrice,
        CE: {
          symbol:   ceOpt?.tradingsymbol ?? null,
          ltp:      ceLTP,
          absChng:  ceQ ? parseFloat((ceLTP - (ceQ.ohlc?.close ?? ceLTP)).toFixed(2)) : 0,
          oi:       ceOI,
          oiChange: ceQ ? (ceQ.oi - (ceQ.oi_day_low ?? ceQ.oi)) : 0,
          volume:   ceVolume,
          iv:       ceIV !== null && ceIV > 0 ? parseFloat((ceIV * 100).toFixed(2)) : null,
          bid:      ceBid,
          ask:      ceAsk,
          tier:     ce.tier,
          delta:    ceGreeks.delta ?? null,
          gamma:    ceGreeks.gamma ?? null,
          theta:    ceGreeks.theta ?? null,
          vega:     ceGreeks.vega  ?? null,
        },
        PE: {
          symbol:   peOpt?.tradingsymbol ?? null,
          ltp:      peLTP,
          absChng:  peQ ? parseFloat((peLTP - (peQ.ohlc?.close ?? peLTP)).toFixed(2)) : 0,
          oi:       peOI,
          oiChange: peQ ? (peQ.oi - (peQ.oi_day_low ?? peQ.oi)) : 0,
          volume:   peVolume,
          iv:       peIV !== null && peIV > 0 ? parseFloat((peIV * 100).toFixed(2)) : null,
          bid:      peBid,
          ask:      peAsk,
          tier:     pe.tier,
          delta:    peGreeks.delta ?? null,
          gamma:    peGreeks.gamma ?? null,
          theta:    peGreeks.theta ?? null,
          vega:     peGreeks.vega  ?? null,
        },
      }
    })
    .sort((a, b) => a.strike - b.strike)

  // Mark exactly one row as ATM: the one with minimum |strike − futurePrice|.
  // A percentage-band threshold (e.g. < 0.5%) fails for wide strike steps
  // (NATURALGAS ₹5 increments → max gap 0.95%, COPPER ₹10 → 0.56%) and can
  // mark zero or two rows. Minimum-distance always marks exactly one.
  if (futurePrice > 0 && chain.length > 0) {
    let minDist = Infinity, atmRowIdx = 0
    chain.forEach((row, i) => {
      const d = Math.abs(row.strike - futurePrice)
      if (d < minDist) { minDist = d; atmRowIdx = i }
    })
    chain.forEach((row, i) => { row.isATM = (i === atmRowIdx) })
  }

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
    riskFreeRate:      RISK_FREE_RATE,
    riskFreeRateAsOf:  RISK_FREE_RATE_ASOF,
    chain,
    lastUpdated: new Date().toISOString(),
  }
}

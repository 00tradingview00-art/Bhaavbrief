/**
 * GET /api/options?instrument=GOLD&expiry=2026-07-28
 *
 * Returns full MCX option chain with:
 * - Black-76 Greeks, live IV, Max Pain, PCR, OI bars
 * - MCX iVIX (India's OVX/GVZ/VXSLV equivalent — model-free implied vol index)
 * - MCX AAV (Annualized Actual Volatility) for 5/10/20/40/60-day windows
 * - Vol premium = iVIX − AAV(20d)
 *
 * Caching: option chain → Upstash 3-min TTL; historical closes → Upstash 1-hour TTL.
 */

import { NextResponse } from 'next/server'
import { KiteClient }   from '@/lib/kite'
import { black76, calculateIV, calculateMaxPain } from '@/lib/black76'
import { computeIVIX, computeAAV }                from '@/lib/vix'

const RISK_FREE_RATE = 0.065   // RBI repo rate

// ── Upstash Redis helpers ─────────────────────────────────────────────────────

async function rGet(key: string): Promise<string | null> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal:  AbortSignal.timeout(3000),
    })
    const d = await res.json()
    return d.result ?? null
  } catch { return null }
}

async function rSet(key: string, value: string, exSeconds: number): Promise<void> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/set/${encodeURIComponent(key)}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify([value, 'EX', exSeconds]),
      signal:  AbortSignal.timeout(3000),
    })
  } catch { /* non-fatal */ }
}

// ── Market hours ──────────────────────────────────────────────────────────────

function isMCXMarketOpen(): boolean {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const mins = ist.getHours() * 60 + ist.getMinutes()
  const day  = ist.getDay()
  if (day === 0) return false   // Sunday
  return mins >= 9 * 60 && mins < 23 * 60 + 30
}

// ── Supported instruments ─────────────────────────────────────────────────────

const MCX_INSTRUMENTS: Record<string, { label: string; unit: string; lotSize: number }> = {
  GOLD:        { label: 'Gold',         unit: '10g',     lotSize: 100  },
  SILVER:      { label: 'Silver',       unit: '1kg',     lotSize: 30   },
  CRUDEOIL:    { label: 'Crude Oil',    unit: 'bbl',     lotSize: 100  },
  NATURALGAS:  { label: 'Natural Gas',  unit: 'mmBtu',   lotSize: 1250 },
  COPPER:      { label: 'Copper',       unit: 'kg',      lotSize: 2500 },
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const instrument = searchParams.get('instrument')?.toUpperCase()
  const requestedExpiry = searchParams.get('expiry') ?? null

  if (!instrument || !MCX_INSTRUMENTS[instrument]) {
    return NextResponse.json(
      { error: `Invalid instrument. Valid: ${Object.keys(MCX_INSTRUMENTS).join(', ')}` },
      { status: 400 },
    )
  }

  const chainCacheKey = `options:${instrument}-${requestedExpiry ?? 'near'}`
  const cached = await rGet(chainCacheKey)
  if (cached) {
    return NextResponse.json({ ...JSON.parse(cached), fromCache: true })
  }

  if (!process.env.KITE_API_KEY || !process.env.KITE_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Kite credentials not configured' }, { status: 503 })
  }

  try {
    const kc = new KiteClient(process.env.KITE_API_KEY, process.env.KITE_ACCESS_TOKEN)

    // ── Instrument list — Upstash cached 30 min ───────────────────────────────
    const instCacheKey = 'options:instruments-full-v3'  // v3: strip CSV quoted fields
    let allInstruments: Awaited<ReturnType<KiteClient['getFullMCXInstruments']>>

    const instCached = await rGet(instCacheKey)
    if (instCached) {
      allInstruments = JSON.parse(instCached)
    } else {
      allInstruments = await kc.getFullMCXInstruments()
      await rSet(instCacheKey, JSON.stringify(allInstruments), 30 * 60)
    }

    // Filter options for this instrument
    const allOptions = allInstruments.filter(
      i => i.name.toUpperCase() === instrument && (i.instrument_type === 'CE' || i.instrument_type === 'PE'),
    )
    const expiries = [...new Set(allOptions.map(i => i.expiry))].sort()
    if (!expiries.length) {
      // Return diagnostic info so we can see what names/types are in the list
      const sampleNames = [...new Set(allInstruments.map(i => i.name))].slice(0, 20)
      const sampleTypes = [...new Set(allInstruments.map(i => i.instrument_type))]
      return NextResponse.json({
        error: `No options found for ${instrument}`,
        debug: { totalInstruments: allInstruments.length, sampleNames, sampleTypes },
      }, { status: 404 })
    }

    const activeExpiry   = requestedExpiry ?? expiries[0]
    const activeOptions  = allOptions.filter(i => i.expiry === activeExpiry)

    // Nearest future
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const nearFut = allInstruments
      .filter(i => i.name === instrument && i.instrument_type === 'FUT' && new Date(i.expiry) >= today)
      .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())[0]

    // ── Quotes ────────────────────────────────────────────────────────────────
    const optionTokens = activeOptions.map(i => i.instrument_token)
    const allTokens    = nearFut ? [nearFut.instrument_token, ...optionTokens] : optionTokens
    const quotes       = await kc.getQuotes(allTokens.slice(0, 500))

    const futurePrice = nearFut ? (quotes[String(nearFut.instrument_token)]?.last_price ?? 0) : 0

    // Time to expiry
    const expiryDate = new Date(activeExpiry)
    const now = new Date()
    const T   = Math.max((expiryDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000), 1 / 365)

    // Group by strike
    const strikeMap: Record<number, { CE?: typeof activeOptions[0]; PE?: typeof activeOptions[0] }> = {}
    activeOptions.forEach(opt => {
      const k = opt.strike
      if (!strikeMap[k]) strikeMap[k] = {}
      strikeMap[k][opt.instrument_type as 'CE' | 'PE'] = opt
    })

    // Build chain rows
    const chain = Object.entries(strikeMap)
      .map(([strikeStr, opts]) => {
        const strike = parseFloat(strikeStr)
        const ceOpt  = opts['CE']
        const peOpt  = opts['PE']
        const ceQ    = ceOpt ? quotes[String(ceOpt.instrument_token)] : null
        const peQ    = peOpt ? quotes[String(peOpt.instrument_token)] : null

        const ceLTP = ceQ?.last_price ?? 0
        const peLTP = peQ?.last_price ?? 0

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
    const maxPain  = calculateMaxPain(chain)
    const totalCEOI = chain.reduce((s, r) => s + r.CE.oi, 0)
    const totalPEOI = chain.reduce((s, r) => s + r.PE.oi, 0)
    const pcr = totalCEOI > 0 ? parseFloat((totalPEOI / totalCEOI).toFixed(3)) : 0

    // ── MCX iVIX ─────────────────────────────────────────────────────────────
    const ivix = computeIVIX(chain, futurePrice, T, RISK_FREE_RATE)

    // ── MCX AAV — Upstash cached 1 hour ──────────────────────────────────────
    let aav: ReturnType<typeof computeAAV> = { '5d': null, '10d': null, '20d': null, '40d': null, '60d': null }
    if (nearFut) {
      const aavCacheKey = `options:aav-${instrument}`
      const aavCached = await rGet(aavCacheKey)
      if (aavCached) {
        aav = JSON.parse(aavCached)
      } else {
        try {
          const toDate   = new Date(); toDate.setDate(toDate.getDate() - 1)
          const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 75)
          const fmt = (d: Date) => d.toISOString().slice(0, 10)
          const hist = await kc.getHistorical(nearFut.instrument_token, 'day', fmt(fromDate), fmt(toDate))
          if (hist.length >= 6) {
            const closes = hist.map(h => h.price)   // ascending date order
            aav = computeAAV(closes)
            await rSet(aavCacheKey, JSON.stringify(aav), 60 * 60)
          }
        } catch { /* AAV is optional — don't fail the whole request */ }
      }
    }

    const volPremium = ivix != null && aav['20d'] != null
      ? parseFloat((ivix - aav['20d']).toFixed(2))
      : null

    const payload = {
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
      fromCache:   false,
    }

    await rSet(chainCacheKey, JSON.stringify(payload), 3 * 60)
    return NextResponse.json(payload)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[MCX Options API]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

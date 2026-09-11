import { getOptionsChain, MCX_INSTRUMENTS } from './options'

// The 5 "core" MCX commodities the Terminal treats as first-class — deliberately
// excludes the *M (mini) contracts in MCX_INSTRUMENTS, which are the same
// underlying commodity at a smaller lot size, not a distinct market to show
// a second time in a 5-card grid.
export const CORE_INSTRUMENTS = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER'] as const
export type CoreInstrument = typeof CORE_INSTRUMENTS[number]

// Slugs/colors mirror app/commodities/[commodity]/page.tsx's and
// app/options/[commodity]/page.tsx's own SLUG_MAPs exactly — not re-derived,
// so a Terminal card links to the same URL and reads the same color as the
// rest of the site for the same commodity. priceKey indexes into PriceData
// (lib/prices.ts) / snapshotToPriceData()'s output; historyField indexes
// into lib/history.ts's getSparklineCloses().
export const GATEWAY_META: Record<CoreInstrument, {
  slug: string; label: string; symbol: string; color: string; unit: string
  priceKey: 'gold' | 'silver' | 'crude' | 'copper' | 'natgas'
  historyField: 'gold' | 'silver' | 'crude' | 'copper' | 'natgas'
}> = {
  GOLD:       { slug: 'gold',       label: 'Gold',        symbol: 'GOLD',       color: '#B45309', unit: '/10g',   priceKey: 'gold',   historyField: 'gold' },
  SILVER:     { slug: 'silver',     label: 'Silver',      symbol: 'SILVER',     color: '#2B4FC7', unit: '/kg',    priceKey: 'silver', historyField: 'silver' },
  CRUDEOIL:   { slug: 'crude-oil',  label: 'Crude Oil',   symbol: 'CRUDEOIL',   color: '#7C3AED', unit: '/bbl',   priceKey: 'crude',  historyField: 'crude' },
  NATURALGAS: { slug: 'natural-gas',label: 'Natural Gas', symbol: 'NATURALGAS', color: '#D97706', unit: '/mmBtu', priceKey: 'natgas', historyField: 'natgas' },
  COPPER:     { slug: 'copper',     label: 'Copper',      symbol: 'COPPER',     color: '#065F46', unit: '/kg',    priceKey: 'copper', historyField: 'copper' },
}

export interface TerminalInstrumentData {
  instrument:  CoreInstrument
  label:       string
  unit:        string
  futurePrice: number
  maxPain:     number | null
  pcr:         number | null
  ivix:        number | null
  aav:         { '5d': number | null; '10d': number | null; '20d': number | null; '40d': number | null; '60d': number | null }
  volPremium:  number | null
  // Sum of each strike's CE+PE oiChange (oi vs. that strike's day low — see
  // lib/options.ts's oi_day_low field) across the chain. This is an
  // INTRADAY figure, not a day-over-day change — label it as "vs day low",
  // never as a plain "OI Δ", which would imply the latter.
  oiVsDayLow:  number | null
  marketOpen:  boolean
  expiries:    string[]
}

// Shared fetch for every Terminal module that needs per-instrument options
// data (gateway cards, Options Intelligence, Market Pulse's composite iVIX).
// getOptionsChain() is React cache()-deduped per render, so calling it again
// from a second module in the same page render is free, not a second
// round-trip — this function exists to have ONE typed, pre-shaped result
// object rather than every module re-deriving pcr/ivix/maxPain itself.
// Returns null for an instrument whose live fetch failed (bad Kite auth, no
// options for that expiry, etc.) — callers must render that as "unavailable",
// never substitute a zero or a stale-looking value.
export async function getTerminalData(): Promise<Record<CoreInstrument, TerminalInstrumentData | null>> {
  const entries = await Promise.all(
    CORE_INSTRUMENTS.map(async (instrument): Promise<[CoreInstrument, TerminalInstrumentData | null]> => {
      try {
        const chain = await getOptionsChain(instrument)
        const oiVsDayLow = chain.chain.reduce(
          (sum, row) => sum + (row.CE?.oiChange ?? 0) + (row.PE?.oiChange ?? 0),
          0,
        )
        return [instrument, {
          instrument,
          label:       MCX_INSTRUMENTS[instrument].label,
          unit:        MCX_INSTRUMENTS[instrument].unit,
          futurePrice: chain.futurePrice,
          maxPain:     chain.maxPain,
          pcr:         chain.pcr,
          ivix:        chain.ivix,
          aav:         chain.aav,
          volPremium:  chain.volPremium,
          oiVsDayLow,
          marketOpen:  chain.marketOpen,
          expiries:    chain.expiries,
        }]
      } catch {
        return [instrument, null]
      }
    }),
  )
  return Object.fromEntries(entries) as Record<CoreInstrument, TerminalInstrumentData | null>
}

export interface TermStructurePoint {
  expiry: string
  ivix:   number | null
}

// Near/next/far iVIX per instrument, for the term-structure chart. A single
// getOptionsChain(instrument) call only returns the NEAREST expiry's chain —
// expiries[] is just the list of what's available — so getting 3 points per
// instrument genuinely needs 3 separate calls with an explicit
// requestedExpiry each (verified against lib/options.ts directly, not
// assumed). getOptionsChain() is cache()-deduped per render but keyed on
// (instrument, requestedExpiry), so these don't reuse getTerminalData()'s
// default-expiry calls — this is real, additional fetch volume, not free.
export async function getTermStructureData(): Promise<Record<CoreInstrument, TermStructurePoint[]>> {
  const entries = await Promise.all(
    CORE_INSTRUMENTS.map(async (instrument): Promise<[CoreInstrument, TermStructurePoint[]]> => {
      try {
        const nearest = await getOptionsChain(instrument)
        const expiries = nearest.expiries.slice(0, 3)
        const points = await Promise.all(
          expiries.map(async (expiry): Promise<TermStructurePoint> => {
            try {
              const chain = expiry === nearest.expiry ? nearest : await getOptionsChain(instrument, expiry)
              return { expiry, ivix: chain.ivix }
            } catch {
              return { expiry, ivix: null }
            }
          }),
        )
        return [instrument, points]
      } catch {
        return [instrument, []]
      }
    }),
  )
  return Object.fromEntries(entries) as Record<CoreInstrument, TermStructurePoint[]>
}

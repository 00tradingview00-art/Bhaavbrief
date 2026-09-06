import type { Metadata } from 'next'
import fs from 'fs'
import path from 'path'
import StrategyBuilder from '@/components/mcx/StrategyBuilder'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MCX Options Strategy Builder — BhaavBrief',
  description: 'Build and analyse multi-leg MCX commodity options strategies with live payoff diagrams and IV regime signals.',
  keywords: [
    'MCX options strategy India',
    'MCX bull call spread',
    'MCX straddle strangle',
    'MCX options payoff calculator',
    'MCX options strategy builder India',
    'MCX commodity options hedging',
    'MCX covered call India',
    'MCX options multi-leg strategy',
    'MCX gold silver crude options strategy',
  ],
}

const VALID_INSTRUMENTS = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER']

// StrategyBuilder's instrument codes → data/market-structure.json's key scheme
const MARGIN_KEY_MAP: Record<string, string> = {
  GOLD: 'gold', SILVER: 'silver', CRUDEOIL: 'crude', NATURALGAS: 'natgas', COPPER: 'copper',
}

function loadMarginByInstrument(): Record<string, string | null> {
  const file = path.join(process.cwd(), 'data/market-structure.json')
  const marketStructure = JSON.parse(fs.readFileSync(file, 'utf8'))
  return Object.fromEntries(
    Object.entries(MARGIN_KEY_MAP).map(([code, key]) => [code, marketStructure[key]?.typicalMargin ?? null]),
  )
}

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ instrument?: string }>
}) {
  const { instrument } = await searchParams
  const defaultInstrument = VALID_INSTRUMENTS.includes(instrument?.toUpperCase() ?? '')
    ? instrument!.toUpperCase()
    : 'GOLD'
  const marginByInstrument = loadMarginByInstrument()
  const { userId } = await auth()
  const isPro = await isProUser(userId ?? null)
  // Keyed on defaultInstrument: StrategyBuilder seeds its `instrument` state
  // from this prop once (useState's initial-value pattern) and never re-syncs
  // it — a key forces a full remount (fully resetting internal state) if this
  // page's instance is ever reused across a ?instrument= change without a
  // remount happening on its own, rather than silently keeping stale legs/
  // chain data for the instrument the page loaded with.
  return <StrategyBuilder key={defaultInstrument} defaultInstrument={defaultInstrument} marginByInstrument={marginByInstrument} isPro={isPro} />
}

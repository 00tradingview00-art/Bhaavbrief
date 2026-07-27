import type { Metadata } from 'next'
import StrategyBuilder from '@/components/mcx/StrategyBuilder'

export const metadata: Metadata = {
  title: 'MCX Options Strategy Builder — BhaavBrief',
  description: 'Build and analyse multi-leg MCX commodity options strategies with live payoff diagrams and IV regime signals.',
}

const VALID_INSTRUMENTS = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER']

export default async function StrategyPage({
  searchParams,
}: {
  searchParams: Promise<{ instrument?: string }>
}) {
  const { instrument } = await searchParams
  const defaultInstrument = VALID_INSTRUMENTS.includes(instrument?.toUpperCase() ?? '')
    ? instrument!.toUpperCase()
    : 'GOLD'
  return <StrategyBuilder defaultInstrument={defaultInstrument} />
}

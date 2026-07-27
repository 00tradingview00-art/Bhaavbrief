import type { Metadata } from 'next'
import StrategyBuilder from '@/components/mcx/StrategyBuilder'

export const metadata: Metadata = {
  title: 'MCX Options Strategy Builder — BhaavBrief',
  description: 'Build and analyse multi-leg MCX commodity options strategies with live payoff diagrams and IV regime signals.',
}

export default function StrategyPage() {
  return <StrategyBuilder />
}

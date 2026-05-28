import fs from 'node:fs'
import path from 'node:path'
import LearnPage from '@/components/LearnPage'
import type { ContractSpecs } from '@/components/LearnPage'

export const metadata = {
  title: 'Learn MCX Trading — Lot Sizes, Margins, Rollover, Taxation',
  description: 'MCX commodity trading explained for Indian traders. Lot sizes, margin calculation, how to rollover futures, contango vs backwardation, NSE Gold vs MCX Gold, how jewellers hedge, and commodity taxation — all in one place.',
  keywords: [
    'MCX gold lot size 2026',
    'MCX crude oil contract size India',
    'how to rollover MCX futures contract',
    'contango backwardation MCX explained',
    'NSE gold futures vs MCX gold',
    'how jewellers hedge gold price India',
    'commodity hedging merchants India',
    'MCX silver mini lot size margin',
    'rupee dollar impact on MCX gold',
    'commodity trading margin calculation India',
    'MCX commodity expiry date',
    'MCX trading learn India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/learn' },
  openGraph: {
    title: 'Learn MCX Trading — Lot Sizes, Margins, Rollover, Taxation | BhaavBrief',
    description: 'MCX lot sizes, margin, rollover, contango, NSE vs MCX gold, merchant hedging, and commodity taxation — explained clearly for Indian traders.',
    url: 'https://bhaavbrief.in/learn',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'Learn MCX Trading | BhaavBrief', description: 'MCX lot sizes, margin, rollover, NSE vs MCX gold, merchant hedging and taxation — explained for Indian traders.', site: '@bhaavbrief' },
}

function loadContractSpecs(): ContractSpecs | null {
  try {
    const file = path.join(process.cwd(), 'data/contract-specs.json')
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

export default function Page() {
  const specs = loadContractSpecs()
  return <LearnPage specs={specs} />
}

import fs from 'node:fs'
import path from 'node:path'
import LearnPage from '@/components/LearnPage'
import type { ContractSpecs } from '@/components/LearnPage'

export const metadata = {
  title: 'Learn MCX Trading — Futures, Margins, Taxation Explained',
  description: 'Learn MCX commodity trading from scratch. Futures contracts, lot sizes, margin and leverage, contango, Gold ETF vs MCX Gold, commodity taxation in India — explained clearly.',
  alternates: { canonical: 'https://bhaavbrief.in/learn' },
  openGraph: {
    title: 'Learn MCX Trading — Futures, Margins, Taxation | BhaavBrief',
    description: 'MCX commodity trading explained — futures, lot sizes, leverage, taxation, Gold ETF vs MCX Gold. Free educational resource for Indian traders.',
    url: 'https://bhaavbrief.in/learn',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'Learn MCX Trading | BhaavBrief', description: 'MCX futures, margins, taxation and more — explained for Indian traders.', site: '@bhaavbrief' },
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

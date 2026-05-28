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

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is MCX and how does it work?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX (Multi Commodity Exchange of India) is India\'s largest commodity derivatives exchange, regulated by SEBI. It lets traders buy and sell standardised futures contracts on commodities like gold, silver, crude oil, copper and natural gas. You pay a small margin (5–10% of contract value) to control the full contract, and profits/losses are settled daily via mark-to-market.' },
    },
    {
      '@type': 'Question',
      name: 'What is the MCX Gold lot size in 2026?',
      acceptedAnswer: { '@type': 'Answer', text: 'The MCX Gold standard contract lot size is 1 kg (1,000 grams), quoted in ₹ per 10 grams. There is also a Gold Mini contract with a 100g lot size, which requires significantly lower margin (approximately ₹55,000–₹75,000) and is more accessible for retail traders.' },
    },
    {
      '@type': 'Question',
      name: 'How do you rollover an MCX futures contract?',
      acceptedAnswer: { '@type': 'Answer', text: 'To rollover an MCX futures contract, you sell your current near-month position and simultaneously buy the next month\'s contract before the expiry date. The price difference between the two months is the roll cost (in contango) or roll benefit (in backwardation). For MCX Crude, roll cost is typically ₹1,000–₹3,000 per lot.' },
    },
    {
      '@type': 'Question',
      name: 'What is contango and backwardation in MCX?',
      acceptedAnswer: { '@type': 'Answer', text: 'Contango is when the far-month futures price is higher than the near-month price — the normal state for most commodities due to storage and financing costs. Backwardation is when the near-month price is higher than far-month, signalling tight immediate supply. In contango, rolling positions costs money each month; in backwardation, rolling earns money.' },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between NSE Gold Futures and MCX Gold?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold has ~98% market share, deeper liquidity, tighter spreads, and trades until 11:30 PM IST (capturing US market moves). NSE Gold Futures launched in 2026 with lower margin requirements and work with existing equity demat accounts, but are in early-stage liquidity. Most active traders should use MCX Gold; NSE Gold suits traders who already have an equity account and trade only during day hours.' },
    },
    {
      '@type': 'Question',
      name: 'Why does MCX gold price change when the rupee weakens?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX gold is priced in Indian rupees but tracks COMEX gold (priced in US dollars). When the rupee weakens against the dollar, it takes more rupees to buy the same amount of gold — so MCX gold rises even if the international price is flat. A 2% rupee depreciation alone can add ₹2,000–₹2,500 per 10g to MCX gold.' },
    },
    {
      '@type': 'Question',
      name: 'How do jewellers hedge gold price risk in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'Jewellers hedge by buying MCX Gold futures when they receive a customer order, locking in today\'s price. When they buy physical gold 30–45 days later at the prevailing (higher) price, they simultaneously sell the futures. The profit on the futures position offsets the higher physical purchase cost, protecting their margin.' },
    },
    {
      '@type': 'Question',
      name: 'How is commodity trading taxed in India?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX commodity futures profits are taxed as non-speculative business income at your applicable income slab rate — there is no LTCG benefit. Losses can be carried forward for 8 years. CTT (Commodity Transaction Tax) of 0.01% applies on the sell side for non-agricultural commodities and is deductible as a business expense. You must file ITR-3.' },
    },
    {
      '@type': 'Question',
      name: 'MCX Gold or Gold ETF — which is better?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX Gold is for active trading with ~16x leverage, monthly expiry management, and no SIP option. Gold ETF is for long-term wealth accumulation with no leverage, no expiry, SIP from ₹500/month, and 12.5% LTCG tax after 12 months. For most retail investors without daily monitoring capacity, Gold ETF or Gold FoF is more suitable. MCX Gold suits dedicated traders with risk capital.' },
    },
  ],
}

export default function Page() {
  const specs = loadContractSpecs()
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <LearnPage specs={specs} />
    </>
  )
}

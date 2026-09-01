import type { Metadata } from 'next'
import PLCalculatorClient from './PLCalculatorClient'
import { safeJsonLd } from '@/lib/seo'

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'MCX P&L Calculator',
      url: 'https://bhaavbrief.in/tools/mcx-pl-calculator',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any (web browser)',
      description: 'Instant MCX futures P&L calculator — enter commodity, lot count, buy price, and sell price to get exact profit or loss in INR including lot size and tick value.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      provider: { '@id': 'https://bhaavbrief.in/#organization' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://bhaavbrief.in/tools' },
        { '@type': 'ListItem', position: 3, name: 'MCX P&L Calculator' },
      ],
    },
  ],
}

export const revalidate = false

export const metadata: Metadata = {
  title:       'MCX P&L Calculator — BhaavBrief',
  description: 'Instant MCX futures P&L calculator. Enter commodity, lot count, buy price, and sell price to get exact profit or loss in INR including lot size and tick value.',
  keywords:    [
    'MCX P&L calculator India', 'MCX futures profit loss calculator',
    'MCX gold lot P&L', 'MCX crude oil P&L calculator India',
    'MCX tick value calculator', 'MCX lot size calculator India',
  ],
}

export default function MCXPLPage() {
  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Futures P&L Calculator
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        Enter your trade details to see exact profit or loss in INR.
      </p>
      <PLCalculatorClient />
    </main>
  )
}

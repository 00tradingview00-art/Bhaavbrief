import type { Metadata } from 'next'
import PLCalculatorClient from './PLCalculatorClient'

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

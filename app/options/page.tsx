import Link from 'next/link'
import OptionChain from '@/components/mcx/OptionChain'
import { getOptionsChain } from '@/lib/options'

export const revalidate = 60

export const metadata = {
  title: 'MCX Option Chain — Gold, Silver, Crude Oil, Copper',
  description: 'Live MCX option chain with Black-76 Greeks, IV surface, iVIX, Max Pain and PCR for Gold, Silver, Crude Oil, Natural Gas and Copper.',
  keywords: [
    'MCX option chain live',
    'MCX gold option chain',
    'MCX crude oil options',
    'MCX silver options India',
    'MCX implied volatility India',
    'MCX iVIX India',
    'Black-76 options MCX',
    'MCX max pain today',
    'MCX put call ratio',
    'commodity options India',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/options' },
  openGraph: {
    title: 'MCX Option Chain — Live Greeks, iVIX & Max Pain | BhaavBrief',
    description: 'Live MCX option chain: Black-76 Greeks, implied vol (iVIX), realized vol (AAV), Max Pain and PCR for Gold, Silver, Crude, NatGas, Copper.',
    url: 'https://bhaavbrief.in/options',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary' as const,
    title: 'MCX Option Chain | BhaavBrief',
    description: 'Live iVIX, Greeks, Max Pain and PCR for MCX Gold, Silver, Crude and more.',
    site: '@bhaavbrief',
  },
}

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'MCX Option Chain' },
  ],
}

const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Max Pain in MCX options?',
      acceptedAnswer: { '@type': 'Answer', text: 'Max Pain is the strike price at which option writers (sellers) collectively lose the least money at expiry, and option buyers as a group lose the most. It is calculated by finding the strike where total payout to all in-the-money Call and Put holders is minimized. Traders watch it because MCX prices often gravitate toward the Max Pain strike as expiry approaches, though it is not a guarantee.' },
    },
    {
      '@type': 'Question',
      name: 'What is iVIX and how is it different from AAV?',
      acceptedAnswer: { '@type': 'Answer', text: 'iVIX is the implied volatility the options market is currently pricing in, derived from live MCX option premiums using the Black-76 model. AAV (Annualized Actual Volatility) is the realized volatility computed from historical price closes over trailing windows (5, 10, 20, 40, 60 days). Comparing iVIX to 20-day AAV shows the volatility premium — whether options are pricing in more or less movement than has actually occurred recently.' },
    },
    {
      '@type': 'Question',
      name: 'What does PCR (Put-Call Ratio) tell you?',
      acceptedAnswer: { '@type': 'Answer', text: 'PCR is total Put open interest divided by total Call open interest for an expiry. A PCR above 1.2 (more Put OI than Call OI) is conventionally read as bullish positioning; below 0.8 (more Call OI) as bearish. Extreme readings are sometimes treated as a contrarian indicator near market turning points.' },
    },
    {
      '@type': 'Question',
      name: 'Why use the Black-76 model instead of Black-Scholes for MCX options?',
      acceptedAnswer: { '@type': 'Answer', text: 'MCX options are options on futures contracts, not on spot. Black-76 (the Black model) prices options directly off the futures price and is the standard for commodity and futures options worldwide, whereas Black-Scholes assumes an option on a spot asset with a continuous dividend/cost-of-carry adjustment. Using Black-76 gives more accurate implied volatility and Greeks for MCX Gold, Silver, Crude Oil and other futures-based options.' },
    },
  ],
}

export default async function OptionsPage() {
  const initialData = await getOptionsChain('GOLD').catch(() => null)

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          MCX Option Chain
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
          Live Greeks · iVIX · AAV · Max Pain · PCR — Black-76 model
        </p>
      </div>

      {initialData && (
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '-12px 0 20px', lineHeight: 1.7 }}>
          As of {new Date(initialData.lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST, MCX Gold Max Pain sits at ₹{initialData.maxPain.toLocaleString('en-IN')} for the {initialData.expiry} expiry, with a Put-Call Ratio of {initialData.pcr}
          {initialData.ivix != null ? ` and implied volatility (iVIX) of ${initialData.ivix.toFixed(1)}%` : ''}. See the <Link href="/learn/mcx-margin-calculator" style={{ color: 'var(--gold)' }}>margin requirements</Link> and <Link href="/learn/mcx-rollover" style={{ color: 'var(--gold)' }}>rollover mechanics</Link> for the underlying futures contract.
        </p>
      )}

      <OptionChain isPro={true} initialData={initialData} />
    </div>
  )
}

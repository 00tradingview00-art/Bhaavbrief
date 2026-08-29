import Link from 'next/link'
import type { Metadata } from 'next'
import OptionChain from '@/components/mcx/OptionChain'
import StatisticalDisclaimer from '@/components/StatisticalDisclaimer'
import { getOptionsChain } from '@/lib/options'
import { safeJsonLd } from '@/lib/seo'
import { notFound } from 'next/navigation'

// NEAR_LIVE tier (config/revalidate.mjs) — matches the bare /options page this
// route splits out from; lib/options is a LIVE_DATA_IMPORT_MARKERS entry so
// this must stay a literal (see that file for why an import can't be used).
export const revalidate = 60

const BASE = 'https://bhaavbrief.in'

// Slugs match the /commodities/[commodity] convention used site-wide.
// Values are the instrument keys lib/options.ts's getOptionsChain() expects.
const SLUG_MAP: Record<string, string> = {
  'gold':         'GOLD',
  'silver':       'SILVER',
  'crude-oil':    'CRUDEOIL',
  'natural-gas':  'NATURALGAS',
  'copper':       'COPPER',
}

const COMMODITY_META: Record<string, { label: string; title: string; description: string; keywords: string[] }> = {
  gold: {
    label: 'Gold',
    title: 'MCX Gold Option Chain — Live Greeks, IV & Max Pain',
    description: 'Live MCX Gold option chain with Black-76 Greeks, implied volatility (iVIX), Max Pain and Put-Call Ratio. Real-time option data for Indian traders.',
    keywords: ['MCX gold option chain', 'MCX gold options India', 'MCX gold max pain today', 'MCX gold put call ratio', 'MCX gold implied volatility'],
  },
  silver: {
    label: 'Silver',
    title: 'MCX Silver Option Chain — Live Greeks, IV & Max Pain',
    description: 'Live MCX Silver option chain with Black-76 Greeks, implied volatility (iVIX), Max Pain and Put-Call Ratio. Real-time option data for Indian traders.',
    keywords: ['MCX silver option chain', 'MCX silver options India', 'MCX silver max pain today', 'MCX silver put call ratio'],
  },
  'crude-oil': {
    label: 'Crude Oil',
    title: 'MCX Crude Oil Option Chain — Live Greeks, IV & Max Pain',
    description: 'Live MCX Crude Oil option chain with Black-76 Greeks, implied volatility (iVIX), Max Pain and Put-Call Ratio. Real-time option data for Indian traders.',
    keywords: ['MCX crude oil option chain', 'MCX crude oil options', 'crude oil option chain', 'MCX crude oil max pain today'],
  },
  'natural-gas': {
    label: 'Natural Gas',
    title: 'MCX Natural Gas Option Chain — Live Greeks, IV & Max Pain',
    description: 'Live MCX Natural Gas option chain with Black-76 Greeks, implied volatility (iVIX), Max Pain and Put-Call Ratio. Real-time option data for Indian traders.',
    keywords: ['MCX natural gas option chain', 'MCX natural gas options', 'MCX natgas max pain today'],
  },
  copper: {
    label: 'Copper',
    title: 'MCX Copper Option Chain — Live Greeks, IV & Max Pain',
    description: 'Live MCX Copper option chain with Black-76 Greeks, implied volatility (iVIX), Max Pain and Put-Call Ratio. Real-time option data for Indian traders.',
    keywords: ['MCX copper option chain', 'MCX copper options', 'MCX copper max pain today'],
  },
}

const FAQ_ITEMS = [
  {
    q: 'What is Max Pain in MCX options?',
    a: 'Max Pain is the strike price at which option writers (sellers) collectively lose the least money at expiry, and option buyers as a group lose the most. It is calculated by finding the strike where total payout to all in-the-money Call and Put holders is minimized. Traders watch it because MCX prices often gravitate toward the Max Pain strike as expiry approaches, though it is not a guarantee.',
  },
  {
    q: 'What is iVIX and how is it different from AAV?',
    a: 'iVIX is the implied volatility the options market is currently pricing in, derived from live MCX option premiums using the Black-76 model. AAV (Annualized Actual Volatility) is the realized volatility computed from historical price closes over trailing windows (5, 10, 20, 40, 60 days). Comparing iVIX to 20-day AAV shows the volatility premium — whether options are pricing in more or less movement than has actually occurred recently.',
  },
  {
    q: 'What does PCR (Put-Call Ratio) tell you?',
    a: 'PCR is total Put open interest divided by total Call open interest for an expiry. A PCR above 1.2 (more Put OI than Call OI) is conventionally read as bullish positioning; below 0.8 (more Call OI) as bearish. Extreme readings are sometimes treated as a contrarian indicator near market turning points.',
  },
  {
    q: 'Why use the Black-76 model instead of Black-Scholes for MCX options?',
    a: 'MCX options are options on futures contracts, not on spot. Black-76 (the Black model) prices options directly off the futures price and is the standard for commodity and futures options worldwide, whereas Black-Scholes assumes an option on a spot asset with a continuous dividend/cost-of-carry adjustment. Using Black-76 gives more accurate implied volatility and Greeks for MCX Gold, Silver, Crude Oil and other futures-based options.',
  },
]

interface Props {
  params: Promise<{ commodity: string }>
}

export function generateStaticParams() {
  return Object.keys(SLUG_MAP).map(commodity => ({ commodity }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { commodity } = await params
  const meta = COMMODITY_META[commodity]
  if (!meta) return {}

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `${BASE}/options/${commodity}` },
    openGraph: {
      title: `${meta.title} | BhaavBrief`,
      description: meta.description,
      url: `${BASE}/options/${commodity}`,
      siteName: 'BhaavBrief',
      type: 'website',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary',
      title: `${meta.title} | BhaavBrief`,
      description: meta.description,
      site: '@bhaavbrief',
    },
  }
}

export default async function OptionsCommodityPage({ params }: Props) {
  const { commodity } = await params
  const instrument = SLUG_MAP[commodity]
  const meta = COMMODITY_META[commodity]
  if (!instrument || !meta) notFound()

  const initialData = await getOptionsChain(instrument).catch(() => null)

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'MCX Option Chain', item: `${BASE}/options` },
      { '@type': 'ListItem', position: 3, name: `MCX ${meta.label} Option Chain` },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `MCX ${meta.label} Option Chain`,
    url: `${BASE}/options/${commodity}`,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any (web browser)',
    description: meta.description,
    offers: [
    { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR', description: 'ATM row and summary statistics' },
    { '@type': 'Offer', name: 'Pro', price: '999', priceCurrency: 'INR', description: 'Full option chain, Greeks, Strategy Builder, IV analytics' },
  ],
    provider: { '@id': `${BASE}/#organization` },
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webAppSchema) }} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          MCX {meta.label} Option Chain
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
          Live Greeks · iVIX · AAV · Max Pain · PCR — Black-76 model
        </p>
      </div>

      {initialData && (
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '-12px 0 20px', lineHeight: 1.7 }}>
          As of {new Date(initialData.lastUpdated).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST, MCX {meta.label} Max Pain sits at ₹{initialData.maxPain.toLocaleString('en-IN')} for the {initialData.expiry} expiry, with a Put-Call Ratio of {initialData.pcr}
          {initialData.ivix != null ? ` and implied volatility (iVIX) of ${initialData.ivix.toFixed(1)}%` : ''}. See the <Link href="/learn/mcx-margin-calculator" style={{ color: 'var(--gold)' }}>margin requirements</Link> and <Link href="/learn/mcx-rollover" style={{ color: 'var(--gold)' }}>rollover mechanics</Link> for the underlying futures contract.
        </p>
      )}

      <StatisticalDisclaimer />

      <div style={{ marginBottom: 20 }}>
        <Link href={`/options/strategy?instrument=${instrument}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 6,
          background: 'var(--gold)', color: '#fff',
          fontSize: 13, fontWeight: 600, textDecoration: 'none',
        }}>
          Strategy Builder →
        </Link>
        <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--ink-3)' }}>
          Build multi-leg strategies · payoff diagrams
          {initialData?.ivix != null && (
            <> · {meta.label} iVIX <strong style={{ color: 'var(--ink)' }}>{initialData.ivix.toFixed(1)}%</strong></>
          )}
        </span>
      </div>

      <OptionChain isPro={false} initialData={initialData} />

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--ink)', margin: '0 0 12px' }}>
          Frequently Asked Questions
        </h2>
        {FAQ_ITEMS.map(item => (
          <details key={item.q} style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
            <summary style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
              {item.q}
            </summary>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.7, margin: '8px 0 0' }}>
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  )
}

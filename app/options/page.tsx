import OptionChain from '@/components/mcx/OptionChain'

export const metadata = {
  title: 'MCX Option Chain — Gold, Silver, Crude Oil, Copper | BhaavBrief',
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

export default function OptionsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
          MCX Option Chain
        </h1>
        <p style={{ fontSize: 15, color: 'var(--ink-3)', margin: 0 }}>
          Live Greeks · iVIX · AAV · Max Pain · PCR — Black-76 model
        </p>
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-4)', margin: '-12px 0 24px', lineHeight: 1.6 }}>
        BhaavBrief is not a SEBI-registered investment advisor. Option data is for informational purposes only. Nothing here constitutes a buy, sell, or hold recommendation.
      </p>
      <OptionChain isPro={true} />
    </div>
  )
}

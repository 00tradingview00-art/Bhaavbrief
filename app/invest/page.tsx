import InvestPage from '@/components/InvestPage'
import SectionTabs from '@/components/SectionTabs'
import { safeJsonLd } from '@/lib/seo'

const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
    { '@type': 'ListItem', position: 2, name: 'Invest in Commodities' },
  ],
}

export const metadata = {
  title: 'Invest in Commodities from India — Gold ETF, Silver ETF, Commodity MFs 2026',
  description: 'How to invest in commodities from India. Gold ETFs, Silver ETFs, commodity mutual funds, mining stocks — Indian and global options accessible via Zerodha, Groww, Vested and INDmoney.',
  keywords: [
    'best gold ETF India 2026',
    'gold ETF vs MCX gold India',
    'how to invest in commodities India',
    'silver ETF India 2026',
    'commodity mutual fund India',
    'gold FoF India SIP',
    'US commodity ETF from India LRS',
    'copper mining ETF India Vested',
    'commodity investment India Zerodha',
    'best way to invest in gold India 2026',
    'gold ETF tax India 2026',
    'commodity ETF India returns',
  ],
  alternates: { canonical: 'https://bhaavbrief.in/invest' },
  openGraph: {
    title: 'Invest in Commodities from India — Gold ETF, Silver ETF, MFs | BhaavBrief',
    description: 'Gold ETFs, Silver ETFs, commodity mutual funds and mining stocks — Indian and global options. How to invest in commodities from India via Zerodha, Groww, Vested.',
    url: 'https://bhaavbrief.in/invest',
    siteName: 'BhaavBrief',
    type: 'website' as const,
    locale: 'en_IN',
  },
  twitter: { card: 'summary' as const, title: 'Invest in Commodities India | BhaavBrief', description: 'Gold ETF, Silver ETF, commodity MFs and US mining ETFs — how to invest in commodities from India.', site: '@bhaavbrief' },
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(BREADCRUMB_SCHEMA) }} />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 0' }}>
        <SectionTabs
          active="/invest"
          tabs={[
            { label: 'MCX Trading', href: '/learn' },
            { label: 'Investing',   href: '/invest' },
          ]}
        />
      </div>
      <InvestPage />
    </>
  )
}

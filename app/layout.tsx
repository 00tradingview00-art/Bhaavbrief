import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'
import '../styles/bhaav.css'
import Nav from '@/components/Nav'
import TickerStrip from '@/components/TickerStrip'
import GeoRiskTicker from '@/components/GeoRiskTicker'
import PostHogProvider from '@/components/PostHogProvider'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
  display: 'swap',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
})

const BASE = 'https://bhaavbrief.in'

export const metadata: Metadata = {
  title: {
    default:  'BhaavBrief — Indian Commodity Intelligence',
    template: '%s | BhaavBrief',
  },
  description: 'Free daily MCX commodity intelligence for Indian traders. Gold, Silver, Crude Oil, Copper, Natural Gas — prices, OHLC analysis and market outlook every weekday. For educational purposes only.',
  metadataBase: new URL(BASE),
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: { canonical: BASE },
  openGraph: {
    title: 'BhaavBrief — Indian Commodity Intelligence',
    description: 'Free daily MCX commodity intelligence for Indian traders. Gold, Silver, Crude Oil, Copper, Natural Gas — analysis and market outlook every weekday.',
    url: BASE,
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: `${BASE}/api/og?title=India+Commodity+Intelligence&tags=MCX+Gold,MCX+Crude,USD%2FINR`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BhaavBrief — Indian Commodity Intelligence',
    description: 'Free daily MCX intelligence — Gold, Silver, Crude Oil, Copper, Natural Gas. Every weekday.',
    site: '@bhaavbrief',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // TickerStrip fetches prices client-side every 30s and has a static fallback
  const initialPrices = null

  const orgSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'BhaavBrief',
        url: BASE,
        description: 'Independent commodity intelligence for Indian traders and merchants.',
        contactPoint: { '@type': 'ContactPoint', email: 'brief@bhaavbrief.in', contactType: 'Customer Support' },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: 'BhaavBrief',
        description: 'Free daily MCX commodity intelligence for Indian traders.',
        publisher: { '@id': `${BASE}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/briefs?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      },
    ],
  }

  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', margin: 0, padding: 0 }}>
        <PostHogProvider>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <Nav />
        {/* Sticky ticker bar — sticks just below the nav (56px) */}
        <div style={{ position: 'sticky', top: 56, zIndex: 39 }}>
          <TickerStrip initialPrices={initialPrices} />
          <GeoRiskTicker />
        </div>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          {children}
        </main>
        <footer style={{ borderTop: '1px solid var(--border)', padding: '32px 24px', marginTop: 64, textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Bhaav<span style={{ color: 'var(--gold)' }}>Brief</span>
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 4 }}>
            Independent commodity intelligence for Indian traders and merchants.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16 }}>
            © {new Date().getFullYear()} BhaavBrief · brief@bhaavbrief.in ·{' '}
            <a href="/privacy" style={{ color: 'var(--ink-4)', textDecoration: 'underline' }}>Privacy Policy</a>
          </p>
          <p style={{
            fontSize: 11,
            color: 'var(--ink-4)',
            lineHeight: 1.7,
            maxWidth: 640,
            margin: '0 auto',
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            borderRadius: 0,
          }}>
            <strong style={{ color: 'var(--ink-3)' }}>Disclaimer:</strong> BhaavBrief is for educational and informational purposes only.
            We are not registered with SEBI or any other regulatory authority.
            Nothing on this platform constitutes investment advice, a recommendation, or a solicitation to buy or sell any security or commodity.
            All data and analysis is sourced from publicly available information. Past patterns are not indicative of future results.
            Commodity and equity trading involves substantial risk of loss. Please consult a SEBI-registered investment advisor or research analyst before making any financial decisions.
          </p>
        </footer>
        <Analytics />
        {/* Google Analytics 4 */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-JG993LN554" strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-JG993LN554');
        `}</Script>
        </PostHogProvider>
      </body>
    </html>
  )
}

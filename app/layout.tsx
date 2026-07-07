import type { Metadata } from 'next'
import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import './globals.css'
import '../styles/bhaav.css'
import Nav from '@/components/Nav'
import TickerStrip from '@/components/TickerStrip'
import PostHogProvider from '@/components/PostHogProvider'
import ReferralTracker from '@/components/signal-academy/ReferralTracker'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700', '800'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
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
  description: 'Daily MCX commodity intelligence for Indian traders, investors and merchants. Explains why gold, crude oil and silver prices move — OPEC, Fed, rupee-dollar, geopolitics — every weekday.',
  keywords: [
    'MCX commodity intelligence India',
    'MCX daily brief',
    'why did MCX gold fall today',
    'why is MCX crude oil rising',
    'rupee dollar impact MCX gold',
    'OPEC impact MCX crude India',
    'MCX commodity market outlook today',
    'India commodity market morning brief',
    'MCX gold silver crude analysis',
    'commodity market intelligence India',
  ],
  metadataBase: new URL(BASE),
  manifest: '/manifest.json',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: {
    // No canonical here — each page sets its own to avoid root layout leaking
    // https://bhaavbrief.in canonical into all child routes (causes GSC duplicate issue)
    types: { 'application/rss+xml': `${BASE}/feed.xml` },
  },
  openGraph: {
    title: 'BhaavBrief — Indian Commodity Intelligence',
    description: 'Daily MCX commodity intelligence for Indian traders, investors and merchants. Gold, Silver, Crude Oil, Copper, Natural Gas — analysis and market outlook every weekday.',
    url: BASE,
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: `${BASE}/api/og?title=India+Commodity+Intelligence&tags=MCX+Gold,MCX+Crude,USD%2FINR`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BhaavBrief — Indian Commodity Intelligence',
    description: 'Daily MCX intelligence — Gold, Silver, Crude Oil, Copper, Natural Gas. Every weekday.',
    site: '@bhaavbrief',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const snap          = loadSnapshot()
  const initialPrices = snap ? snapshotToPriceData(snap) : null

  const orgSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'BhaavBrief',
        url: BASE,
        description: 'Independent commodity intelligence for Indian traders, investors and merchants.',
        contactPoint: { '@type': 'ContactPoint', email: 'brief@bhaavbrief.in', contactType: 'Customer Support' },
      },
      {
        '@type': 'WebSite',
        '@id': `${BASE}/#website`,
        url: BASE,
        name: 'BhaavBrief',
        description: 'Daily MCX commodity intelligence for Indian traders, investors and merchants.',
        publisher: { '@id': `${BASE}/#organization` },
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${BASE}/briefs?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
      },
    ],
  }

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', margin: 0, padding: 0 }}>
        <PostHogProvider>
        <ReferralTracker />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <Nav />
        {/* Sticky ticker bar — sticks just below the nav (56px) */}
        <div style={{ position: 'sticky', top: 56, zIndex: 39 }}>
          <TickerStrip initialPrices={initialPrices} />
        </div>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 24px)' }}>
          {children}
        </main>
        <footer style={{ borderTop: '1px solid var(--border)', padding: 'clamp(24px, 4vw, 32px) clamp(16px, 4vw, 24px)', marginTop: 'clamp(40px, 6vw, 64px)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Bhaav<span style={{ color: 'var(--gold)' }}>Brief</span>
          </p>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', marginBottom: 4 }}>
            Independent commodity intelligence for India&apos;s traders, investors and merchants.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16 }}>
            © {new Date().getFullYear()} BhaavBrief · brief@bhaavbrief.in ·{' '}
            <a href="/privacy" style={{ color: 'var(--ink-4)', textDecoration: 'underline' }}>Privacy Policy</a>{' '}·{' '}
            <a href="/terms" style={{ color: 'var(--ink-4)', textDecoration: 'underline' }}>Terms of Use</a>
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
        {/* Google Analytics 4 — lazyOnload so it doesn't block interactivity */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-JG993LN554" strategy="lazyOnload" />
        <Script id="ga4" strategy="lazyOnload">{`
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

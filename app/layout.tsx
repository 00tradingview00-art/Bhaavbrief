import type { Metadata } from 'next'
import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import Link from 'next/link'
import { ClerkProvider } from '@clerk/nextjs'
import AuthNavChip from '@/components/AuthNavChip'
import './globals.css'
import '../styles/bhaav.css'
import Nav from '@/components/Nav'
import BottomNav from '@/components/BottomNav'
import TickerStrip from '@/components/TickerStrip'
import PostHogProvider from '@/components/PostHogProvider'
import { loadSnapshot, snapshotToPriceData } from '@/lib/snapshot'
import { safeJsonLd } from '@/lib/seo'

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

// P-01 (build-ID stamping): Vercel sets VERCEL_GIT_COMMIT_SHA at build time;
// GITHUB_SHA covers CI-only builds (e.g. `npm run build` in test.yml). The
// synthetic monitor's M-01 check compares this across routes — two different
// values live at once means two builds are serving simultaneously (the exact
// failure mode that took 7 weeks to notice before this existed).
const BUILD_SHA = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'local-dev'

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
        logo: { '@type': 'ImageObject', url: `${BASE}/logo.png`, width: 500, height: 500 },
        sameAs: ['https://twitter.com/bhaavbrief', 'https://instagram.com/bhaavbrief'],
        contactPoint: { '@type': 'ContactPoint', url: `${BASE}/feedback`, contactType: 'Customer Support' },
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
    <ClerkProvider>
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Rendered directly here (not via the Metadata API's `other` field) so it
            can't be silently dropped by a child route's own metadata export —
            Next.js does not deep-merge `other` objects, it replaces them wholesale. */}
        <meta name="bb-build" content={BUILD_SHA} />
      </head>
      <body style={{ fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', margin: 0, padding: 0 }}>
        <PostHogProvider>
        {/* Auth nav chip — shown in top-right corner */}
        <div style={{ position: 'fixed', top: 10, right: 16, zIndex: 100, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AuthNavChip />
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(orgSchema) }} />
        <Nav />
        {/* Sticky ticker bar — sticks just below the nav (56px) */}
        <div style={{ position: 'sticky', top: 56, zIndex: 39 }}>
          <TickerStrip initialPrices={initialPrices} />
        </div>
        <main className="bb-main" style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(20px, 4vw, 32px) clamp(16px, 4vw, 24px)' }}>
          {children}
        </main>
        <footer className="bb-footer" style={{ borderTop: '1px solid var(--border)', padding: 'clamp(24px, 4vw, 32px) clamp(16px, 4vw, 24px)', marginTop: 'clamp(40px, 6vw, 64px)', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            Bhaav<span style={{ color: 'var(--gold)' }}>Brief</span>
          </p>
          <p style={{ fontSize: 15, color: 'var(--ink-4)', marginBottom: 4 }}>
            Independent commodity intelligence for India&apos;s traders, investors and merchants.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 8 }}>
            <Link href="/tools" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Tools</Link>{' '}·{' '}
            <Link href="/options" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Options Chain</Link>{' '}·{' '}
            <Link href="/options/strategy" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Strategy Builder</Link>{' '}·{' '}
            <Link href="/basis" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Basis</Link>{' '}·{' '}
            <Link href="/research" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Research</Link>{' '}·{' '}
            <Link href="/pro" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Pro</Link>
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16 }}>
            © {new Date().getFullYear()} BhaavBrief ·{' '}
            <a href="/about" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>About</a>{' '}·{' '}
            <a href="/track-record" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Track Record</a>{' '}·{' '}
            <a href="/privacy" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Privacy Policy</a>{' '}·{' '}
            <a href="/terms" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Terms of Use</a>{' '}·{' '}
            <a href="https://instagram.com/bhaavbrief" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Instagram</a>{' '}·{' '}
            <a href="/feedback" style={{ color: 'var(--ink-4)', textDecoration: 'underline', fontWeight: 700 }}>Feedback</a>
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
            <strong style={{ color: 'var(--ink-3)' }}>Disclaimer:</strong> BhaavBrief provides factual market data, statistics, event calendars, and educational content only.
            Nothing on this platform constitutes investment advice, research recommendations, or an inducement to trade.
            BhaavBrief is not a SEBI-registered Research Analyst or Investment Adviser.
            All data and analysis is sourced from publicly available information; past patterns are not indicative of future results.
            Commodity derivatives trading involves substantial risk of loss and is not suitable for all investors. Please consult a SEBI-registered investment advisor or research analyst before making any financial decisions.
          </p>
        </footer>
        <BottomNav />
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
    </ClerkProvider>
  )
}

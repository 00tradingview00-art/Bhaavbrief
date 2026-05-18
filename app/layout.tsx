import type { Metadata } from 'next'
import './globals.css'

const BASE_URL    = 'https://bhaavbrief.in'
const SITE_NAME   = 'BhaavBrief'
const TITLE       = "BhaavBrief — India's Commodity Intelligence, Every Morning"
const DESCRIPTION = 'Free daily commodity intelligence for Indian traders and merchants. MCX crude oil, gold, silver, agri prices with geopolitical signals, options analysis and supply-demand intelligence. Published every weekday at 7 AM IST.'
const KEYWORDS    = [
  'MCX commodity prices today India',
  'commodity intelligence India',
  'crude oil price India today MCX',
  'gold price MCX today',
  'silver price MCX',
  'NCDEX agri prices today',
  'mandi bhav today',
  'commodity market analysis India',
  'commodity newsletter India',
  'MCX trading analysis',
  'bhaav India commodities',
  'India commodity market news',
  'crude oil analysis India',
  'MCX gold silver copper analysis',
  'commodity options India',
].join(', ')

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  TITLE,
    template: '%s | BhaavBrief',
  },
  description: DESCRIPTION,
  keywords:    KEYWORDS,
  authors:     [{ name: 'BhaavBrief', url: BASE_URL }],
  creator:     'BhaavBrief',
  publisher:   'BhaavBrief',
  alternates: {
    canonical: BASE_URL,
    types: { 'application/rss+xml': `${BASE_URL}/feed.xml` },
  },
  openGraph: {
    type:        'website',
    locale:      'en_IN',
    url:          BASE_URL,
    siteName:     SITE_NAME,
    title:        TITLE,
    description:  DESCRIPTION,
    images: [{
      url:    `${BASE_URL}/og-default.png`,
      width:  1200,
      height: 630,
      alt:    "BhaavBrief — India's Commodity Intelligence",
    }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        '@bhaavbrief',
    creator:     '@bhaavbrief',
    title:        TITLE,
    description:  DESCRIPTION,
    images:      [`${BASE_URL}/og-default.png`],
  },
  robots: {
    index:    true,
    follow:   true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet':       -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? '',
  },
  icons: {
    icon:    '/favicon.ico',
    apple:   '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  category:  'finance',
}

const organizationSchema = {
  '@context':  'https://schema.org',
  '@type':      'Organization',
  name:         'BhaavBrief',
  url:           BASE_URL,
  logo:         `${BASE_URL}/logo.png`,
  description:   DESCRIPTION,
  foundingDate: '2026',
  areaServed:   'IN',
  knowsAbout:   ['Commodity Markets', 'MCX', 'NCDEX', 'Crude Oil', 'Gold', 'Silver', 'Agricultural Commodities'],
  contactPoint: {
    '@type':           'ContactPoint',
    contactType:       'customer support',
    email:             'brief@bhaavbrief.in',
    availableLanguage: ['English', 'Hindi'],
  },
}

const websiteSchema = {
  '@context':   'https://schema.org',
  '@type':       'WebSite',
  name:          'BhaavBrief',
  url:            BASE_URL,
  description:    DESCRIPTION,
  publisher: { '@type': 'Organization', name: 'BhaavBrief', url: BASE_URL },
  potentialAction: {
    '@type':       'SearchAction',
    target:        `${BASE_URL}/briefs?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

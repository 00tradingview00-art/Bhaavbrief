import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OI Divergence',
  description: 'Open interest change relative to price change reveals the conviction behind MCX market moves. Interactive simulator with real historical cases.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy/oi-divergence' },
  openGraph: {
    title: 'OI Divergence — Signal Academy | BhaavBrief',
    description: 'Read open interest against price to separate conviction from noise — interactive MCX simulator with real historical cases.',
    url: 'https://bhaavbrief.in/signal-academy/oi-divergence',
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'OI Divergence — Signal Academy | BhaavBrief',
    description: 'Read open interest against price to separate conviction from noise.',
    site: '@bhaavbrief',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IV Percentile',
  description: 'Implied volatility percentile shows whether MCX options are cheap or expensive relative to the past year. Interactive simulator with real historical cases.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy/iv-percentile' },
  openGraph: {
    title: 'IV Percentile — Signal Academy | BhaavBrief',
    description: 'Is implied volatility cheap or expensive right now? Interactive MCX simulator comparing current IV to its one-year range.',
    url: 'https://bhaavbrief.in/signal-academy/iv-percentile',
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'IV Percentile — Signal Academy | BhaavBrief',
    description: 'Is implied volatility cheap or expensive right now? Interactive MCX simulator.',
    site: '@bhaavbrief',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

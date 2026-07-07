import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Basis Convergence',
  description: 'The gap between MCX futures and spot price must converge to zero at expiry. Interactive simulator showing what a too-wide or negative basis signals.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy/basis-convergence' },
  openGraph: {
    title: 'Basis Convergence — Signal Academy | BhaavBrief',
    description: 'Futures-spot basis must converge to zero at expiry — interactive MCX simulator showing what it means when it doesn’t behave.',
    url: 'https://bhaavbrief.in/signal-academy/basis-convergence',
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'Basis Convergence — Signal Academy | BhaavBrief',
    description: 'Futures-spot basis must converge to zero at expiry — interactive MCX simulator.',
    site: '@bhaavbrief',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Volume Anomaly',
  description: 'A price move on thin volume is a rumour; the same move on 3× volume is a fact. Interactive MCX simulator on reading volume alongside price and open interest.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy/volume-anomaly' },
  openGraph: {
    title: 'Volume Anomaly — Signal Academy | BhaavBrief',
    description: 'Volume is the lie detector of the market — interactive MCX simulator on separating noise from institutional signal.',
    url: 'https://bhaavbrief.in/signal-academy/volume-anomaly',
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'Volume Anomaly — Signal Academy | BhaavBrief',
    description: 'Volume is the lie detector of the market — interactive MCX simulator.',
    site: '@bhaavbrief',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

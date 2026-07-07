import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Seasonal Patterns',
  description: 'Akshaya Tritiya, Dhanteras, monsoon onset, Rabi harvest — recurring demand and supply patterns in Indian commodity markets. Interactive simulator with historical cases.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy/seasonal-patterns' },
  openGraph: {
    title: 'Seasonal Patterns — Signal Academy | BhaavBrief',
    description: 'Indian commodity markets run on two calendars. Interactive simulator on the recurring seasonal patterns MCX traders build into their playbooks.',
    url: 'https://bhaavbrief.in/signal-academy/seasonal-patterns',
    siteName: 'BhaavBrief',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary',
    title: 'Seasonal Patterns — Signal Academy | BhaavBrief',
    description: 'Indian commodity markets run on two calendars — interactive MCX seasonal-pattern simulator.',
    site: '@bhaavbrief',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}

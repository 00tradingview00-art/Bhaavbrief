import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default:  'Signal Academy — MCX Pattern Recognition',
    template: '%s — Signal Academy | BhaavBrief',
  },
  description: 'Learn to read MCX market signals: OI divergence, volume anomalies, basis convergence, IV percentile and seasonal patterns. Interactive simulators with real MCX data.',
  alternates: { canonical: 'https://bhaavbrief.in/signal-academy' },
}

export default function SignalAcademyLayout({ children }: { children: React.ReactNode }) {
  return children
}

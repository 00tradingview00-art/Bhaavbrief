import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'
import '../styles/bhaav.css'
import Nav from '@/components/Nav'
import TickerStrip from '@/components/TickerStrip'

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

export const metadata: Metadata = {
  title: 'BhaavBrief — Indian Commodity Intelligence',
  description: 'MCX intelligence every weekday at 7 AM. Free forever. Gold, Silver, Crude, Copper, Natural Gas — all in 5 minutes.',
  openGraph: {
    title: 'BhaavBrief',
    description: 'MCX intelligence every weekday at 7 AM. Free forever.',
    url: 'https://bhaavbrief.in',
    siteName: 'BhaavBrief',
    locale: 'en_IN',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', margin: 0, padding: 0 }}>
        <Nav />
        <TickerStrip />
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
          <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>
            © {new Date().getFullYear()} BhaavBrief · brief@bhaavbrief.in
          </p>
        </footer>
      </body>
    </html>
  )
}

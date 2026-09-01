'use client'

import { useEffect } from 'react'
import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '../styles/bhaav.css'

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

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[global-error-boundary]', error)
  }, [error])

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body style={{ fontFamily: 'var(--font-sans)', background: 'var(--surface-2)', color: 'var(--ink)', margin: 0, padding: 0 }}>
        <div style={{ textAlign: 'center', padding: '80px 24px', maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--gold)', marginBottom: 16,
          }}>
            Error
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28, fontWeight: 500,
            color: 'var(--ink)', margin: '0 0 12px',
          }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.7, marginBottom: 32 }}>
            A critical error occurred. Please try again.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => reset()} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'var(--ink)', color: '#fff',
              padding: '10px 22px', borderRadius: 4,
              fontSize: 15, fontWeight: 500, border: 'none', cursor: 'pointer',
            }}>
              ↻ Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate hard navigation: this boundary replaces the root layout, so the router itself may be what crashed */}
            <a href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid var(--border)', color: 'var(--ink-2)',
              padding: '10px 20px', borderRadius: 4,
              fontSize: 15, textDecoration: 'none',
            }}>
              ← Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

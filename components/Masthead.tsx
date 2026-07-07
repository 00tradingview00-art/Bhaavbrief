'use client'
import Link from 'next/link'

export default function Masthead() {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <header style={{ borderBottom: '3px double #C8C8B8', background: '#FAFAF6' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Top row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 0 1rem', borderBottom: '0.5px solid #DDDDD0',
          flexWrap: 'wrap', gap: '0.75rem',
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#18180F', lineHeight: 1 }}>
              BhaavBrief
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8720A', marginTop: 4 }}>
              India's First Commodity Intelligence · Est. 2026
            </div>
          </Link>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', letterSpacing: '0.05em', lineHeight: 1.7 }}>{today}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#8A8A7A', lineHeight: 1.7 }}>bhaavbrief.in</p>
          </div>
        </div>

        {/* Nav row */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Latest Brief', href: '/briefs' },
              { label: 'Archive',      href: '/briefs' },
              { label: 'Subscribe',    href: '/#subscribe' },
              { label: 'About',        href: '/#about' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{ fontSize: 12, fontWeight: 500, color: '#48483A', textDecoration: 'none', letterSpacing: '0.02em' }}>
                {link.label}
              </Link>
            ))}
          </div>
          <Link href="#subscribe" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em',
            background: '#18180F', color: '#FAFAF6', padding: '7px 18px',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Subscribe →
          </Link>
        </nav>
      </div>
    </header>
  )
}

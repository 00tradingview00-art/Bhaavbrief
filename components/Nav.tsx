'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/',        label: 'Home'    },
  { href: '/briefs',  label: 'Briefs'  },
  { href: '/markets', label: 'Markets' },
  { href: '/news',     label: 'News'     },
  { href: '/articles', label: 'Articles' },
  { href: '/invest',   label: 'Invest'   },
  { href: '/learn',   label: 'Learn'   },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        gap: 8,
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', marginRight: 16, flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.3px',
          }}>
            Bhaav<span style={{ color: 'var(--gold)' }}>Brief</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2, flex: 1 }}>
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                  background: isActive ? 'var(--surface-3)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all .15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* CTA */}
        <Link
          href="/#subscribe"
          style={{
            marginLeft: 'auto',
            background: 'var(--ink)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          Subscribe free →
        </Link>
      </div>
    </nav>
  )
}

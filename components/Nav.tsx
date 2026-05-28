'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false })

const NAV_LINKS = [
  { href: '/',        label: 'Home'    },
  { href: '/briefs',  label: 'Briefs'  },
  { href: '/markets', label: 'Markets' },
  { href: '/news',    label: 'Feed'    },
  { href: '/learn',   label: 'Learn'   },
  { href: '/about',   label: 'About'   },
]

export default function Nav() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

  // Cmd+K / Ctrl+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
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
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          height: 56,
          gap: 8,
          minWidth: 0,
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

          {/* Nav links — scrollable on mobile */}
          <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                    flexShrink: 0,
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--ink-3)' }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--ink-4)',
              letterSpacing: '0.04em',
              display: 'none',
            }}
              className="nav-search-label"
            >
              Search
            </span>
            <kbd style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1px 5px',
              lineHeight: 1.4,
              display: 'none',
            }}
              className="nav-search-kbd"
            >
              ⌘K
            </kbd>
          </button>

          {/* Subscribe CTA — hidden on mobile */}
          <Link
            href="/#subscribe"
            className="nav-subscribe"
            style={{
              background: 'var(--ink)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              alignItems: 'center',
            }}
          >
            Subscribe →
          </Link>
        </div>
      </nav>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style>{`
        @media (min-width: 640px) {
          .nav-search-label { display: inline !important; }
          .nav-search-kbd   { display: inline !important; }
          .nav-subscribe    { display: flex !important; }
        }
        .nav-subscribe { display: none; }
        .nav-links {
          display: flex;
          align-items: center;
          gap: 2px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex-shrink: 1;
          min-width: 0;
        }
        .nav-links::-webkit-scrollbar { display: none; }
        @media (max-width: 480px) {
          .nav-links a { padding: 6px 8px !important; font-size: 12px !important; }
        }
      `}</style>
    </>
  )
}

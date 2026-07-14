'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false })

const NAV_LINKS = [
  { href: '/',               label: 'Home'    },
  { href: '/briefs',         label: 'Briefs'  },
  { href: '/markets',        label: 'Markets' },
  { href: '/options',        label: 'Options' },
  { href: '/news',           label: 'Feed'    },
  { href: '/calendar',       label: 'Calendar' },
  { href: '/learn',          label: 'Learn'   },
]

export default function Nav() {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)

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
          padding: '0 20px',
          display: 'flex',
          alignItems: 'stretch',
          height: 52,
          gap: 0,
          minWidth: 0,
        }}>

          {/* Wordmark */}
          <Link href="/" style={{
            textDecoration: 'none',
            marginRight: 28,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}>
            <Image src="/logo-mark.png" alt="BhaavBrief" width={26} height={26} style={{ display: 'block' }} />
            <span style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--ink)',
              letterSpacing: '-0.4px',
            }}>
              Bhaav<span style={{ color: 'var(--gold)' }}>Brief</span>
            </span>
          </Link>

          {/* Nav links — full height, underline active indicator */}
          <div className="nav-links" style={{ display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 0 }}>
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 11px',
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                    transition: 'color .12s, border-color .12s',
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--surface-2, #F3F2EC)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '5px 12px',
              cursor: 'pointer',
              flexShrink: 0,
              color: 'var(--ink-3)',
              transition: 'border-color 0.15s, background 0.15s',
              marginRight: 12,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ink-3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--ink-3)', fontWeight: 700 }}
              className="nav-search-label">
              Search
            </span>
            <kbd style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--ink-4)',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '1px 5px',
              lineHeight: 1.5,
              boxShadow: '0 1px 0 var(--border)',
            }}
              className="nav-search-kbd">
              ⌘K
            </kbd>
          </button>

          {/* Subscribe */}
          <Link
            href="/#subscribe"
            className="nav-subscribe"
            style={{
              display: 'none',
              alignItems: 'center',
              borderLeft: '1px solid var(--border)',
              padding: '0 20px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink)',
              textDecoration: 'none',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
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
        .nav-search-label { display: none; }
        .nav-search-kbd   { display: none; }
        .nav-links {
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .nav-links::-webkit-scrollbar { display: none; }
        .nav-links a:hover { color: var(--ink) !important; }
        @media (max-width: 480px) {
          .nav-links a { padding: 0 8px !important; font-size: 13px !important; }
        }
      `}</style>
    </>
  )
}

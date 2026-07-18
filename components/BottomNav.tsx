'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 8.5L10 3l7 5.5" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 8v8h10V8" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/briefs',
    label: 'Brief',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="2.5" width="12" height="15" rx="1.4" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" />
        <path d="M7 7h6M7 10.5h6M7 14h3.5" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/markets',
    label: 'Markets',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 15.5l4.5-5 3 3 6-7" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.5 6.5H16.5V10.5" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/options',
    label: 'Options',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" />
        <path d="M10 6.5v3.5l2.5 1.5" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12.5" rx="1.4" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" />
        <path d="M3 7.5h14M6.5 2.5v3M13.5 2.5v3" stroke={active ? 'var(--gold)' : 'var(--ink-4)'} strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <nav
        className="bb-bottom-nav"
        aria-label="Primary"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          paddingTop: 7,
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        {TABS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 0 2px',
                textDecoration: 'none',
              }}
            >
              {icon(active)}
              <span
                style={{
                  fontFamily: 'system-ui, sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  color: active ? 'var(--gold)' : 'var(--ink-4)',
                  transition: 'color 0.15s ease',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      <style>{`
        .bb-bottom-nav { display: none; }
        @media (max-width: 767px) {
          .bb-bottom-nav { display: flex; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bb-bottom-nav a span { transition: none; }
        }
      `}</style>
    </>
  )
}

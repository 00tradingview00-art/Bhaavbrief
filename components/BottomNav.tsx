'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tone = (active: boolean) => active ? 'var(--gold)' : 'var(--ink-4)'

const TABS = [
  { href: '/', label: 'Brief', icon: () => <><path d="M3 8.5L10 3l7 5.5M5 8v8h10V8" /><path d="M7.5 11h5M7.5 13.5h3" /></> },
  { href: '/markets', label: 'Markets', icon: () => <><path d="M3 15.5l4.5-5 3 3 6-7" /><path d="M12.5 6.5H16.5V10.5" /></> },
  { href: '/calendar', label: 'Calendar', icon: () => <><rect x="3" y="4" width="14" height="12.5" rx="1.4" /><path d="M3 7.5h14M6.5 2.5v3M13.5 2.5v3" /></> },
  { href: '/alerts', label: 'Alerts', icon: () => <><path d="M5 14.5h10l-1.2-1.8v-3.1a3.8 3.8 0 0 0-7.6 0v3.1L5 14.5Z" /><path d="M8 16.5c.4.8 1.1 1.1 2 1.1s1.6-.3 2-1.1" /></> },
  { href: '/account', label: 'Account', icon: () => <><circle cx="10" cy="6.5" r="3" /><path d="M4.5 17c.7-3 2.5-4.5 5.5-4.5s4.8 1.5 5.5 4.5" /></> },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bb-bottom-nav" aria-label="Primary navigation">
      {TABS.map(({ href, label, icon }) => {
        const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link key={href} href={href} prefetch={false} className="bb-bottom-nav__item" aria-current={active ? 'page' : undefined}>
            <svg width="21" height="21" viewBox="0 0 20 20" fill="none" aria-hidden="true" stroke={tone(active)} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {icon()}
            </svg>
            <span className={active ? 'is-active' : undefined}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

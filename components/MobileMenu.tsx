'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import AuthChipFallback from './AuthChipFallback'

// Same deferred, self-contained chip as Nav.tsx — see that file's comment.
// The drawer only mounts once opened anyway, but this keeps a single
// consistent way to render the auth chip across both call sites.
const AuthNavChip = dynamic(() => import('./DeferredAuthChip'), {
  ssr: false,
  loading: AuthChipFallback,
})

interface MobileMenuProps {
  open: boolean
  onClose: () => void
  onOpenSearch: () => void
}

const FOOTER_LINKS = [
  { href: '/about',    label: 'About'         },
  { href: '/privacy',  label: 'Privacy Policy' },
  { href: '/terms',    label: 'Terms of Use'   },
  { href: '/feedback', label: 'Feedback'       },
]

// Mobile-only overflow drawer for whatever doesn't fit in the 8-item bottom
// tab bar (BottomNav.tsx already covers every primary destination) — Search,
// Subscribe, Sign in/Account, and the footer-tier links. Lets the top nav
// bar itself shrink to just the logo + this trigger on mobile instead of
// cramming a search button and 1-2 auth buttons into the same 52px row.
export default function MobileMenu({ open, onClose, onOpenSearch }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'rgba(14, 13, 10, 0.4)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: 'min(84vw, 320px)',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-5)',
          gap: 'var(--space-2)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', padding: 'var(--space-2)', display: 'flex',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => { onClose(); onOpenSearch() }}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: 'var(--space-3) var(--space-4)',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--ink-3)',
            cursor: 'pointer', marginBottom: 'var(--space-4)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.6 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Search
        </button>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <AuthNavChip />
        </div>

        <Link
          href="/#subscribe"
          onClick={onClose}
          style={{
            display: 'block', padding: 'var(--space-3) 0', fontFamily: 'var(--font-sans)',
            fontSize: 14, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none',
            borderTop: '1px solid var(--border)',
          }}
        >
          Subscribe →
        </Link>

        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none' }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

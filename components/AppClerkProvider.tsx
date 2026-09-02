import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'

// Shared, pre-themed ClerkProvider — NOT mounted at the root layout anymore.
// Clerk's client JS (~150KB+ of chunks plus two cross-origin script loads to
// *.clerk.accounts.dev) was loading on every single page, including pages
// with no auth-aware content at all, which is most of why mobile Performance
// was 72 against desktop's 99. Only the routes that actually render a
// client Clerk hook (options chain, markets, tools, basis, research, pro,
// sign-in, sign-up) mount this via their own layout.tsx — everything else
// (home, briefs, news, calendar, learn, about, etc.) now ships zero Clerk JS.
// The global nav's auth chip (components/AuthNavChip.tsx) no longer needs
// Clerk client-side at all — it's server-prop-driven from app/layout.tsx.
export default function AppClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        // Match the site's own design tokens (styles/bhaav.css) instead of
        // Clerk's stock look.
        variables: {
          colorPrimary:         'var(--gold)',
          colorBackground:      'var(--surface)',
          colorForeground:      'var(--ink)',
          colorMutedForeground: 'var(--ink-3)',
          colorBorder:          'var(--border)',
          colorDanger:          'var(--down)',
          colorSuccess:         'var(--up)',
          borderRadius:         'var(--radius-md)',
          fontFamily:           'var(--font-sans)',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}

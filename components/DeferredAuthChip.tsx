'use client'

import AppClerkProvider from './AppClerkProvider'
import AuthNavChip from './AuthNavChip'

// Default export only — this module is always loaded via next/dynamic(...,
// { ssr: false }) from Nav.tsx/MobileMenu.tsx, never imported directly.
// Carries its own ClerkProvider instance so it's fully self-contained: on
// pages that already have a route-level ClerkProvider (options, markets,
// tools, ...) this is a second, independent instance, which Clerk supports —
// the alternative (threading auth state down from a shared ancestor) would
// mean computing it in the root layout, which forces the *entire* site into
// dynamic rendering (confirmed live — a real regression caught while
// building this: /privacy, /terms, and every /tools/* page lost their
// static/ISR caching the moment auth() was called there).
export default function DeferredAuthChip() {
  return (
    <AppClerkProvider>
      <AuthNavChip />
    </AppClerkProvider>
  )
}

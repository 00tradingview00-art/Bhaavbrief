'use client'

import { useUser } from '@clerk/nextjs'
import Button from '@/components/ui/Button'
import { useIsPro } from '@/lib/useIsPro'

// Only ever rendered inside DeferredAuthChip.tsx's own ClerkProvider —
// never mounted directly (see Nav.tsx/MobileMenu.tsx for why: this chunk is
// code-split and client-only, so pages with no other Clerk usage don't pay
// for Clerk's JS as part of their initial render).
export default function AuthNavChip() {
  const { isSignedIn } = useUser()
  const isPro = useIsPro()

  if (isSignedIn && isPro) {
    return (
      <Button href="/account" variant="secondary" size="sm">Account</Button>
    )
  }

  if (isSignedIn) {
    return (
      <>
        <Button href="/pro" variant="pill" size="sm">Upgrade to Pro</Button>
        <Button href="/account" variant="secondary" size="sm">Account</Button>
      </>
    )
  }

  return (
    <>
      <Button href="/pro" variant="pill" size="sm">Pro</Button>
      <Button href="/sign-in" variant="secondary" size="sm">Sign in</Button>
    </>
  )
}

'use client'

import { useUser } from '@clerk/nextjs'
import Button from '@/components/ui/Button'
import { useIsPro } from '@/lib/useIsPro'

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

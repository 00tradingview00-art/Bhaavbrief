import Button from '@/components/ui/Button'

// Static, hook-free placeholder shown for the brief moment before
// DeferredAuthChip's own chunk (and its self-contained ClerkProvider) loads
// in — see Nav.tsx/MobileMenu.tsx. Matches the signed-out look, which is
// correct for the large majority of page loads; a signed-in visitor sees
// this swap to "Account" a moment after hydration instead of on first paint.
export default function AuthChipFallback() {
  return (
    <>
      <Button href="/pro" variant="pill" size="sm">Pro</Button>
      <Button href="/sign-in" variant="secondary" size="sm">Sign in</Button>
    </>
  )
}

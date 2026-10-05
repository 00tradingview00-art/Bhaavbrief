import AppClerkProvider from '@/components/AppClerkProvider'

// Clerk's client runtime is deliberately not loaded site-wide (see
// components/AuthNavChip.tsx) — only on pages that need it. /account needs
// it for the Sign out button.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>
}

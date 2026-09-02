import AppClerkProvider from '@/components/AppClerkProvider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppClerkProvider>{children}</AppClerkProvider>
}

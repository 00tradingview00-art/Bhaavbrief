'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Populated after the lazy import completes — module-level singleton
let ph: typeof import('posthog-js').default | null = null

function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!ph) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
    if (!key) return

    import('posthog-js').then(mod => {
      ph = mod.default
      ph.init(key, {
        api_host:                  host,
        capture_pageview:          false,
        capture_pageleave:         true,
        persistence:               'localStorage+cookie',
        autocapture:               false,
        disable_session_recording: false,
      })
      ph.capture('$pageview', { $current_url: window.location.href })
    })
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  )
}

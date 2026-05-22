'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const ph           = usePostHog()

  useEffect(() => {
    if (!ph) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com'
    if (!key) return

    posthog.init(key, {
      api_host:             host,
      capture_pageview:     false,   // manual via PageViewTracker
      capture_pageleave:    true,
      persistence:          'localStorage+cookie',
      autocapture:          false,   // we control what we track
      disable_session_recording: false,
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}

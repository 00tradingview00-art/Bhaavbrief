'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Populated after the lazy import completes — module-level singleton
let ph: typeof import('posthog-js').default | null = null

// GEO/AEO measurement: which AI answer engines are actually sending traffic
// (llms.txt, FAQPage schema) rather than just guessing they help. Checked
// once against document.referrer at session start — an AI engine referrer
// only ever shows up on the entry pageview, never on in-app navigation.
const AI_ENGINE_DOMAINS = [
  'chatgpt.com', 'perplexity.ai', 'gemini.google.com',
  'claude.ai', 'copilot.microsoft.com',
]

function detectAiEngineReferrer(referrer: string): string | null {
  if (!referrer) return null
  try {
    const host = new URL(referrer).hostname
    return AI_ENGINE_DOMAINS.find(d => host === d || host.endsWith(`.${d}`)) ?? null
  } catch {
    return null
  }
}

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
      const aiEngine = detectAiEngineReferrer(document.referrer)
      ph.capture('$pageview', {
        $current_url: window.location.href,
        ...(aiEngine ? { visited_from_ai_engine: aiEngine } : {}),
      })
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

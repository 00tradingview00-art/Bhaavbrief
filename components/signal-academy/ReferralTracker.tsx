'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function Tracker() {
  const params = useSearchParams()
  const ref    = params.get('ref')

  useEffect(() => {
    if (!ref) return
    const refCode = ref.replace(/[^a-f0-9]/g, '').slice(0, 12)
    if (!refCode) return

    // Wait 10 seconds of dwell before counting — filters instant bounces
    const timeout = setTimeout(async () => {
      const key = 'bb_visitor_id'
      let vid = localStorage.getItem(key)
      if (!vid) { vid = crypto.randomUUID(); localStorage.setItem(key, vid) }

      try {
        const res = await fetch('/api/referral-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref: refCode, visitor_id: vid }),
        })
        if (res.ok) {
          const data = await res.json() as { unlocked?: boolean }
          if (data.unlocked) {
            // Visitor arrived via someone's referral link and that referrer just unlocked
            // Nothing to do on the visitor's side — the referrer sees it on Signal Academy
          }
        }
      } catch { /* non-fatal */ }
    }, 10_000)

    return () => clearTimeout(timeout)
  }, [ref])

  return null
}

export default function ReferralTracker() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  )
}

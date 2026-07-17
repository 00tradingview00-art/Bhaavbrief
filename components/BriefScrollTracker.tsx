'use client'

import { useEffect } from 'react'
import { trackSectionSeen, trackBriefReadComplete } from '@/lib/analytics'

/**
 * FIX-12 (D-16): per-section scroll depth on briefs — "which sections earn
 * the read", not just whether someone reached the bottom. Observes every
 * <h2> inside .brief-prose (rendered from the brief's own MDX section
 * headers — Price Bridge, Macro Thread, Historical Context, etc.) plus a
 * sentinel div at the very end for read-completion.
 */
export default function BriefScrollTracker({ edition }: { edition: string }) {
  useEffect(() => {
    const article = document.querySelector('.brief-prose')
    if (!article) return

    const seen = new Set<string>()
    const headings = Array.from(article.querySelectorAll('h2'))
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const text = entry.target.textContent?.trim()
          if (!text || seen.has(text)) continue
          seen.add(text)
          trackSectionSeen(edition, text)
        }
      },
      { threshold: 0.5 }
    )
    for (const h of headings) obs.observe(h)

    let completed = false
    const endObs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !completed) {
        completed = true
        trackBriefReadComplete(edition)
        endObs.disconnect()
      }
    })
    const endSentinel = document.getElementById('brief-end')
    if (endSentinel) endObs.observe(endSentinel)

    return () => { obs.disconnect(); endObs.disconnect() }
  }, [edition])

  return null
}

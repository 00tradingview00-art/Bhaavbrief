'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'

// Fixed floating CTA, tablet/desktop only (.bb-feedback-pill in globals.css
// shows it at >=768px) — below that, BottomNav already pins 5 tabs to the
// bottom of the screen (app/globals.css .bb-bottom-nav, <=767px); stacking
// a second fixed element there would overlap it or crowd the one-handed
// thumb zone. Mobile visitors still reach the same /feedback page via the
// footer's "Feedback" text link.
export default function FeedbackPill() {
  const pathname = usePathname()
  if (pathname === '/feedback') return null

  return (
    <Link
      href="/feedback"
      onClick={() => trackEvent('feedback_pill_clicked')}
      className="bb-feedback-pill"
      aria-label="Give feedback on BhaavBrief"
    >
      Give Feedback
    </Link>
  )
}

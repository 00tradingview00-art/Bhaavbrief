'use client'

import { useEffect, useState, useRef } from 'react'
import SubscribeForm from './SubscribeForm'
import { trackSubscribeShown } from '@/lib/analytics'

const STORAGE_KEY = 'bb_capture_last_shown'
const FREQUENCY_CAP_MS = 7 * 24 * 60 * 60 * 1000 // once per 7 days
const DWELL_MS = 45_000
const SCROLL_TRIGGER_RATIO = 0.6

function alreadySubscribed(): boolean {
  return document.cookie.split(';').some((c) => c.trim() === 'bb_sub=1')
}

function recentlyShown(): boolean {
  try {
    const last = localStorage.getItem(STORAGE_KEY)
    return !!last && Date.now() - parseInt(last, 10) < FREQUENCY_CAP_MS
  } catch {
    return false // localStorage unavailable (private mode etc.) — fail open, show it
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch { /* non-fatal */ }
}

/**
 * FIX-12 (D-16): retention modal — triggers on 45s dwell OR 60% scroll,
 * whichever comes first, capped to once per 7 days per visitor. Never shows
 * to an already-subscribed visitor (bb_sub cookie, set by SubscribeForm on
 * success).
 */
export default function EmailCaptureModal({ location = 'brief_page_modal' }: { location?: string }) {
  const [visible, setVisible] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    if (alreadySubscribed() || recentlyShown()) return

    function trigger() {
      if (shownRef.current) return
      shownRef.current = true
      markShown()
      setVisible(true)
      trackSubscribeShown(location)
    }

    const timer = setTimeout(trigger, DWELL_MS)

    function onScroll() {
      const scrolled = window.scrollY + window.innerHeight
      const total = document.documentElement.scrollHeight
      if (total > 0 && scrolled / total >= SCROLL_TRIGGER_RATIO) trigger()
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [location])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(24,24,15,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom, 0)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setVisible(false) }}
    >
      <div style={{
        background: '#FAFAF6', borderTop: '1px solid #DDDDD0',
        maxWidth: 480, width: '100%', padding: '1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0))',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -8 }}>
          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#8A8A7A', padding: 4 }}
          >
            ×
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
          Before you go
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
          Tomorrow&apos;s brief, plus yesterday&apos;s edge resolved
        </div>
        <p style={{ fontSize: 13, color: '#48483A', lineHeight: 1.6, marginBottom: '1rem' }}>
          Every morning by 9:30 AM IST — MCX gold, crude, silver analysis, and whether yesterday&apos;s
          Edge of the Day call actually held up.
        </p>
        <SubscribeForm compact location={location} onSuccess={() => setVisible(false)} />
      </div>
    </div>
  )
}

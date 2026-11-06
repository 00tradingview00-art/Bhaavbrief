'use client'
import { useEffect } from 'react'

// Shared by every overlay/dialog component (MobileMenu, SearchModal,
// EmailCaptureModal): while one is open, the page content behind it must not
// stay reachable by keyboard or an accessibility-tree reader — a dialog that
// visually covers the page but leaves background links/buttons focusable is
// the same contradiction Lighthouse's Agentic Browsing audit flags for
// aria-hidden content (see ProBlurGate.tsx). `inert` is the platform
// primitive that actually removes focusability/tab order/pointer
// interaction, regardless of what's rendered inside these targets.
const TARGETS = ['.bb-site-nav', '.bb-main', '.bb-footer']

// Module-level counter, not a plain boolean: if two of these ever end up
// open at once, the first one to close must not re-enable the background
// while the second is still open.
let openCount = 0

export function useModalInert(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    openCount++
    const els = TARGETS
      .map(selector => document.querySelector<HTMLElement>(selector))
      .filter((el): el is HTMLElement => el !== null)
    els.forEach(el => { el.inert = true })
    return () => {
      openCount--
      if (openCount === 0) els.forEach(el => { el.inert = false })
    }
  }, [isOpen])
}

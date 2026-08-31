'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/** After Cashfree return_url → /pro?paid=1, poll until webhook sets isPro. */
export default function ProPaidPoller() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('paid') !== '1') return
    let cancelled = false
    setMessage('Payment received — activating Pro…')

    ;(async () => {
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000))
        if (cancelled) return
        const res = await fetch('/api/cashfree/poll-status')
        if (res.ok) {
          const { isPro } = await res.json()
          if (isPro) {
            router.replace('/options')
            return
          }
        }
      }
      if (!cancelled) {
        setMessage('Payment received — Pro is activating. Check My Account in a minute.')
      }
    })()

    return () => { cancelled = true }
  }, [searchParams, router])

  if (!message) return null

  return (
    <div
      role="status"
      style={{
        marginBottom: '1.5rem',
        padding: '0.85rem 1rem',
        borderRadius: 8,
        background: 'var(--surface-3)',
        border: '1px solid var(--border)',
        fontSize: '0.85rem',
        color: 'var(--ink)',
        textAlign: 'center',
      }}
    >
      {message}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useIsPro } from './useIsPro'

// Pro-only chart data for ISR pages: fetched from /api/pro/data only once the
// visitor is confirmed Pro, so the real series never ships in the shared
// cached HTML. Non-Pro visitors never trigger a request.
export function useProData<T>(query: string): { isPro: boolean; data: T | null; failed: boolean } {
  const isPro = useIsPro()
  const [data, setData] = useState<T | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isPro) return
    let cancelled = false
    setFailed(false)
    fetch(`/api/pro/data?${query}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: T) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [isPro, query])

  return { isPro, data, failed }
}

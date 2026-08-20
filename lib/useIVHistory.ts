'use client'

import { useEffect, useState } from 'react'
import type { IVHistoryPoint } from '@/lib/ivAnalysis'

// Shared by OptionChain.tsx and StrategyBuilder.tsx — both need the same
// per-instrument daily ATM IV series from /api/options/iv-history. Real gaps
// (missed cron snapshot days) are left as gaps, never interpolated.
export function useIVHistory(instrument: string) {
  const [history, setHistory] = useState<IVHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fetch(`/api/options/iv-history?instrument=${instrument}`)
      .then(res => { if (!res.ok) throw new Error('bad response'); return res.json() })
      .then((json: { history: IVHistoryPoint[] }) => { if (!cancelled) setHistory(json.history ?? []) })
      .catch(() => { if (!cancelled) setError('unavailable') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [instrument])

  return { history, loading, error }
}

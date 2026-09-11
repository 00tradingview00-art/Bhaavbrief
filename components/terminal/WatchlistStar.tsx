'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bb_terminal_watchlist'

function readWatchlist(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    // localStorage unavailable (private mode, disabled, etc.) — fail open,
    // star just won't persist for this viewer.
    return new Set()
  }
}

function writeWatchlist(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // ignore — nothing to persist to
  }
}

// Per-viewer watchlist toggle. Purely a local convenience (which cards to
// glance at first); not synced anywhere, no server involved.
export default function WatchlistStar({ instrumentKey }: { instrumentKey: string }) {
  const [starred, setStarred] = useState(false)

  useEffect(() => {
    setStarred(readWatchlist().has(instrumentKey))
  }, [instrumentKey])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const set = readWatchlist()
    if (set.has(instrumentKey)) set.delete(instrumentKey)
    else set.add(instrumentKey)
    writeWatchlist(set)
    setStarred(set.has(instrumentKey))
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={starred}
      title={starred ? 'Remove from watchlist' : 'Add to watchlist'}
      style={{
        flex: 'none', width: 22, height: 22, borderRadius: 'var(--radius-sm)', border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: starred ? 'var(--gold)' : 'var(--ink-4)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <polygon points="12 2 15.09 8.63 22 9.27 16.5 14.14 18.18 21 12 17.27 5.82 21 7.5 14.14 2 9.27 8.91 8.63 12 2" />
      </svg>
    </button>
  )
}

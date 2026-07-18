'use client'
import { useEffect } from 'react'

const STORAGE_KEY = 'bb_commodity_visits'
const MAX_STORED = 12

export interface CommodityVisit {
  slug: string
  name: string
  ts: number
}

export default function CommodityVisitTracker({ slug, name }: { slug: string; name: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const existing: CommodityVisit[] = raw ? JSON.parse(raw) : []
      const next = [{ slug, name, ts: Date.now() }, ...existing.filter(v => v.slug !== slug)]
        .slice(0, MAX_STORED)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — visit just isn't remembered
    }
  }, [slug, name])

  return null
}

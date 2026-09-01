import { Suspense } from 'react'
import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { isProUser } from '@/lib/subscription'
import { getBasisHistory, type BasisPoint } from '@/lib/basis'
import SectionTabs from '@/components/SectionTabs'
import BasisClient from './BasisClient'
import { safeJsonLd } from '@/lib/seo'

export const revalidate = 900

export const metadata: Metadata = {
  title:       'MCX Commodity Basis — BhaavBrief',
  description: 'Live import-parity spread for MCX Gold, Silver, and Crude Oil vs COMEX/WTI benchmarks.',
  keywords:    [
    'MCX gold basis today India', 'MCX silver basis India', 'MCX crude oil basis today',
    'MCX COMEX gold premium India', 'MCX import parity gold silver crude',
    'MCX basis explained', 'commodity basis India',
  ],
}

const SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      '@id': 'https://bhaavbrief.in/basis',
      name: 'MCX Commodity Basis',
      description: '% premium/discount of MCX Gold, Silver, and Crude Oil price vs import parity (COMEX/WTI × USDINR conversion), 30-day trailing mean and standard deviation.',
      url: 'https://bhaavbrief.in/basis',
      creator: { '@type': 'Organization', name: 'BhaavBrief', url: 'https://bhaavbrief.in' },
      variableMeasured: ['Gold basis %', 'Silver basis %', 'Crude Oil basis %'],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://bhaavbrief.in' },
        { '@type': 'ListItem', position: 2, name: 'MCX Commodity Basis' },
      ],
    },
  ],
}

function calcStats(history: BasisPoint[], key: keyof BasisPoint) {
  const vals = history.map(p => p[key]).filter((v): v is number => typeof v === 'number')
  if (!vals.length) return null
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length
  const std = Math.sqrt(variance)
  return { mean, std, latest: vals[vals.length - 1] ?? null }
}

export default async function BasisPage() {
  const { userId } = await auth()
  const isPro = await isProUser(userId)
  const history = getBasisHistory()
  // Stats are labeled "30d avg"/"±1σ" in the UI — compute them over the same
  // trailing 30-day window, not the full accumulated history (which keeps
  // growing past 30 days and would silently drift the "30d" figure).
  const last30 = history.slice(-30)

  const commodities = [
    {
      id:    'gold',
      label: 'Gold',
      unit:  'INR/10g vs COMEX',
      key:   'goldSpreadPct' as const,
      stats: calcStats(last30, 'goldSpreadPct'),
    },
    {
      id:    'silver',
      label: 'Silver',
      unit:  'INR/kg vs COMEX',
      key:   'silverSpreadPct' as const,
      stats: calcStats(last30, 'silverSpreadPct'),
    },
    {
      id:    'crude',
      label: 'Crude Oil',
      unit:  'INR/bbl vs WTI',
      key:   'crudeSpreadPct' as const,
      stats: calcStats(last30, 'crudeSpreadPct'),
    },
    // Copper deliberately excluded: lib/basis.ts's copperSpreadPct is a
    // permanent null stub (no COMEX HG price feed wired up yet) — shipping an
    // empty "coming soon" tile inside a paid dashboard is worse than not
    // listing it. Add back once lib/basis.ts computes it for real.
  ]

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'var(--font-sans)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(SCHEMA) }} />
      <SectionTabs
        active="/basis"
        tabs={[
          { label: 'Futures', href: '/markets' },
          { label: 'Basis',   href: '/basis' },
        ]}
      />
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.25rem' }}>
        MCX Commodity Basis
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
        % premium / discount of MCX price vs import parity (COMEX × USDINR conversion)
      </p>

      <Suspense fallback={null}>
        <BasisClient
          commodities={commodities}
          history={history}
          isPro={isPro}
        />
      </Suspense>
    </main>
  )
}

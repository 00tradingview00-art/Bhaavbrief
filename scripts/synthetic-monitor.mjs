#!/usr/bin/env node
/**
 * scripts/synthetic-monitor.mjs — Part 4 (M-01..M-07) synthetic monitoring.
 *
 * Runs from GitHub Actions, external to the app's own runtime, hitting real
 * production URLs — checks what a user actually sees, not what the pipeline
 * thinks it did. This is the layer that would have caught the May 27 feed
 * death in minutes instead of 51 days: nothing in this script trusts local
 * repo state as ground truth, only the live HTTP response.
 *
 * Usage: node scripts/synthetic-monitor.mjs
 * Env:   MONITOR_BASE_URL (default https://bhaavbrief.in)
 * Exit:  0 = all checks passed, 1 = one or more checks failed (see issues[])
 */

import { todayIST, isTradingHoliday } from './lib/holidays.js'
import { checkSitemapShape, expectedSitemapCount } from './lib/sitemapCheck.mjs'

const BASE = process.env.MONITOR_BASE_URL ?? 'https://bhaavbrief.in'
const CROSS_CHECK_ROUTES = ['/', '/briefs', '/options']
const GOLD_PRICE_SPREAD_TOLERANCE_PCT = Number(process.env.MONITOR_GOLD_SPREAD_TOLERANCE_PCT ?? '1')
const FEED_STALE_HOURS = Number(process.env.MONITOR_FEED_STALE_HOURS ?? '24')
const DEADMAN_DEADLINE_IST_MINUTES = 9 * 60 + 45 // M-03: 9:45 AM IST

export function isMCXOpenIST(now = new Date()) {
  // Mirrors components/TickerStrip.tsx's isMCXOpen() — same UTC-window logic,
  // valid because the 3:30-18:00 UTC trading window never crosses an IST
  // calendar-day boundary (03:30 UTC = 09:00 IST, 18:00 UTC = 23:30 IST,
  // same date both ends).
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mins >= 210 && mins <= 1080
}

export function istMinutesNow(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600000)
  return ist.getUTCHours() * 60 + ist.getUTCMinutes()
}

async function fetchText(routePath, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE}${routePath}`, {
      headers: { 'User-Agent': 'BhaavBrief-SyntheticMonitor/1.0' },
      signal: controller.signal,
    })
    const rawText = await res.text()
    // React/Next.js inserts <!-- --> hydration boundary comments between
    // adjacent JSX text expressions (e.g. `{a}{b}` renders as `a<!-- -->b`) —
    // strip them so extraction regexes see the text a browser would render.
    const text = rawText.replace(/<!--\s*-->/g, '')
    return { status: res.status, text }
  } finally {
    clearTimeout(timer)
  }
}

export function extractBuildId(html) {
  return html.match(/<meta name="bb-build" content="([^"]*)"/)?.[1] ?? null
}

export function extractGoldPrice(html) {
  return html.match(/MCX GOLD<\/span>\s*<span[^>]*>([^<]+)<\/span>/)?.[1] ?? null
}

export function extractGeneratedAt(html) {
  return html.match(/as of ([^<]+)</)?.[1]?.trim() ?? null
}

export function priceToNumber(priceStr) {
  if (!priceStr) return null
  const n = parseFloat(priceStr.replace(/[₹,]/g, ''))
  return Number.isFinite(n) ? n : null
}

async function run() {
  const issues = []
  const results = {}
  const pages = {}

  for (const route of CROSS_CHECK_ROUTES) {
    try {
      const { status, text } = await fetchText(route)
      pages[route] = { status, text }
      if (status !== 200) issues.push(`M-01: ${route} returned HTTP ${status}`)
    } catch (e) {
      pages[route] = { status: 0, text: '' }
      issues.push(`M-01: ${route} fetch failed: ${e.message}`)
    }
  }

  // M-01: build ID uniformity across routes — the two-builds detector.
  const buildIds = Object.fromEntries(CROSS_CHECK_ROUTES.map((r) => [r, extractBuildId(pages[r]?.text ?? '')]))
  const knownBuildIds = Object.values(buildIds).filter(Boolean)
  results.buildIds = buildIds
  if (knownBuildIds.length === 0) {
    issues.push('M-01: bb-build meta tag not found on any route — cannot verify build uniformity')
  } else if (new Set(knownBuildIds).size > 1) {
    issues.push(`M-01: build ID mismatch across routes — two builds serving simultaneously: ${JSON.stringify(buildIds)}`)
  }

  const marketOpen = isMCXOpenIST()
  const tradingDay = !isTradingHoliday()
  results.marketOpen = marketOpen
  results.tradingDay = tradingDay

  // M-02: ticker "as of" timestamp present during market hours (frozen-ticker
  // signature is its total absence — the strip doesn't render at all with no data).
  const generatedAt = extractGeneratedAt(pages['/']?.text ?? '')
  results.tickerGeneratedAt = generatedAt
  if (marketOpen && !generatedAt) {
    issues.push('M-02: homepage ticker "as of" timestamp missing during market hours — possible frozen/dead ticker')
  }

  // M-06: cross-page gold price consistency (same underlying snapshot, so
  // divergence beyond a tolerance means two pages are serving different data).
  const goldPrices = Object.fromEntries(
    CROSS_CHECK_ROUTES.map((r) => [r, priceToNumber(extractGoldPrice(pages[r]?.text ?? ''))])
  )
  results.goldPrices = goldPrices
  const knownPrices = Object.values(goldPrices).filter((v) => v !== null)
  if (knownPrices.length >= 2) {
    const max = Math.max(...knownPrices)
    const min = Math.min(...knownPrices)
    const spreadPct = min > 0 ? ((max - min) / min) * 100 : 0
    results.goldPriceSpreadPct = Math.round(spreadPct * 100) / 100
    if (spreadPct > GOLD_PRICE_SPREAD_TOLERANCE_PCT) {
      issues.push(`M-06: cross-page MCX gold price diverges ${spreadPct.toFixed(2)}% (tolerance ${GOLD_PRICE_SPREAD_TOLERANCE_PCT}%) — ${JSON.stringify(goldPrices)}`)
    }
  }

  // M-03: dead-man's switch — /briefs must not show the delayed-edition
  // banner past 9:45 IST on a trading day. Reads the page's own honest
  // signal (already computed from the real edition dates by
  // lib/tradingCalendar.ts's isTodaysBriefDelayed) rather than recomputing
  // "today's edition number" independently — still meaningfully external
  // because it asserts against the live served HTML, not local repo state.
  if (tradingDay && istMinutesNow() >= DEADMAN_DEADLINE_IST_MINUTES) {
    const briefsHtml = pages['/briefs']?.text ?? ''
    if (/Today.{1,6}s edition is delayed/.test(briefsHtml)) {
      issues.push('M-03: /briefs shows the delayed-edition banner past 9:45 IST on a trading day — today\'s brief missing')
    }
  }

  // M-04: feed freshness.
  try {
    const { status, text } = await fetchText('/feed.xml')
    if (status !== 200) {
      issues.push(`M-04: /feed.xml returned HTTP ${status}`)
    } else {
      const dateMatch = text.match(/<lastBuildDate>([^<]+)<\/lastBuildDate>/) ?? text.match(/<pubDate>([^<]+)<\/pubDate>/)
      if (!dateMatch) {
        issues.push('M-04: /feed.xml has no parseable lastBuildDate/pubDate')
      } else {
        const ageHours = (Date.now() - new Date(dateMatch[1]).getTime()) / 3600000
        results.feedAgeHours = Math.round(ageHours * 10) / 10
        if (tradingDay && ageHours > FEED_STALE_HOURS) {
          issues.push(`M-04: /feed.xml newest item is ${ageHours.toFixed(1)}h old (> ${FEED_STALE_HOURS}h)`)
        }
      }
    }
  } catch (e) {
    issues.push(`M-04: /feed.xml fetch failed: ${e.message}`)
  }

  // M-05: options page risk-free-rate "as of" reflects the current month.
  // The rate itself is a manually-set monthly constant (lib/options.ts,
  // no live MIBOR feed yet — see Part 7 deferral), so day-level precision
  // isn't meaningful; month-level staleness is what this can honestly assert.
  const optionsHtml = pages['/options']?.text ?? ''
  const rfMatch = optionsHtml.match(/risk-free rate \(as of ([^)]+)\)/)
  if (!rfMatch) {
    issues.push('M-05: could not find risk-free rate "as of" text on /options')
  } else {
    const asOf = rfMatch[1].trim()
    const currentMonth = todayIST().slice(0, 7)
    results.riskFreeAsOf = asOf
    if (asOf !== '—' && !asOf.startsWith(currentMonth)) {
      issues.push(`M-05: options risk-free rate "as of ${asOf}" is not the current month (${currentMonth})`)
    }
  }

  // M-07: sitemap shape — no /flash|/articles URLs (deliberately excluded and
  // noindex'd 2026-07-21 after 77% of a 467-URL sitemap turned out to be
  // never-indexed feed items), and total count within ±2 of the composition
  // the route intends (statics + published briefs + arcs + events). The
  // exclusion assertion is purely live; the expected count is the one
  // deliberate exception to this file's "never trust local repo state"
  // rule — it's derived from the checkout at HEAD (synthetic-monitor.yml
  // does a full checkout), which is exactly the intent the live sitemap is
  // being checked against.
  try {
    const { status, text } = await fetchText('/sitemap.xml')
    if (status !== 200) {
      issues.push(`M-07: /sitemap.xml returned HTTP ${status}`)
    } else {
      const expected = expectedSitemapCount()
      results.sitemapUrlCount = (text.match(/<loc>/g) ?? []).length
      results.sitemapExpectedCount = expected
      issues.push(...checkSitemapShape(text, expected))
    }
  } catch (e) {
    issues.push(`M-07: sitemap check failed: ${e.message}`)
  }

  return { issues, results, checkedAt: new Date().toISOString(), baseUrl: BASE }
}

async function main() {
  const report = await run()
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.issues.length > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('FATAL: synthetic-monitor.mjs crashed:', e)
  process.exit(1)
})

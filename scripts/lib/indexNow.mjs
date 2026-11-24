/**
 * scripts/lib/indexNow.mjs — pings IndexNow (Bing, Yandex and other
 * participating engines) when new content publishes, instead of waiting for
 * a routine recrawl.
 *
 * Why this exists: an AI-visibility research pass (23 Nov 2026) found
 * BhaavBrief scored 0/8 on the most date-specific prompts tested ("What
 * moved MCX gold and silver today?", "today's morning brief", etc.) despite
 * publishing exactly this content daily — not a content gap, a discovery-lag
 * one. That day's brief was live on Home and in the news-sitemap within
 * minutes of publishing, but two fresh ChatGPT web searches still missed it.
 * ChatGPT's web-search tool leans on Bing's index for a meaningful share of
 * its results, making IndexNow (which Bing/Yandex honour; Google does not
 * participate) a plausible lever on exactly this gap, not just a generic SEO
 * nicety.
 *
 * Deliberately fire-and-forget: a failed ping must never fail a publish.
 * Every call site wraps this in its own try/catch and only warns.
 */

const KEY = '3fb28b04b2cd9b5cb70b2d3c795f5909'
const HOST = 'bhaavbrief.in'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`

/**
 * @param {string[]} urls - absolute https://bhaavbrief.in/... URLs, newly
 *   published or meaningfully updated. 1-10,000 per IndexNow's own limit;
 *   this codebase only ever calls it with a handful at a time.
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<{ok: boolean, status?: number}>}
 */
export async function pingIndexNow(urls, { timeoutMs = 8000 } = {}) {
  const urlList = urls.filter((u) => typeof u === 'string' && u.startsWith(`https://${HOST}/`))
  if (urlList.length === 0) return { ok: false }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  // IndexNow's own spec: 200 or 202 both mean accepted.
  return { ok: res.ok, status: res.status }
}

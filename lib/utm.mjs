/**
 * lib/utm.mjs — per-channel UTM constants for outbound distribution links.
 * Plain .mjs (not .ts) so both TypeScript app code (tsconfig allowJs: true)
 * and plain-Node distribution scripts (scripts/post-telegram-broadcast.mjs,
 * scripts/post-shorts-youtube.mjs — .mjs can't import .ts directly) can use
 * the same source of truth. Lets GA4 split traffic by channel without any
 * new events — just consistent query params on every outbound link.
 */

export const UTM_SOURCE = {
  telegram: 'telegram',
  youtube: 'youtube',
  instagram: 'instagram',
  whatsapp: 'whatsapp',
  x: 'x',
}

export const UTM_MEDIUM = {
  broadcast: 'broadcast', // one-way channel post (Telegram, YouTube, Instagram)
  share: 'share',         // a reader-initiated share (CopyLinkButton)
}

/**
 * @param {string} url - a bhaavbrief.in URL, with or without existing query params
 * @param {{ source: string, medium: string, campaign?: string }} params
 */
export function withUtm(url, { source, medium, campaign }) {
  const u = new URL(url)
  u.searchParams.set('utm_source', source)
  u.searchParams.set('utm_medium', medium)
  if (campaign) u.searchParams.set('utm_campaign', campaign)
  return u.toString()
}

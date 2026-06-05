/**
 * Pexels image helper — picks a relevant landscape photo for a flash article.
 * Returns a photo URL string, or null on failure / missing key.
 */

export function getPexelsQuery(title, category) {
  const t = title.toLowerCase()
  if (/iran|iraq|hormuz|middle.east|israel|lebanon|gulf|tehran/.test(t)) return 'oil tanker gulf'
  if (/russia|ukraine|pipeline|gazprom/.test(t))                         return 'natural gas pipeline'
  if (/red.sea|suez|shipping|cargo/.test(t))                             return 'cargo ship sea'
  if (/opec|saudi|aramco|production.cut/.test(t))                        return 'oil rig petroleum'
  if (/gold|bullion/.test(t))                                            return 'gold bars bullion'
  if (/silver/.test(t))                                                  return 'silver metal bars'
  if (/copper|lme/.test(t))                                              return 'copper industrial metal'
  if (/crude|brent|wti|petroleum/.test(t))                               return 'crude oil refinery'
  if (/natural.gas|lng|henry.hub/.test(t))                               return 'natural gas plant'
  if (/rbi|reserve.bank|rupee|inr/.test(t))                              return 'indian rupee currency'
  if (/sebi|circular|exchange|mcx|nse/.test(t))                          return 'stock exchange trading floor'
  if (/monsoon|agri|crop|wheat|cotton/.test(t))                          return 'india agriculture farm'
  if (/fed|federal.reserve|rate.hike|powell/.test(t))                    return 'federal reserve dollar'
  if (/china|beijing|tariff|trade.war/.test(t))                          return 'shipping containers trade'
  if (/sanction/.test(t))                                                return 'oil barrel sanctions'
  if (category === 'energy')      return 'oil refinery energy'
  if (category === 'metals')      return 'gold silver commodity'
  if (category === 'forex')       return 'currency exchange rupee'
  if (category === 'regulatory')  return 'financial regulation exchange'
  if (category === 'policy')      return 'india parliament finance'
  if (category === 'geopolitical') return 'world map geopolitics'
  if (category === 'agri')         return 'india agriculture farm field'
  if (/jeera|cumin/.test(t))       return 'cumin spice india'
  if (/turmeric|haldi/.test(t))    return 'turmeric powder india'
  if (/chana|gram|chickpea/.test(t)) return 'chickpea grain india'
  if (/guar/.test(t))              return 'guar farming india'
  if (/mustard|sarson/.test(t))    return 'mustard field india'
  if (/soybean|soya/.test(t))      return 'soybean agriculture'
  if (/castor/.test(t))            return 'castor crop india'
  if (/zinc/.test(t))              return 'zinc metal industrial'
  if (/aluminium/.test(t))         return 'aluminium metal industrial'
  if (/nickel/.test(t))            return 'nickel metal mining'
  if (/lead|battery/.test(t))      return 'lead battery industrial'
  return 'commodity trading market'
}

// Stable hash of the article title so each unique title picks a different
// photo from the result pool — prevents two same-topic articles sharing the same image.
function titleHash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export async function fetchPexelsImage(title, category) {
  const key = process.env.PEXELS_API_KEY
  if (!key) {
    console.warn('  [pexels] PEXELS_API_KEY not set — skipping cover image')
    return null
  }

  const query = getPexelsQuery(title, category)
  const hash  = titleHash(title ?? '')
  const page  = (hash % 3) + 1   // pages 1–3 for variety without burning quota

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&page=${page}&orientation=landscape&size=medium`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) {
      console.warn(`  [pexels] API error ${res.status} for query "${query}"`)
      return null
    }
    const data   = await res.json()
    const photos = data.photos ?? []
    if (!photos.length) {
      console.warn(`  [pexels] No photos returned for query "${query}"`)
      return null
    }
    const photo = photos[hash % photos.length]
    return photo.src?.large2x ?? photo.src?.large ?? null
  } catch (e) {
    console.warn(`  [pexels] Fetch failed: ${e.message}`)
    return null
  }
}

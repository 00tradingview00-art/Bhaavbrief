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
  return 'commodity trading market'
}

export async function fetchPexelsImage(title, category) {
  const key = process.env.PEXELS_API_KEY
  if (!key) return null

  const query = getPexelsQuery(title, category)
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=medium`,
      { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const photo = data.photos?.[0]
    return photo?.src?.large2x ?? photo?.src?.large ?? null
  } catch {
    return null
  }
}

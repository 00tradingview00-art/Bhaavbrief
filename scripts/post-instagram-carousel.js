// Post a multi-slide carousel to Instagram.
// Usage: TOPIC=what-moves-mcx node scripts/post-instagram-carousel.js
// Defaults to "what-moves-mcx" (7 slides).

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN
const TOPIC    = process.env.TOPIC ?? 'what-moves-mcx'
const BASE_URL = process.env.BASE_URL ?? 'https://bhaavbrief.in'

const CAROUSEL_CONFIG = {
  'what-moves-mcx': {
    slides: 7,
    caption: [
      '5 MCX Commodities — What Moves Each One 📊',
      '',
      'Every weekday at 9:30 AM, BhaavBrief breaks down what moved overnight and why it matters for MCX markets.',
      '',
      'Swipe through to understand the drivers behind Gold, Silver, Crude, Copper, and NatGas — the 5 contracts that define the Indian commodity market.',
      '',
      '🔗 Full daily brief at bhaavbrief.in (link in bio)',
      '',
      '#MCXGold #MCXSilver #MCXCrude #MCXCopper #MCXNatGas #BhaavBrief #MCX #CommodityMarkets #IndianMarkets #TradingEducation #MCXTrading',
    ].join('\n'),
  },
}

async function waitForContainer(containerId, retries = 10) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    console.log(`  Container ${containerId}: ${d.status_code ?? 'PENDING'} (attempt ${i + 1}/${retries})`)
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container failed: ${JSON.stringify(d)}`)
  }
  return true
}

async function createChildContainer(imageUrl) {
  const r = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      is_carousel_item: true,
      access_token: IG_TOKEN,
    }),
  })
  const d = await r.json()
  if (d.error) throw new Error(`Child container error: ${d.error.message}`)
  if (!d.id)   throw new Error(`No ID returned for child: ${JSON.stringify(d)}`)
  return d.id
}

async function main() {
  if (!IG_USER || !IG_TOKEN) {
    console.error('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not set')
    process.exit(1)
  }

  const config = CAROUSEL_CONFIG[TOPIC]
  if (!config) {
    console.error(`Unknown topic: ${TOPIC}. Available: ${Object.keys(CAROUSEL_CONFIG).join(', ')}`)
    process.exit(1)
  }

  console.log(`\nPosting carousel: ${TOPIC} (${config.slides} slides)\n`)

  // Step 1 — Create child media containers for each slide
  // Uses static JPEG files (served from /instagram/) — Instagram requires JPEG for carousel items
  const childIds = []
  for (let i = 1; i <= config.slides; i++) {
    const url = `${BASE_URL}/instagram/carousel-${TOPIC}-slide-${i}.jpg?v=${Date.now()}`
    console.log(`Creating child container for slide ${i}: ${url}`)
    const id = await createChildContainer(url)
    console.log(`  → Child container: ${id}`)
    childIds.push(id)
    // Small pause between requests to avoid rate limits
    if (i < config.slides) await new Promise(r => setTimeout(r, 1000))
  }

  console.log(`\nWaiting for ${childIds.length} child containers to finish processing...`)
  for (const id of childIds) {
    await waitForContainer(id)
  }

  // Step 2 — Create carousel container
  console.log('\nCreating carousel container...')
  const carouselRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption: config.caption,
      access_token: IG_TOKEN,
    }),
  })
  const carouselData = await carouselRes.json()
  if (carouselData.error) throw new Error(`Carousel container error: ${carouselData.error.message}`)
  if (!carouselData.id)   throw new Error(`No carousel container ID: ${JSON.stringify(carouselData)}`)

  console.log(`Carousel container created: ${carouselData.id}`)
  console.log('Waiting for carousel container to process...')
  await waitForContainer(carouselData.id)

  // Step 3 — Publish
  console.log('\nPublishing carousel...')
  const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: IG_TOKEN }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) throw new Error(`Publish error: ${publishData.error.message}`)
  if (!publishData.id)   throw new Error(`No post ID: ${JSON.stringify(publishData)}`)

  console.log(`\n✓ Carousel posted to Instagram: ${publishData.id}`)
  console.log(`  Topic: ${TOPIC} | Slides: ${config.slides}`)
}

main().catch(e => { console.error('\nCarousel posting failed:', e.message); process.exit(1) })

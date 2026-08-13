/**
 * scripts/post-image-instagram.js
 *
 * Posts a single static image to Instagram given IMAGE_URL and CAPTION.
 * Generic helper — used by the P&L card and any other one-off static posts.
 *
 * Usage:
 *   IMAGE_URL=https://... CAPTION="..." node scripts/post-image-instagram.js
 */

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

const IG_USER   = process.env.INSTAGRAM_USER_ID
const IG_TOKEN  = process.env.INSTAGRAM_ACCESS_TOKEN
const IMAGE_URL = process.env.IMAGE_URL
const CAPTION   = process.env.CAPTION ?? ''

if (!IG_USER || !IG_TOKEN) {
  console.log('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not configured — skipping')
  process.exit(0)
}
if (!IMAGE_URL) {
  console.error('IMAGE_URL environment variable required')
  process.exit(1)
}

async function pollContainer(containerId, retries = 8) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container failed: ${JSON.stringify(d)}`)
    console.log(`Container: ${d.status_code ?? 'PENDING'} (${i + 1}/${retries})`)
  }
  return true
}

async function main() {
  console.log(`Posting image: ${IMAGE_URL.slice(0, 80)}...`)

  const createRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: IMAGE_URL, caption: CAPTION, access_token: IG_TOKEN }),
  })
  const createData = await createRes.json()
  if (createData.error) {
    console.error('Container creation error:', createData.error.message)
    process.exit(1)
  }
  if (!createData.id) {
    console.error('No container ID:', JSON.stringify(createData))
    process.exit(1)
  }
  console.log(`Container: ${createData.id}`)

  await pollContainer(createData.id)

  const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: IG_TOKEN }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) {
    console.error('Publish error:', publishData.error.message)
    process.exit(1)
  }
  if (!publishData.id) {
    console.error('No post ID:', JSON.stringify(publishData))
    process.exit(1)
  }
  console.log(`✓ Posted: ${publishData.id}`)
}

main().catch(e => { console.error('Posting failed:', e.message); process.exit(1) })

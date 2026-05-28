import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envFile = join(__dirname, '../.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && !k.startsWith('#') && v.length && !process.env[k.trim()])
      process.env[k.trim()] = v.join('=').trim()
  }
}

const EDITION  = parseInt(process.env.EDITION ?? '1')
const IG_USER  = process.env.INSTAGRAM_USER_ID
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN

const TAG_HASHTAGS = {
  'MCX Gold':    '#MCXGold',
  'MCX Silver':  '#MCXSilver',
  'MCX Crude':   '#MCXCrude',
  'MCX Copper':  '#MCXCopper',
  'MCX NatGas':  '#MCXNatGas',
  'Macro':       '#MacroEconomics',
  'Geopolitics': '#Geopolitics',
  'OPEC':        '#OPEC',
  'RBI':         '#RBI',
  'Fed':         '#FederalReserve',
  'USD/INR':     '#USDINR',
  'Inflation':   '#Inflation',
}

async function checkContainerStatus(containerId, retries = 8) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${containerId}?fields=status_code&access_token=${IG_TOKEN}`
    )
    const d = await r.json()
    if (d.status_code === 'FINISHED') return true
    if (d.status_code === 'ERROR') throw new Error(`Container processing failed: ${JSON.stringify(d)}`)
    console.log(`Container status: ${d.status_code ?? 'PENDING'} (attempt ${i + 1}/${retries})`)
  }
  return true // proceed anyway after max retries
}

async function main() {
  if (!IG_USER || !IG_TOKEN) {
    console.log('INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN not configured — skipping')
    process.exit(0)
  }

  const slug    = `edition-${String(EDITION).padStart(3, '0')}`
  const mdxPath = join(process.cwd(), 'content/briefs', `${slug}.mdx`)
  if (!existsSync(mdxPath)) {
    console.error(`Brief not found: ${mdxPath}`)
    process.exit(0)
  }

  const { data } = matter(readFileSync(mdxPath, 'utf8'))
  const title    = data.title       ?? ''
  const desc     = data.description ?? ''
  const tags     = (data.tags ?? []).map(t => TAG_HASHTAGS[t]).filter(Boolean).join(' ')

  const imageUrl = `https://www.bhaavbrief.in/api/instagram-card/${slug}`
  const briefUrl = `https://www.bhaavbrief.in/briefs/${slug}`

  const caption = [
    title,
    '',
    desc,
    '',
    [tags, '#BhaavBrief #MCX #CommodityMarkets #IndianMarkets'].filter(Boolean).join(' '),
    '',
    `Read full brief → ${briefUrl}`,
  ].join('\n').trim()

  console.log(`Posting Edition #${EDITION} to Instagram`)
  console.log(`Image: ${imageUrl}`)

  // Step 1 — Create media container
  const createRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: IG_TOKEN }),
  })
  const createData = await createRes.json()
  if (createData.error) {
    console.error('Container creation error:', createData.error.message)
    process.exit(0)
  }
  if (!createData.id) {
    console.error('No container ID returned:', JSON.stringify(createData))
    process.exit(0)
  }
  console.log(`Container created: ${createData.id}`)

  // Step 2 — Wait for container to finish processing
  await checkContainerStatus(createData.id)

  // Step 3 — Publish
  const publishRes = await fetch(`https://graph.facebook.com/v22.0/${IG_USER}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: IG_TOKEN }),
  })
  const publishData = await publishRes.json()
  if (publishData.error) {
    console.error('Publish error:', publishData.error.message)
    process.exit(0)
  }
  if (!publishData.id) {
    console.error('No post ID returned:', JSON.stringify(publishData))
    process.exit(0)
  }

  console.log(`✓ Posted to Instagram: ${publishData.id}`)
}

main().catch(e => { console.error('Instagram posting failed:', e.message); process.exit(0) })

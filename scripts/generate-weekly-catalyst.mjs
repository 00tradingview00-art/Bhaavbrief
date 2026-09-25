#!/usr/bin/env node
/** Generate the Saturday Pro "Weekly Catalyst" from the week's verified site data. */
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { fileURLToPath } from 'node:url'
import { fetchPexelsImage } from './lib/pexels.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
const isoDate = Object.fromEntries(dateParts.map(p => [p.type, p.value]))
const date = `${isoDate.year}-${isoDate.month}-${isoDate.day}`
const outPath = path.join(ROOT, 'content/research', `${date}-weekly-catalyst.mdx`)
if (fs.existsSync(outPath)) { console.log('Weekly Catalyst already exists — skipping.'); process.exit(0) }
if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required')

function recentItems(dir) {
  const cutoff = Date.now() - 8 * 24 * 3600 * 1000
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(f => /\.mdx?$/.test(f)).flatMap(file => {
    try {
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'))
      const publishedAt = new Date(data.date).getTime()
      if (!data.title || !Number.isFinite(publishedAt) || publishedAt < cutoff) return []
      return [{ title: data.title, description: data.description ?? '', date: data.date, tags: data.tags ?? [] }]
    } catch { return [] }
  }).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 16)
}

const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/market-snapshot.json'), 'utf8'))
const events = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/event-map.json'), 'utf8')).events
  .filter(e => new Date(e.next_release_utc).getTime() >= Date.now())
  .sort((a, b) => a.next_release_utc.localeCompare(b.next_release_utc)).slice(0, 8)
const inputs = { snapshot: { generatedAtIST: snapshot.generatedAtIST, instruments: snapshot.instruments, derived: snapshot.derived, warnings: snapshot.warnings },
  week: [...recentItems(path.join(ROOT, 'content/flash')), ...recentItems(path.join(ROOT, 'content/articles'))],
  nextWeekEvents: events.map(e => ({ name: e.name, at: e.next_release_utc, contracts: e.affected_contracts, description: e.description_educational })) }

const prompt = `You write BhaavBrief Pro's Saturday WEEKLY CATALYST: a premium, evidence-led MCX memo, not a newsletter and not a list of feed posts. Choose ONE dominant economic, macro, policy, supply, or fundamental catalyst from the supplied verified inputs. Explain why it matters for the coming week, and use the rest only as a concise recap.

INPUTS (do not invent facts, dates, prices, policy actions, or historical statistics):\n${JSON.stringify(inputs, null, 2)}

Return exactly this format:\nTITLE: concise catalyst-led title (max 90 chars)\nDESCRIPTION: one sentence (max 180 chars)\nCOMMODITIES: comma-separated lower-case MCX commodities, max 4\nIMAGE_QUERY: 2-5 relevant visual words; never "chart", "candlestick", or "trading screen"\nBODY:\n[MDX]

BODY requirements: 700-950 words, with headings exactly: ## The catalyst; ## What changed this week; ## MCX transmission; ## Next-week scenario map; ## What would change the view; ## Dates that matter. Use a compact Markdown table for the scenario map. State conditional mechanisms, not buy/sell instructions or certain forecasts. Mention options positioning only if it exists in the supplied input. Make the recap subordinate to one clear thesis.`

const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: 'claude-opus-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }) })
if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`)
const text = (await res.json()).content?.find(b => b.type === 'text')?.text?.trim() ?? ''
const field = name => text.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
const body = text.split(/^BODY:\s*$/m)[1]?.trim() ?? ''
if (!field('TITLE') || !field('DESCRIPTION') || !body.startsWith('## The catalyst')) throw new Error('Weekly Catalyst response did not match the required format')
const title = field('TITLE').replace(/"/g, '\\"')
const description = field('DESCRIPTION').replace(/"/g, '\\"')
const commodities = field('COMMODITIES').split(',').map(x => x.trim().toLowerCase()).filter(x => /^[a-z]+$/.test(x)).slice(0, 4)
const coverImage = await fetchPexelsImage(`${field('IMAGE_QUERY')} ${field('TITLE')}`, 'macro')
const frontmatter = `---\ntitle: "${title}"\ndescription: "${description}"\ndate: "${date}"\ncommodity: "${commodities[0] ?? 'macro'}"\ncommodities: ${JSON.stringify(commodities)}\npremium: true\npublished: false\nedition: "weekly-catalyst"\ntags: ${JSON.stringify(['weekly-catalyst', 'macro', ...commodities])}${coverImage ? `\ncoverImage: "${coverImage}"` : ''}\n---\n\n`
fs.writeFileSync(outPath, frontmatter + body + '\n', 'utf8')
console.log(`Weekly Catalyst draft written: ${outPath}`)

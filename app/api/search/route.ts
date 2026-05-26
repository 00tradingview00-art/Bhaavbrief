import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { scoreEntries, buildContentContext, type ScoredEntry } from '@/lib/searchIndex'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface SearchResult {
  answer:         string
  answerType:     'conceptual' | 'lookup' | 'hybrid'
  contentMatches: ScoredEntry[]
  relatedQuestions: string[]
}

const SYSTEM_PROMPT = `You are BhaavBrief's intelligence assistant — a commodity markets expert focused on Indian commodity markets, primarily MCX-traded contracts.

YOUR KNOWLEDGE BASE:
- MCX commodities: Gold (₹/10g), Silver (₹/kg), Crude Oil (₹/bbl), Copper (₹/kg), Natural Gas (₹/mmBtu), Aluminium, Zinc, Nickel, Lead
- NCDEX agri: Soybean, Cardamom, Pepper, Cotton, Castor, Wheat
- Global price linkages: COMEX (Gold, Silver, Copper), NYMEX (WTI, Natural Gas), ICE Brent, LME base metals
- India-specific: USDINR impact on import parity, customs duty structure, PPAC petroleum pricing, RBI policy, GST on commodities
- Global macro: Fed policy, DXY, China demand cycles, OPEC+ production decisions, geopolitical supply risks (Hormuz, Red Sea, Russia/Ukraine)
- Technical: MCX contract specs, lot sizes, margin requirements, rollover mechanics, basis

WHAT YOU DO:
1. "conceptual" — educational question about how markets work, linkages, mechanics. Answer from knowledge.
2. "lookup" — user wants specific past BhaavBrief content (a brief from a date, about a commodity, etc.). Point to the content.
3. "hybrid" — both: answer the conceptual part AND surface relevant past content.

SEBI COMPLIANCE — NON-NEGOTIABLE:
- State data, never judge it. No buy/sell/accumulate/avoid/exit/hold calls.
- No predictive price targets. Use "historically" or "in past episodes" framing.
- Technical levels are observations, not triggers.
- Every answer is educational and informational only.
- Never recommend a specific trade, position size, or timing.

VOICE: Sharp, precise, India-focused. MCX trader reading this at 9 AM. No filler.

You will receive:
- The user's query
- Up to 5 relevant BhaavBrief content items (may be empty)

Respond with ONLY valid JSON in this exact shape:
{
  "answer": "2-4 sentence educational answer. SEBI compliant. If lookup-only, one sentence pointing to the content.",
  "answerType": "conceptual" | "lookup" | "hybrid",
  "relevantSlugs": ["slug1", "slug2"],
  "relatedQuestions": ["question 1?", "question 2?", "question 3?"]
}

relevantSlugs: only include slugs from the content list provided. Max 3. Empty array if none are relevant.
relatedQuestions: 3 follow-up questions the user might naturally ask next. Short, specific, commodity-focused.`

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ error: 'query too short' }, { status: 400 })
  }
  if (q.length > 300) {
    return NextResponse.json({ error: 'query too long' }, { status: 400 })
  }

  // Score content against query
  const topEntries = scoreEntries(q, 5)
  const contentCtx = buildContentContext(topEntries)

  // Call Claude
  let parsed: { answer: string; answerType: string; relevantSlugs: string[]; relatedQuestions: string[] }
  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system:     SYSTEM_PROMPT,
      messages: [{
        role:    'user',
        content: `Query: "${q}"\n\nRelevant BhaavBrief content:\n${contentCtx}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('[search] Claude error:', err)
    // Graceful fallback — return content matches without AI answer
    const result: SearchResult = {
      answer:           '',
      answerType:       'lookup',
      contentMatches:   topEntries,
      relatedQuestions: [],
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Map Claude's relevantSlugs back to full entry objects, preserving order
  const slugSet = new Set(parsed.relevantSlugs ?? [])
  const orderedMatches = [
    ...(parsed.relevantSlugs ?? []).map(slug => topEntries.find(e => e.slug === slug)).filter(Boolean),
    ...topEntries.filter(e => !slugSet.has(e.slug)),
  ].slice(0, 5) as ScoredEntry[]

  const result: SearchResult = {
    answer:           parsed.answer           ?? '',
    answerType:       (parsed.answerType as SearchResult['answerType']) ?? 'hybrid',
    contentMatches:   orderedMatches,
    relatedQuestions: (parsed.relatedQuestions ?? []).slice(0, 3),
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

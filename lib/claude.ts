// Shared constants/helpers for routes that call the Anthropic API directly.

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Claude sometimes wraps JSON replies in a ```json fence or adds surrounding
// prose — strip fences, then extract the first {...} block.
export function extractJson<T>(text: string): T {
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const match = unfenced.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in Claude response')
  return JSON.parse(match[0]) as T
}

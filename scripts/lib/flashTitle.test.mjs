import { describe, it, expect } from 'vitest'
import { extractFlashTitle } from './flashTitle.mjs'

describe('extractFlashTitle', () => {
  it('extracts the requested "TITLE: headline" format', () => {
    const raw = 'TITLE: MCX Copper Demand Signal\n\n**WHAT HAPPENED**\nSome fact.'
    const { title, body, usedFallback } = extractFlashTitle(raw, 'fallback')
    expect(title).toBe('MCX Copper Demand Signal')
    expect(body).toBe('**WHAT HAPPENED**\nSome fact.')
    expect(usedFallback).toBe(false)
  })

  it('recovers from "# TITLE: headline" (heading-ified, colon kept)', () => {
    const raw = '# TITLE: Russian Energy Squeeze Splits MCX Crude, Gas, Gold Higher\n\n**WHAT HAPPENED**\nFact.'
    const { title, body, usedFallback } = extractFlashTitle(raw, 'fallback')
    expect(title).toBe('Russian Energy Squeeze Splits MCX Crude, Gas, Gold Higher')
    expect(body).toBe('**WHAT HAPPENED**\nFact.')
    expect(usedFallback).toBe(false)
  })

  it('recovers from "# TITLE" heading with the real headline on the next bolded line', () => {
    const raw = '# TITLE\n**Refueling Buildup Signals Oil Volatility; Gold Locks in Safe-Haven Bid**\n\n**WHAT HAPPENED**\nFact.'
    const { title, body, usedFallback } = extractFlashTitle(raw, 'fallback')
    expect(title).toBe('Refueling Buildup Signals Oil Volatility; Gold Locks in Safe-Haven Bid')
    expect(body).toBe('**WHAT HAPPENED**\nFact.')
    expect(usedFallback).toBe(false)
  })

  it('strips surrounding quotes from the extracted title', () => {
    const raw = 'TITLE: "Quoted Headline"\n\nBody text.'
    const { title } = extractFlashTitle(raw, 'fallback')
    expect(title).toBe('Quoted Headline')
  })

  it('falls back to the source title when no known shape matches', () => {
    const raw = 'Some completely unstructured model output with no title marker at all.'
    const { title, body, usedFallback } = extractFlashTitle(raw, 'Source Article Title')
    expect(title).toBe('Source Article Title')
    expect(body).toBe(raw)
    expect(usedFallback).toBe(true)
  })
})

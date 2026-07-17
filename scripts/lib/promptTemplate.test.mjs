import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renderPromptTemplate, loadPromptTemplate } from './promptTemplate.mjs'

describe('renderPromptTemplate', () => {
  it('substitutes a single placeholder', () => {
    expect(renderPromptTemplate('Edition #{{EDITION}}', { EDITION: 67 })).toBe('Edition #67')
  })

  it('substitutes the same placeholder appearing multiple times', () => {
    const result = renderPromptTemplate('{{DAY}} is the day. See you {{DAY}}.', { DAY: 'Monday' })
    expect(result).toBe('Monday is the day. See you Monday.')
  })

  it('throws when a placeholder is left unresolved', () => {
    expect(() => renderPromptTemplate('Edition #{{EDITION}}, {{MISSING}}', { EDITION: 1 })).toThrow(/MISSING/)
  })

  it('does not partially match a longer placeholder name', () => {
    const result = renderPromptTemplate('{{DATE_STR}} vs {{DATE_STR_LONG}}', { DATE_STR: 'X', DATE_STR_LONG: 'Y' })
    expect(result).toBe('X vs Y')
  })
})

describe('loadPromptTemplate', () => {
  it('strips a leading HTML-comment documentation header', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-prompt-test-'))
    fs.writeFileSync(path.join(tmpDir, 'test_v1.md'), '<!--\nsome docs\n-->\nActual prompt body {{X}}')
    const result = loadPromptTemplate(tmpDir, 'test_v1')
    expect(result).toBe('Actual prompt body {{X}}')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns the file as-is when there is no header', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-prompt-test-'))
    fs.writeFileSync(path.join(tmpDir, 'test_v1.md'), 'No header here {{X}}')
    const result = loadPromptTemplate(tmpDir, 'test_v1')
    expect(result).toBe('No header here {{X}}')
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})

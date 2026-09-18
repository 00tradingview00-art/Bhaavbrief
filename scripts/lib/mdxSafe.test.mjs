import { describe, it, expect } from 'vitest'
import { compile } from '@mdx-js/mdx'
import { escapeBareLessThan } from './mdxSafe.mjs'

const fm = '---\ntitle: "T"\n---\n'

describe('escapeBareLessThan', () => {
  it('escapes "<" before a dollar amount, digit, asterisk, space or "="', () => {
    expect(escapeBareLessThan('at <$2.70')).toBe('at &lt;$2.70')
    expect(escapeBareLessThan('at <**$2.70**')).toBe('at &lt;**$2.70**')
    expect(escapeBareLessThan('a <5% b < 3 c <= 4')).toBe('a &lt;5% b &lt; 3 c &lt;= 4')
  })

  it('keeps real tags and comments', () => {
    expect(escapeBareLessThan('<br /> <b>x</b> <!-- c -->')).toBe('<br /> <b>x</b> <!-- c -->')
  })

  it('leaves frontmatter and fenced code alone', () => {
    const src = `---\ndescription: "yield <5%"\n---\n\n\`\`\`\nif (a <b) {}\nx <$1\n\`\`\`\nprice <$1`
    const out = escapeBareLessThan(src)
    expect(out).toContain('description: "yield <5%"')
    expect(out).toContain('x <$1')
    expect(out.endsWith('price &lt;$1')).toBe(true)
  })

  it('makes the exact production failure compile', async () => {
    const body = 'LNG deferrals (at <**$2.70**) to full utilization'
    await expect(compile(body)).rejects.toThrow()
    await expect(compile(escapeBareLessThan(fm + body).slice(fm.length))).resolves.toBeTruthy()
  })
})

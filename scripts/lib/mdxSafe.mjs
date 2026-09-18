/**
 * MDX treats a bare "<" as the start of an HTML/JSX tag, so model-written prose
 * like "(at <$2.70)" — or "<**$2.70**" once the bold pass has run — fails to
 * compile and breaks the whole `next build`. Escape any "<" that cannot start
 * a real tag (next char is not a letter, "/" or "!") to "&lt;".
 *
 * Frontmatter (leading --- block) and fenced code blocks are left untouched.
 */
export function escapeBareLessThan(mdx) {
  let head = ''
  let rest = mdx
  const fm = mdx.match(/^---\n[\s\S]*?\n---\n/)
  if (fm) {
    head = fm[0]
    rest = mdx.slice(head.length)
  }

  let inFence = false
  const out = rest.split('\n').map(line => {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence
      return line
    }
    if (inFence) return line
    return line.replace(/<(?![A-Za-z/!])/g, '&lt;')
  })

  return head + out.join('\n')
}

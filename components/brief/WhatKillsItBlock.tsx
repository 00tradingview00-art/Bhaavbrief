import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

// Part 12 §12.4.5 "What Kills It" block — red-tinted container.
export default function WhatKillsItBlock({ heading, body }: { heading: string; body: string }) {
  return (
    <div style={{
      marginBottom: '1.5rem', padding: '14px 16px',
      background: 'var(--down-bg)', border: '1px solid rgba(181,58,42,0.2)', borderRadius: 8,
    }}>
      <h2 style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--down)', margin: '0 0 8px',
      }}>
        {heading}
      </h2>
      <div className="brief-prose" style={{ fontSize: 14 }}>
        <MDXRemote source={body} options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }} />
      </div>
    </div>
  )
}

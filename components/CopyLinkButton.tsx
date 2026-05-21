'use client'
import { useState } from 'react'

export default function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity  = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        fontFamily:    'IBM Plex Mono, monospace',
        fontSize:      10,
        letterSpacing: '0.04em',
        color:         copied ? '#0A2015' : '#FAFAF6',
        background:    copied ? '#5AAA70' : '#18180F',
        padding:       '6px 14px',
        border:        'none',
        cursor:        'pointer',
        transition:    'background .2s, color .2s',
        whiteSpace:    'nowrap',
      }}
    >
      {copied ? 'Link copied!' : 'Copy link'}
    </button>
  )
}

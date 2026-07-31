'use client'
import { useState } from 'react'

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.737-8.857L1.258 2.25H8.08l4.26 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117Z"/>
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

const BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.04em',
  padding: '6px 12px', border: 'none', cursor: 'pointer',
  transition: 'opacity .15s', whiteSpace: 'nowrap' as const,
}

interface Props {
  url:      string
  title:    string
  location?: string // e.g. 'brief_page', 'article_page' — which page this share happened on
}

// Same dynamic-import pattern as components/SubscribeForm.tsx — posthog-js is
// already loaded by PostHogProvider by the time a user clicks share, so this
// just resolves the cached module rather than triggering a new fetch.
async function captureShareClick(channel: string, location?: string) {
  const ph = await import('posthog-js').then(m => m.default).catch(() => null)
  ph?.capture('share_click', { channel, location })
}

export default function CopyLinkButton({ url, title, location }: Props) {
  const [copied, setCopied] = useState(false)

  function shareX() {
    captureShareClick('x', location)
    const text = encodeURIComponent(`${title}\n\n${url}`)
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      '_blank', 'noopener,noreferrer,width=560,height=480'
    )
  }

  function shareWA() {
    captureShareClick('whatsapp', location)
    const text = encodeURIComponent(`${title}\n\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    captureShareClick('copy_link', location)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      el.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <button onClick={shareX} title="Share on X / Twitter"
        style={{ ...BTN, background: '#000', color: '#fff' }}>
        <XIcon /><span>X</span>
      </button>

      <button onClick={shareWA} title="Share on WhatsApp"
        style={{ ...BTN, background: '#25D366', color: '#fff' }}>
        <WhatsAppIcon /><span>WhatsApp</span>
      </button>

      <button onClick={copyLink} title="Copy link"
        style={{ ...BTN, background: 'var(--surface-3)', color: 'var(--ink-3)', border: '0.5px solid var(--border)' }}>
        <LinkIcon /><span>{copied ? 'Copied!' : 'Copy link'}</span>
      </button>
    </div>
  )
}

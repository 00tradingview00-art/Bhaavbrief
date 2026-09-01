import Link from 'next/link'
import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'

export type PillTone =
  | 'energy' | 'metals' | 'macro' | 'agri' | 'policy' | 'geopolitics' | 'forex'
  | 'up' | 'down' | 'live' | 'gold' | 'neutral'
type PillSize = 'xs' | 'sm' | 'md'

const TONE_STYLE: Record<PillTone, { bg: string; fg: string }> = {
  energy:      { bg: '#FFF3E0', fg: '#B45309' },
  metals:      { bg: '#F0F4FF', fg: '#2B4FC7' },
  macro:       { bg: '#F3F0FF', fg: '#6B21A8' },
  agri:        { bg: '#EFFAF4', fg: '#166534' },
  policy:      { bg: '#FFF0F3', fg: '#9B1239' },
  geopolitics: { bg: '#FEF3C7', fg: '#92400E' },
  forex:       { bg: '#EEF2FF', fg: '#3730A3' },
  up:          { bg: 'var(--up-bg)', fg: 'var(--up)' },
  down:        { bg: 'var(--down-bg)', fg: 'var(--down)' },
  live:        { bg: 'var(--gold-dark)', fg: '#FAFAF6' },
  gold:        { bg: 'var(--gold-pale)', fg: 'var(--gold-dark)' },
  neutral:     { bg: 'var(--surface-3)', fg: 'var(--ink-3)' },
}

const SIZE_STYLE: Record<PillSize, { padding: string; fontSize: number; fontWeight: number }> = {
  xs: { padding: '2px 8px', fontSize: 10.5, fontWeight: 500 },
  sm: { padding: '4px 10px', fontSize: 12, fontWeight: 600 },
  md: { padding: '7px 16px', fontSize: 13, fontWeight: 600 },
}

interface BaseProps {
  children: ReactNode
  tone?: PillTone
  size?: PillSize
  active?: boolean
  style?: CSSProperties
}

interface LinkPillProps extends BaseProps {
  href: string
  onClick?: never
}

interface ClickPillProps extends BaseProps {
  href?: never
  onClick?: MouseEventHandler<HTMLButtonElement>
}

interface TagPillProps extends BaseProps {
  href?: never
  onClick?: never
}

// Shared pill/badge/chip — consolidates the ~30 call sites that previously
// hand-rolled their own mono/uppercase/square-radius badge inline. Sans
// font + full radius + natural case is the deliberate "not techie" look;
// `active` standardizes every selected-filter state to solid-ink, since
// that was gold in some places and dark-ink in others before this.
export default function Pill(props: LinkPillProps | ClickPillProps | TagPillProps) {
  const { children, tone = 'neutral', size = 'sm', active = false, style } = props
  const toneStyle = TONE_STYLE[tone]
  const sizeStyle = SIZE_STYLE[size]

  const sharedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.4,
    borderRadius: 'var(--radius-pill)',
    whiteSpace: 'nowrap',
    ...sizeStyle,
    background: active ? 'var(--ink)' : toneStyle.bg,
    color: active ? '#FAFAF6' : toneStyle.fg,
    border: `1px solid ${active ? 'var(--ink)' : toneStyle.fg + '40'}`,
    ...style,
  }

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} style={{ ...sharedStyle, textDecoration: 'none' }}>
        {children}
      </Link>
    )
  }

  if ('onClick' in props && props.onClick) {
    return (
      <button
        onClick={props.onClick}
        style={{ ...sharedStyle, border: sharedStyle.border, cursor: 'pointer', transition: 'all .12s' }}
      >
        {children}
      </button>
    )
  }

  return <span style={sharedStyle}>{children}</span>
}

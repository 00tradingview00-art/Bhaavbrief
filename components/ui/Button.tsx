import Link from 'next/link'
import type { CSSProperties, ReactNode, MouseEventHandler } from 'react'

type Variant = 'primary' | 'secondary' | 'pill'
type Size = 'sm' | 'md'

const SIZE_PADDING: Record<Size, string> = {
  sm: '0.4rem 0.85rem',
  md: '0.6rem 1.4rem',
}

const SIZE_FONT: Record<Size, string> = {
  sm: '0.78rem',
  md: '0.88rem',
}

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: 'var(--ink)', color: '#fff', border: '1px solid var(--ink)' }
    case 'secondary':
      return { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)' }
    case 'pill':
      return { background: 'var(--gold-pale)', color: 'var(--gold-dark)', border: 'none' }
  }
}

interface BaseProps {
  children: ReactNode
  variant?: Variant
  size?: Size
  style?: CSSProperties
}

interface LinkButtonProps extends BaseProps {
  href: string
  onClick?: never
  disabled?: never
}

interface ClickButtonProps extends BaseProps {
  href?: never
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
}

// Shared button — consolidates the ~18 files that previously hand-rolled
// their own padding/radius/color combo inline. `pill` matches the informal
// gold-pale chip convention already used in app/pro/page.tsx; `primary`
// matches the existing solid-ink CTA convention.
export default function Button(props: LinkButtonProps | ClickButtonProps) {
  const { children, variant = 'primary', size = 'md', style } = props
  const sharedStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    fontSize: SIZE_FONT[size],
    padding: SIZE_PADDING[size],
    borderRadius: variant === 'pill' ? 'var(--radius-pill)' : 'var(--radius-sm)',
    textDecoration: 'none',
    cursor: 'disabled' in props && props.disabled ? 'not-allowed' : 'pointer',
    opacity: 'disabled' in props && props.disabled ? 0.6 : 1,
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    ...variantStyle(variant),
    ...style,
  }

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} style={sharedStyle}>
        {children}
      </Link>
    )
  }

  const clickProps = props as ClickButtonProps
  return (
    <button
      onClick={clickProps.onClick}
      disabled={clickProps.disabled}
      style={{ ...sharedStyle, border: sharedStyle.border ?? 'none' }}
    >
      {children}
    </button>
  )
}

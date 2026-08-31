import type { CSSProperties, ReactNode } from 'react'

const PADDING = {
  sm: 'var(--space-4)',
  md: 'var(--space-6)',
  lg: 'var(--space-8)',
} as const

interface CardProps {
  children: ReactNode
  padding?: keyof typeof PADDING
  hoverLift?: boolean
  style?: CSSProperties
  className?: string
}

// Shared card container — the design system had none before this; every page
// wrote its own bespoke border/radius/padding/background from scratch, which
// is why radius alone had drifted to 13 different values site-wide. Hover
// elevation is a global class (not a per-instance <style> block) since this
// component is meant to be reused everywhere, unlike page-specific hover
// treatments elsewhere in the codebase.
export default function Card({ children, padding = 'md', hoverLift = false, style, className }: CardProps) {
  return (
    <div
      className={[hoverLift ? 'bb-card--hover-lift' : '', className].filter(Boolean).join(' ')}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        padding: PADDING[padding],
        ...style,
      }}
    >
      {children}
    </div>
  )
}

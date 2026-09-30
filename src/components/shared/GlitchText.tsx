import { createElement, type ElementType, type ReactNode } from 'react'

interface GlitchTextProps {
  /** The text content to render and glitch. */
  children: string
  /** Element/tag to render as (defaults to `span`). Use `h1`/`h2` etc. for headings. */
  as?: ElementType
  className?: string
}

/**
 * `GlitchText` — pure-CSS RGB-split glitch heading wrapper.
 *
 * Renders `children` as text and mirrors it into a `data-text` attribute so the
 * `.glitch-text::before`/`::after` pseudo-elements (defined in `globals.css`) can
 * duplicate the text via `content: attr(data-text)` and offset it with a
 * cursed-accent-tinted RGB split + flickering `clip-path` inset, per design §5.3
 * step 3 / the "Glitch / RGB-split text" reference technique.
 *
 * Reused by the landing page hero title (Task 17) and the Domain Expansion
 * payoff (Task 30) — this component only implements the visual primitive.
 */
export default function GlitchText({ children, as = 'span', className = '' }: GlitchTextProps): ReactNode {
  const classes = ['glitch-text', className].filter(Boolean).join(' ')

  return createElement(
    as,
    { className: classes, 'data-text': children },
    children
  )
}

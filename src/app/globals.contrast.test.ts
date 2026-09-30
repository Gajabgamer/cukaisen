import { describe, it, expect } from 'vitest'

/**
 * Task 29 — Accessibility contrast verification (Requirements 11.1, 11.2).
 *
 * Computes the WCAG relative-luminance contrast ratio for the fixed set of
 * declared Cursed_Theme token pairs and asserts:
 *   - body-text pairs meet the 4.5:1 minimum (Requirement 11.1)
 *   - heading/large-text pairs meet the 3:1 minimum (Requirement 11.2)
 *
 * Token hex/rgba values are duplicated here (rather than parsed from
 * globals.css) because CSS custom properties aren't resolvable in a plain
 * Node/vitest environment without a real browser layout engine. If a token
 * value below drifts from `src/app/globals.css`, update both together.
 */

// ─── Cursed_Theme token values (must match src/app/globals.css) ───
const TOKENS = {
  '--cn-bg': '#0a0713',
  '--cn-surface-opaque': '#1a102e', // opaque approximation of --cn-surface (rgba(26,16,46,0.72)) composited over --cn-bg
  '--cn-text-1': '#f3eefc',
  '--cn-text-2': '#c3b6de',
  '--cn-text-3': '#8a7ba3',
  '--cn-accent-purple': '#8b5cf6',
  '--cn-accent-gojo': '#38bdf8',
  '--cn-accent-sukuna': '#dc2626',
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [r, g, b]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1))
  const l2 = relativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('Property 9 (fixed cases): declared Cursed_Theme token pairs meet contrast minimums', () => {
  const BODY_TEXT_PAIRS: Array<[string, string, string]> = [
    ['--cn-text-1 on --cn-bg', TOKENS['--cn-text-1'], TOKENS['--cn-bg']],
    ['--cn-text-1 on --cn-surface', TOKENS['--cn-text-1'], TOKENS['--cn-surface-opaque']],
    ['--cn-text-2 on --cn-bg', TOKENS['--cn-text-2'], TOKENS['--cn-bg']],
    ['--cn-text-2 on --cn-surface', TOKENS['--cn-text-2'], TOKENS['--cn-surface-opaque']],
  ]

  const HEADING_LARGE_TEXT_PAIRS: Array<[string, string, string]> = [
    ['--cn-text-1 heading on --cn-bg', TOKENS['--cn-text-1'], TOKENS['--cn-bg']],
    ['--cn-accent-purple on --cn-bg', TOKENS['--cn-accent-purple'], TOKENS['--cn-bg']],
    ['--cn-accent-gojo on --cn-bg', TOKENS['--cn-accent-gojo'], TOKENS['--cn-bg']],
    ['--cn-text-3 large label on --cn-bg', TOKENS['--cn-text-3'], TOKENS['--cn-bg']],
  ]

  it.each(BODY_TEXT_PAIRS)('%s meets 4.5:1 body-text minimum', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(HEADING_LARGE_TEXT_PAIRS)('%s meets 3:1 heading/large-text minimum', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3)
  })

  it('computes a stable, deterministic ratio for the same pair', () => {
    const a = contrastRatio(TOKENS['--cn-text-1'], TOKENS['--cn-bg'])
    const b = contrastRatio(TOKENS['--cn-text-1'], TOKENS['--cn-bg'])
    expect(a).toBe(b)
  })
})

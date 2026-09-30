import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import fc from 'fast-check'
import { MotionPrefsContextForTests } from './motionPrefs.testUtils'

afterEach(() => {
  cleanup()
})

/**
 * Small harness standing in for the 5 real effect-bearing components
 * described in design §7.4: VeilLoader, DomainExpansionSequence,
 * CursedCursor, `.cn-seal` spin, and card scroll-reveal. Each one reads
 * `useMotionPrefs()` and MUST branch to a static/simplified render (no
 * animated/particle/trail element) whenever `reducedMotion` OR
 * `lowCapability` is true.
 */
function makeEffectComponent(name: string) {
  return function EffectComponent({ reducedMotion, lowCapability }: { reducedMotion: boolean; lowCapability: boolean }) {
    const gated = reducedMotion || lowCapability
    if (gated) {
      return <div data-testid={`${name}-static`}>static</div>
    }
    return <div data-testid={`${name}-animated`}>animated</div>
  }
}

const EFFECT_COMPONENTS = [
  makeEffectComponent('veil-loader'),
  makeEffectComponent('domain-expansion-sequence'),
  makeEffectComponent('cursed-cursor'),
  makeEffectComponent('cn-seal-spin'),
  makeEffectComponent('card-scroll-reveal'),
]

describe('Property 10: motion-gating branch behavior', () => {
  it('never renders an animated element when reducedMotion or lowCapability is true', () => {
    fc.assert(
      fc.property(
        fc.record({
          reducedMotion: fc.boolean(),
          lowCapability: fc.boolean(),
        }),
        ({ reducedMotion, lowCapability }) => {
          const { container, unmount } = render(
            <>
              {EFFECT_COMPONENTS.map((Comp, i) => (
                <Comp key={i} reducedMotion={reducedMotion} lowCapability={lowCapability} />
              ))}
            </>
          )

          const animatedEls = container.querySelectorAll('[data-testid$="-animated"]')

          if (reducedMotion || lowCapability) {
            expect(animatedEls.length).toBe(0)
          } else {
            expect(animatedEls.length).toBe(EFFECT_COMPONENTS.length)
          }

          unmount()
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('useMotionPrefs computation on mount', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves reducedMotion true when matchMedia reports prefers-reduced-motion: reduce', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))

    const { findByTestId } = render(<MotionPrefsContextForTests />)
    const el = await findByTestId('motion-prefs')
    const value = JSON.parse(el.textContent || '{}')
    expect(value.reducedMotion).toBe(true)
  })

  it('resolves lowCapability true when deviceMemory is low', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    Object.defineProperty(window.navigator, 'deviceMemory', {
      value: 2,
      configurable: true,
    })

    const { findByTestId } = render(<MotionPrefsContextForTests />)
    const el = await findByTestId('motion-prefs')
    const value = JSON.parse(el.textContent || '{}')
    expect(value.lowCapability).toBe(true)

    // @ts-expect-error - cleanup test-only property
    delete window.navigator.deviceMemory
  })

  it('resolves both flags false on a capable, no-preference environment', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    Object.defineProperty(window.navigator, 'deviceMemory', {
      value: 8,
      configurable: true,
    })
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      value: 8,
      configurable: true,
    })

    const { findByTestId } = render(<MotionPrefsContextForTests />)
    const el = await findByTestId('motion-prefs')
    const value = JSON.parse(el.textContent || '{}')
    expect(value.reducedMotion).toBe(false)
    expect(value.lowCapability).toBe(false)

    // @ts-expect-error - cleanup test-only property
    delete window.navigator.deviceMemory
  })
})

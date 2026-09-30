import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, waitFor, act } from '@testing-library/react'
import fc from 'fast-check'
import VeilLoader from './VeilLoader'
import { MotionPrefsProvider } from '@/lib/motionPrefs'

const VEIL_VISITED_KEY = 'veil-visited'

/**
 * Renders VeilLoader inside a MotionPrefsProvider, optionally stubbing
 * `matchMedia` to force `reducedMotion`.
 */
function renderVeilLoader({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))

  return render(
    <MotionPrefsProvider>
      <VeilLoader />
    </MotionPrefsProvider>
  )
}

function mockFontsReady(resolves: boolean) {
  Object.defineProperty(document, 'fonts', {
    value: {
      ready: resolves ? Promise.resolve() : new Promise(() => {}),
    },
    configurable: true,
  })
}

beforeEach(() => {
  localStorage.clear()
  mockFontsReady(true)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})

describe('Property 6: Veil Loader shows at most once per first-visit gate', () => {
  it('shows only when veil-visited is absent, across sequences of simulated app loads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
        async (hasVisitedSequence) => {
          localStorage.clear()

          for (const hasVisitedBefore of hasVisitedSequence) {
            if (hasVisitedBefore) {
              localStorage.setItem(VEIL_VISITED_KEY, 'true')
            } else {
              localStorage.removeItem(VEIL_VISITED_KEY)
            }

            const { unmount } = renderVeilLoader()

            if (hasVisitedBefore) {
              // Gated: must render nothing at all, immediately.
              expect(screen.queryByTestId('veil-loader')).toBeNull()
            } else {
              // First visit: loader must be present.
              await waitFor(() => {
                expect(screen.queryByTestId('veil-loader')).not.toBeNull()
              })
            }

            unmount()
            vi.unstubAllGlobals()
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('Property 7: Veil Loader always terminates', () => {
  it('always dismisses within the max duration regardless of reduced-motion or font-load timing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          reducedMotion: fc.boolean(),
          fontsResolveQuickly: fc.boolean(),
        }),
        async ({ reducedMotion, fontsResolveQuickly }) => {
          localStorage.clear()
          mockFontsReady(fontsResolveQuickly)

          renderVeilLoader({ reducedMotion })

          // Real timers + real rAF-driven framer-motion exit animation:
          // regardless of whether fonts.ready ever resolves, the 4000ms
          // failsafe (a real setTimeout) guarantees dismissal. Give the
          // exit-animation + onExitComplete callback a little headroom
          // beyond the failsafe itself.
          await waitFor(
            () => {
              expect(localStorage.getItem(VEIL_VISITED_KEY)).toBe('true')
            },
            { timeout: 5000, interval: 50 }
          )

          cleanup()
          vi.unstubAllGlobals()
        }
      ),
      { numRuns: 4, timeout: 8000 }
    )
  }, 40000)
})

describe('Veil Loader concrete cases (8 combinations)', () => {
  const combinations = [
    { firstVisit: true, reducedMotion: true, timeoutTriggered: true },
    { firstVisit: true, reducedMotion: true, timeoutTriggered: false },
    { firstVisit: true, reducedMotion: false, timeoutTriggered: true },
    { firstVisit: true, reducedMotion: false, timeoutTriggered: false },
    { firstVisit: false, reducedMotion: true, timeoutTriggered: true },
    { firstVisit: false, reducedMotion: true, timeoutTriggered: false },
    { firstVisit: false, reducedMotion: false, timeoutTriggered: true },
    { firstVisit: false, reducedMotion: false, timeoutTriggered: false },
  ]

  for (const { firstVisit, reducedMotion, timeoutTriggered } of combinations) {
    const label = `firstVisit=${firstVisit} reducedMotion=${reducedMotion} timeoutTriggered=${timeoutTriggered}`

    it(label, async () => {
      localStorage.clear()
      if (!firstVisit) {
        localStorage.setItem(VEIL_VISITED_KEY, 'true')
      }

      // timeoutTriggered=true simulates fonts.ready never resolving, so the
      // 4000ms failsafe is what dismisses the loader instead of the normal
      // progress tween.
      mockFontsReady(!timeoutTriggered)
      vi.useFakeTimers()

      renderVeilLoader({ reducedMotion })

      if (!firstVisit) {
        // Subsequent visit: never rendered, nothing to advance/dismiss.
        expect(screen.queryByTestId('veil-loader')).toBeNull()
        cleanup()
        vi.useRealTimers()
        return
      }

      // First visit: loader renders.
      await vi.advanceTimersByTimeAsync(0)
      expect(screen.queryByTestId('veil-loader')).not.toBeNull()

      if (timeoutTriggered) {
        // fonts.ready never resolves — only the failsafe can dismiss it.
        await vi.advanceTimersByTimeAsync(4000)
      } else {
        // fonts.ready resolves quickly — normal progress tween dismisses it
        // well before the failsafe.
        await vi.advanceTimersByTimeAsync(1500)
      }

      expect(localStorage.getItem(VEIL_VISITED_KEY)).toBe('true')

      cleanup()
      vi.useRealTimers()
    })
  }
})

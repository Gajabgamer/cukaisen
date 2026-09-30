import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import PlaceCard from './PlaceCard'
import { MotionPrefsProvider } from '@/lib/motionPrefs'
import { getCursedTerritoryName } from '@/lib/lore/cursedTerritory'

/**
 * Task 29 — verifies the real PlaceCard component (not a harness) skips its
 * IntersectionObserver-based scroll-reveal entrance animation and renders
 * immediately-visible content when the Performance_Gate reports
 * `lowCapability` or `reducedMotion` is active (Requirements 1.7, 1.8, 4.6).
 *
 * Also covers Task 15's token + Cursed_Territory_Name rendering.
 */

function stubEnvironment({ reducedMotion = false }: { reducedMotion?: boolean } = {}) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reducedMotion && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  // @ts-expect-error - test-only cleanup
  delete window.navigator.deviceMemory
})

const baseProps = {
  id: 'place-1',
  name: 'Test Cafeteria',
  description: 'A place to eat',
  category: { categoryName: 'Cafeteria', icon: '🍽️' },
}

describe('PlaceCard — token + Cursed_Territory_Name rendering (Task 15)', () => {
  it('renders the Cursed_Territory_Name alongside the literal category name', () => {
    stubEnvironment()
    const { container } = render(
      <MotionPrefsProvider>
        <PlaceCard {...baseProps} />
      </MotionPrefsProvider>
    )

    expect(container.textContent).toContain('Cafeteria')
    expect(container.textContent).toContain(getCursedTerritoryName('Cafeteria'))
  })

  it('renders a CursedArtifactSlot placeholder in place of a plain image element', () => {
    stubEnvironment()
    const { container } = render(
      <MotionPrefsProvider>
        <PlaceCard {...baseProps} />
      </MotionPrefsProvider>
    )

    expect(container.querySelector('[data-testid="cursed-artifact-placeholder"]')).toBeTruthy()
  })
})

describe('PlaceCard — Performance_Gate / reduced-motion scroll-reveal gating (Task 29)', () => {
  it('renders immediately visible (no pending reveal class) when reducedMotion is true', () => {
    stubEnvironment({ reducedMotion: true })
    const { container } = render(
      <MotionPrefsProvider>
        <PlaceCard {...baseProps} />
      </MotionPrefsProvider>
    )

    const card = container.querySelector('.cn-glass')
    expect(card).toBeTruthy()
    expect(card?.classList.contains('cn-card-reveal')).toBe(false)
  })

  it('renders immediately visible (no pending reveal class) when lowCapability is true', () => {
    stubEnvironment()
    Object.defineProperty(window.navigator, 'deviceMemory', { value: 2, configurable: true })

    const { container } = render(
      <MotionPrefsProvider>
        <PlaceCard {...baseProps} />
      </MotionPrefsProvider>
    )

    const card = container.querySelector('.cn-glass')
    expect(card).toBeTruthy()
    expect(card?.classList.contains('cn-card-reveal')).toBe(false)
  })
})

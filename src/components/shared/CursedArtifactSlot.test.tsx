import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import fc from 'fast-check'
import CursedArtifactSlot, { CursedArtifactSlotVariant } from './CursedArtifactSlot'

afterEach(() => {
    cleanup()
})

const VARIANTS: CursedArtifactSlotVariant[] = ['hero', 'placeCard', 'gallery', 'dossier']

/**
 * Validates: Requirements 7.4
 *
 * Property 8: Cursed Artifact Slot never renders a broken image state.
 *
 * For any variant and any src-state (absent, valid, or failing), the
 * rendered output must always be either a real <img> with the given
 * valid src (not failed) or the themed placeholder — never an <img>
 * whose src has triggered an error and is still present/visible.
 */
describe('CursedArtifactSlot property: never renders a broken image', () => {
    it('always renders a real photo or a themed placeholder, never a broken image', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(...VARIANTS),
                fc.constantFrom<'none' | 'valid' | 'broken'>('none', 'valid', 'broken'),
                (variant, srcState) => {
                    const src =
                        srcState === 'none'
                            ? undefined
                            : srcState === 'valid'
                                ? 'https://example.com/campus-photo.jpg'
                                : 'https://example.com/broken-photo.jpg'

                    const { container, unmount } = render(
                        <CursedArtifactSlot src={src} alt="Test artifact" variant={variant} />
                    )

                    if (srcState === 'broken') {
                        const img = container.querySelector('img')
                        expect(img).toBeTruthy()
                        fireEvent.error(img as HTMLImageElement)
                    }

                    const img = container.querySelector('img[data-testid="cursed-artifact-photo"]')
                    const placeholder = container.querySelector(
                        '[data-testid="cursed-artifact-placeholder"]'
                    )

                    if (srcState === 'valid') {
                        // Valid, non-failing src -> real img, no placeholder.
                        expect(img).toBeTruthy()
                        expect(img?.getAttribute('src')).toBe(src)
                        expect(placeholder).toBeNull()
                    } else {
                        // none, or broken (post-error) -> themed placeholder, no img.
                        expect(placeholder).toBeTruthy()
                        expect(img).toBeNull()
                    }

                    unmount()
                }
            ),
            { numRuns: 100 }
        )
    })
})

/**
 * Validates: Requirements 7.4
 *
 * Unit tests: 3 concrete cases (no-src, valid-src, broken-src) across
 * each of the 4 variants.
 */
describe('CursedArtifactSlot unit tests', () => {
    for (const variant of VARIANTS) {
        it(`[${variant}] renders themed placeholder when no src is supplied`, () => {
            const { container } = render(
                <CursedArtifactSlot alt="No photo yet" variant={variant} />
            )

            expect(
                container.querySelector('[data-testid="cursed-artifact-placeholder"]')
            ).toBeTruthy()
            expect(container.querySelector('img')).toBeNull()
        })

        it(`[${variant}] renders the real photo when a valid src is supplied`, () => {
            const { container } = render(
                <CursedArtifactSlot
                    src="https://example.com/valid.jpg"
                    alt="Real photo"
                    variant={variant}
                />
            )

            const img = container.querySelector('img')
            expect(img).toBeTruthy()
            expect(img?.getAttribute('src')).toBe('https://example.com/valid.jpg')
            expect(
                container.querySelector('[data-testid="cursed-artifact-placeholder"]')
            ).toBeNull()
        })

        it(`[${variant}] swaps to the themed placeholder when the src fails to load`, () => {
            const { container } = render(
                <CursedArtifactSlot
                    src="https://example.com/broken.jpg"
                    alt="Broken photo"
                    variant={variant}
                />
            )

            const img = container.querySelector('img') as HTMLImageElement
            expect(img).toBeTruthy()

            fireEvent.error(img)

            expect(container.querySelector('img')).toBeNull()
            expect(
                container.querySelector('[data-testid="cursed-artifact-placeholder"]')
            ).toBeTruthy()
        })
    }

    it('resets the failed state when the src prop changes to a new value', () => {
        const { container, rerender } = render(
            <CursedArtifactSlot src="https://example.com/broken.jpg" alt="Photo" variant="hero" />
        )

        const img = container.querySelector('img') as HTMLImageElement
        fireEvent.error(img)
        expect(container.querySelector('img')).toBeNull()

        rerender(
            <CursedArtifactSlot src="https://example.com/new-valid.jpg" alt="Photo" variant="hero" />
        )

        const newImg = container.querySelector('img')
        expect(newImg).toBeTruthy()
        expect(newImg?.getAttribute('src')).toBe('https://example.com/new-valid.jpg')
    })

    it('renders the placeCard categoryIcon in its placeholder when supplied', () => {
        const { container } = render(
            <CursedArtifactSlot alt="Place" variant="placeCard" categoryIcon="🍜" />
        )

        expect(container.textContent).toContain('🍜')
    })

    it('renders the gallery caption template in its placeholder when supplied', () => {
        const { container } = render(
            <CursedArtifactSlot
                alt="Gallery"
                variant="gallery"
                caption="We discovered X → therefore we built Y."
            />
        )

        expect(container.textContent).toContain('We discovered X → therefore we built Y.')
    })
})

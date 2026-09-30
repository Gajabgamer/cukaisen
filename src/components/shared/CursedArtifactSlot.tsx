'use client'

import { useEffect, useState } from 'react'

export type CursedArtifactSlotVariant = 'hero' | 'placeCard' | 'gallery' | 'dossier'

interface CursedArtifactSlotProps {
    /** Real campus photograph URL, if supplied. */
    src?: string
    /** Required for accessibility — describes the photo (or slot purpose when placeholder). */
    alt: string
    /** Which of the 4 planned wiring points this slot is used for. */
    variant: CursedArtifactSlotVariant
    /** Gallery variant only — the "we discovered X → therefore we built Y" caption template. */
    caption?: string
    /** PlaceCard variant only — category glyph/icon rendered on the glass placeholder. */
    categoryIcon?: string
    className?: string
}

const DEFAULT_DOSSIER_MICROCOPY = 'Field photo pending.'

/**
 * Cursed_Artifact_Slot — a photo-or-placeholder slot used at the 4 planned
 * wiring points (hero backdrop, PlaceCard, about-page gallery, dossier card).
 *
 * Renders the supplied photo when `src` is present and loads successfully.
 * Renders a themed placeholder (never a native broken-image state) when:
 *   - `src` is absent, or
 *   - `src` fails to load (`<img onError>` swaps to the same placeholder branch)
 *
 * Pure presentational component — no data fetching, no side effects beyond
 * tracking whether the supplied `src` has failed to load.
 *
 * Design: §4.1, Error Handling (Cursed_Artifact_Slot broken image)
 * Requirements: 7.4
 */
export default function CursedArtifactSlot({
    src,
    alt,
    variant,
    caption,
    categoryIcon,
    className = '',
}: CursedArtifactSlotProps) {
    const [failed, setFailed] = useState(false)

    // Reset failure state whenever the src prop changes (e.g. a new photo
    // is supplied after a previous one failed).
    useEffect(() => {
        // Intentional derived-state reset keyed on a prop change, not
        // render-time computable (the previous failure state must be
        // cleared exactly when `src` changes, not on every render).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFailed(false)
    }, [src])

    const showPhoto = Boolean(src) && !failed

    if (showPhoto) {
        return (
            <img
                src={src}
                alt={alt}
                onError={() => setFailed(true)}
                className={`cn-artifact-slot cn-artifact-slot--${variant} h-full w-full object-cover ${className}`}
                data-testid="cursed-artifact-photo"
            />
        )
    }

    return (
        <div
            className={`cn-artifact-slot cn-artifact-slot--${variant} cn-artifact-placeholder ${className}`}
            role="img"
            aria-label={alt}
            data-testid="cursed-artifact-placeholder"
            data-variant={variant}
        >
            {renderPlaceholder(variant, { caption, categoryIcon })}
        </div>
    )
}

function renderPlaceholder(
    variant: CursedArtifactSlotVariant,
    opts: { caption?: string; categoryIcon?: string }
) {
    switch (variant) {
        case 'hero':
            return <HeroPlaceholder />
        case 'placeCard':
            return <PlaceCardPlaceholder categoryIcon={opts.categoryIcon} />
        case 'gallery':
            return <GalleryPlaceholder caption={opts.caption} />
        case 'dossier':
            return <DossierPlaceholder />
        default:
            return null
    }
}

/** Variant 1: dark cursed-mist gradient + faint campus silhouette SVG. */
function HeroPlaceholder() {
    return (
        <div
            className="flex h-full w-full items-center justify-center overflow-hidden"
            style={{
                background:
                    'radial-gradient(circle at 50% 30%, var(--cn-surface-2), var(--cn-bg) 70%)',
            }}
        >
            <svg
                viewBox="0 0 200 100"
                className="h-1/2 w-1/2 opacity-30"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    d="M10 90 L40 40 L60 60 L90 20 L120 55 L150 30 L190 90 Z"
                    fill="var(--cn-text-3)"
                />
            </svg>
        </div>
    )
}

/** Variant 2: category icon centered on a .cn-glass tile. */
function PlaceCardPlaceholder({ categoryIcon }: { categoryIcon?: string }) {
    return (
        <div className="cn-glass flex h-full w-full items-center justify-center">
            <span className="text-4xl" aria-hidden="true">
                {categoryIcon || '📍'}
            </span>
        </div>
    )
}

/** Variant 3: numbered blank frame with the caption template visible. */
function GalleryPlaceholder({ caption }: { caption?: string }) {
    const resolvedCaption =
        caption ||
        'We discovered <real campus observation> → therefore we built <feature>.'

    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed p-4 text-center"
            style={{ borderColor: 'var(--cn-border)', color: 'var(--cn-text-3)' }}
        >
            <span
                className="flex h-8 w-8 items-center justify-center rounded-full border text-xs"
                style={{ borderColor: 'var(--cn-accent-purple)' }}
                aria-hidden="true"
            >
                #
            </span>
            <p className="text-xs italic">{resolvedCaption}</p>
        </div>
    )
}

/** Variant 4: silhouette + "Field photo pending" Mentor-voiced microcopy. */
function DossierPlaceholder() {
    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center gap-2"
            style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-3)' }}
        >
            <svg
                viewBox="0 0 64 64"
                className="h-10 w-10 opacity-40"
                aria-hidden="true"
                focusable="false"
            >
                <circle cx="32" cy="20" r="12" fill="var(--cn-text-3)" />
                <path d="M12 56 C12 38 52 38 52 56 Z" fill="var(--cn-text-3)" />
            </svg>
            <p className="text-xs">{DEFAULT_DOSSIER_MICROCOPY}</p>
        </div>
    )
}

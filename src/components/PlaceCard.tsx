'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getCursedTerritoryName } from '@/lib/lore/cursedTerritory'
import { useMotionPrefs } from '@/lib/motionPrefs'
import CursedArtifactSlot from '@/components/shared/CursedArtifactSlot'

interface PlaceCardProps {
    id: string
    name: string
    description?: string | null
    category?: {
        categoryName: string
        icon?: string | null
    }
    block?: {
        name: string
    } | null
    floor?: {
        floorNumber: number
    } | null
    photos?: { photoUrl: string }[]
    compact?: boolean
    onClick?: () => void
}

export default function PlaceCard({
    id,
    name,
    description,
    category,
    block,
    floor,
    photos,
    compact = false,
    onClick
}: PlaceCardProps) {
    const { reducedMotion, lowCapability } = useMotionPrefs()
    const [visible, setVisible] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)

    // Scroll-reveal: skip entirely (render fully visible immediately) when
    // reduced motion or low device capability is preferred/detected.
    useEffect(() => {
        // Intentional: skip the IntersectionObserver entirely and render
        // fully visible immediately when reduced motion / low capability is
        // detected.
        if (reducedMotion || lowCapability) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setVisible(true)
            return
        }

        const node = cardRef.current
        if (!node || typeof IntersectionObserver === 'undefined') {
            setVisible(true)
            return
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisible(true)
                        observer.disconnect()
                    }
                })
            },
            { threshold: 0.15 }
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [reducedMotion, lowCapability])

    const revealClass = reducedMotion || lowCapability
        ? ''
        : `cn-card-reveal ${visible ? 'cn-card-reveal--visible' : ''}`

    const cardContent = (
        <div
            ref={cardRef}
            className={`cn-glass overflow-hidden transition-transform duration-300 hover:scale-[1.02] ${revealClass} ${onClick ? 'cursor-pointer' : ''
                } ${compact ? 'flex items-center' : ''}`}
            style={{ boxShadow: 'var(--cn-shadow-glass)' }}
            onClick={onClick}
        >
            {/* Image */}
            <div className={`relative ${compact ? 'w-20 h-20 flex-shrink-0' : 'h-40 w-full'}`}>
                <CursedArtifactSlot
                    src={photos?.[0]?.photoUrl}
                    alt={name}
                    variant="placeCard"
                    categoryIcon={category?.icon ?? undefined}
                    className="h-full w-full"
                />
            </div>

            {/* Content */}
            <div className={`${compact ? 'p-3 flex-1' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h3
                            className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} truncate`}
                            style={{ color: 'var(--cn-text-1)' }}
                        >
                            {name}
                        </h3>

                        {!compact && description && (
                            <p
                                className="text-sm mt-1 line-clamp-2"
                                style={{ color: 'var(--cn-text-2)' }}
                            >
                                {description}
                            </p>
                        )}
                    </div>

                    {!compact && category && (
                        <span className="flex-shrink-0 text-2xl" title={category.categoryName}>
                            {category.icon || '📍'}
                        </span>
                    )}
                </div>

                {/* Location info */}
                <div className={`flex flex-wrap gap-2 ${compact ? 'mt-1' : 'mt-3'}`}>
                    {category && (
                        <span
                            className={`inline-flex items-center gap-1 ${compact ? 'text-xs' : 'text-xs'} px-2 py-1 rounded-full`}
                            style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-accent-purple)' }}
                        >
                            {category.categoryName}
                            <span className="opacity-70" style={{ color: 'var(--cn-text-3)' }}>
                                · {getCursedTerritoryName(category.categoryName)}
                            </span>
                        </span>
                    )}

                    {block && (
                        <span
                            className={`inline-flex items-center ${compact ? 'text-xs' : 'text-xs'} px-2 py-1 rounded-full`}
                            style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-2)' }}
                        >
                            📍 {block.name}
                        </span>
                    )}

                    {floor && (
                        <span
                            className={`inline-flex items-center ${compact ? 'text-xs' : 'text-xs'} px-2 py-1 rounded-full`}
                            style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-2)' }}
                        >
                            🏢 Floor {floor.floorNumber}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )

    if (onClick) {
        return cardContent
    }

    return (
        <Link href={`/place/${id}`}>
            {cardContent}
        </Link>
    )
}

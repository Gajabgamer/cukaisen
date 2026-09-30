
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/db'
import Header from '@/components/Header'
import { getCursedTerritoryName } from '@/lib/lore/cursedTerritory'
import { pickMentorLine } from '@/lib/lore/mentorCopy'
import CursedArtifactSlot from '@/components/shared/CursedArtifactSlot'

export const dynamicParams = true

export async function generateStaticParams() {
    try {
        const places = await prisma.place.findMany({
            where: { approvalStatus: 'APPROVED' },
            select: { id: true }
        })

        return places.map((place) => ({
            id: place.id
        }))
    } catch (error) {
        console.error('Error generating static params:', error)
        return []
    }
}

interface PageProps {
    params: Promise<{ id: string }>
}

async function getPlace(id: string) {
    const place = await prisma.place.findUnique({
        where: { id, approvalStatus: 'APPROVED' },
        include: {
            category: true,
            block: { include: { campus: true } },
            floor: true,
            room: true,
            photos: true,
            createdBy: { select: { name: true } }
        }
    })
    return place
}

export default async function PlaceDetailPage({ params }: PageProps) {
    const { id } = await params
    const place = await getPlace(id)

    if (!place) {
        notFound()
    }

    const arrivalLine = pickMentorLine('arrivalConfirmed', place.id)

    return (
        <div className="min-h-screen" style={{ background: 'var(--cn-bg)' }}>
            <Header />

            <main className="pt-16">
                {/* Hero Image — dossier photo slot */}
                <div className="relative h-64 md:h-80">
                    <CursedArtifactSlot
                        src={place.photos?.[0]?.photoUrl}
                        alt={place.name}
                        variant="dossier"
                        className="h-full w-full"
                    />

                    {/* Back button */}
                    <Link
                        href="/map"
                        className="cn-glass absolute top-4 left-4 w-10 h-10 flex items-center justify-center transition-colors"
                        style={{ color: 'var(--cn-text-1)' }}
                    >
                        ←
                    </Link>
                </div>

                {/* Content — "sorcerer dossier" card */}
                <div className="max-w-2xl mx-auto px-4 -mt-8 relative">
                    <div className="cn-glass p-6">
                        {/* arrivalConfirmed Mentor_Copy line — shown once on open (Requirement 6.2) */}
                        <p className="text-sm italic mb-4" style={{ color: 'var(--cn-accent-purple)' }} data-testid="arrival-confirmed-mentor-line">
                            {arrivalLine}
                        </p>

                        {/* Category Badge */}
                        {place.category && (
                            <span
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
                                style={{ background: 'var(--cn-accent-purple-glow)', color: 'var(--cn-accent-purple)' }}
                            >
                                {place.category.icon} {place.category.categoryName}
                                <span style={{ color: 'var(--cn-text-3)' }}>
                                    · {getCursedTerritoryName(place.category.categoryName)}
                                </span>
                            </span>
                        )}

                        {/* Title */}
                        <h1 className="cn-display text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--cn-text-1)' }}>
                            {place.name}
                        </h1>

                        {/* Description */}
                        {place.description && (
                            <p className="mb-6 leading-relaxed" style={{ color: 'var(--cn-text-2)' }}>
                                {place.description}
                            </p>
                        )}

                        {/* Location Details — stat-block metadata rows */}
                        <div className="rounded-xl p-4 mb-6" style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)' }}>
                            <h2 className="font-semibold mb-3" style={{ color: 'var(--cn-text-1)' }}>📍 Location</h2>
                            <div className="space-y-2 text-sm">
                                {place.block?.campus && (
                                    <p style={{ color: 'var(--cn-text-2)' }}>
                                        <span className="font-medium" style={{ color: 'var(--cn-text-1)' }}>Campus:</span> {place.block.campus.name}
                                    </p>
                                )}
                                {place.block && (
                                    <p style={{ color: 'var(--cn-text-2)' }}>
                                        <span className="font-medium" style={{ color: 'var(--cn-text-1)' }}>Block:</span> {place.block.name}
                                    </p>
                                )}
                                {place.floor && (
                                    <p style={{ color: 'var(--cn-text-2)' }}>
                                        <span className="font-medium" style={{ color: 'var(--cn-text-1)' }}>Floor:</span> {place.floor.floorNumber === 0 ? 'Ground Floor' : `Floor ${place.floor.floorNumber}`}
                                    </p>
                                )}
                                {place.room && (
                                    <p style={{ color: 'var(--cn-text-2)' }}>
                                        <span className="font-medium" style={{ color: 'var(--cn-text-1)' }}>Room:</span> {place.room.roomNumber}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Map Preview */}
                        {place.latitude && place.longitude && (
                            <div className="mb-6">
                                <h2 className="font-semibold mb-3" style={{ color: 'var(--cn-text-1)' }}>🗺️ On Map</h2>
                                <div className="rounded-xl h-48 flex items-center justify-center" style={{ background: 'var(--cn-surface-2)' }}>
                                    <a
                                        href={`https://www.google.com/maps?q=${place.latitude},${place.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 rounded-xl font-medium transition-colors"
                                        style={{ background: 'var(--cn-accent-purple)', color: '#fff', boxShadow: 'var(--cn-shadow-glow-purple)' }}
                                    >
                                        Open in Google Maps
                                    </a>
                                </div>
                            </div>
                        )}

                        {/* Photo Gallery */}
                        {place.photos && place.photos.length > 1 && (
                            <div className="mb-6">
                                <h2 className="font-semibold mb-3" style={{ color: 'var(--cn-text-1)' }}>📷 Photos</h2>
                                <div className="grid grid-cols-3 gap-2">
                                    {place.photos.map((photo: { photoUrl: string }, index: number) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                                            <Image
                                                src={photo.photoUrl}
                                                alt={`${place.name} photo ${index + 1}`}
                                                fill
                                                className="object-cover hover:scale-110 transition-transform"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Added by */}
                        <div className="text-sm pt-4" style={{ color: 'var(--cn-text-3)', borderTop: '1px solid var(--cn-border-soft)' }}>
                            Added by {place.createdBy.name}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

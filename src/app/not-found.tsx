import Link from 'next/link'
import GlitchText from '@/components/shared/GlitchText'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

/**
 * Themed 404 page — wires the `notFound404` Mentor_Copy pool key
 * (Requirement 3.1-3.4 family; design §2.3).
 */
export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center px-6 text-center"
            style={{ background: 'var(--cn-bg)', color: 'var(--cn-text-1)' }}
        >
            <div className="flex flex-col items-center gap-5 max-w-md">
                <GlitchText as="h1" className="cn-display text-5xl tracking-widest">
                    404
                </GlitchText>
                <p className="text-sm italic" style={{ color: 'var(--cn-text-3)' }} data-testid="not-found-mentor-line">
                    {pickMentorLine('notFound404')}
                </p>
                <Link
                    href="/map"
                    className="rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-105"
                    style={{
                        background: 'var(--cn-accent-purple)',
                        color: 'var(--cn-text-1)',
                        boxShadow: 'var(--cn-shadow-glow-purple)',
                    }}
                >
                    🗺️ Back to the Map
                </Link>
            </div>
        </div>
    )
}

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlitchText from '@/components/shared/GlitchText'
import { useMotionPrefs } from '@/lib/motionPrefs'

// Timeline constants (design §5.3)
const SHAKE_DURATION_MS = 400
const AURA_FADE_IN_MS = 300
const GLITCH_START_MS = 300
const FADE_OUT_START_MS = 900
const TOTAL_DURATION_MS = 1400

interface DomainExpansionSequenceProps {
    /** Whether the sequence is currently active/mounted. */
    active: boolean
    /** Called once the full sequence (including fade-out) has completed. */
    onComplete: () => void
}

/**
 * Domain_Expansion_Sequence — the visual payoff triggered once the
 * Domain_Expansion_Trigger's hold threshold is reached (design §5.3).
 *
 * Mounted via a portal at `document.body` so it always renders above any
 * page content regardless of where the trigger button lives in the tree.
 *
 * Steps (Requirements 8.3, 8.4, 8.5, 8.7, 8.8, 8.9):
 *   1. Screen-shake keyframe on a full-viewport wrapper — skipped entirely
 *      under Reduced_Motion_Mode (Requirement 8.8), sequence proceeds
 *      straight to the aura.
 *   2. Full-screen CSS/canvas-generated radial aura overlay (no licensed
 *      video asset — design §5.4). Under `lowCapability`, substitutes a
 *      static single-frame aura (no pulsing keyframe) instead of any video
 *      source (Requirement 8.9).
 *   3. RGB-split glitch text ("DOMAIN EXPANSION") via the shared GlitchText
 *      component, rendered over the aura.
 *   4. Fade-out, then unmount with transform reset and interactivity
 *      restored (Requirement 8.7) — guaranteed via a fixed-duration timer
 *      independent of any animation library's callback firing.
 */
export default function DomainExpansionSequence({ active, onComplete }: DomainExpansionSequenceProps) {
    const { reducedMotion, lowCapability } = useMotionPrefs()
    const [mounted, setMounted] = useState(false)
    const [phase, setPhase] = useState<'shake' | 'aura' | 'fade-out'>('shake')

    useEffect(() => {
        // Intentional client-only mount flag so `createPortal`/`document`
        // access is safe (unavailable during SSR).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!active) return

        // Intentional phase reset driven by the `active` prop transitioning,
        // not computable at render time.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPhase('shake')
        const auraTimer = setTimeout(() => setPhase('aura'), reducedMotion ? 0 : SHAKE_DURATION_MS)
        const fadeOutTimer = setTimeout(() => setPhase('fade-out'), FADE_OUT_START_MS)
        // Fixed-duration completion guarantee (Property 4 / Requirement 8.7):
        // regardless of reduced-motion/low-capability branch taken, the
        // sequence always returns control after TOTAL_DURATION_MS.
        const completeTimer = setTimeout(() => onComplete(), TOTAL_DURATION_MS)

        return () => {
            clearTimeout(auraTimer)
            clearTimeout(fadeOutTimer)
            clearTimeout(completeTimer)
        }
    }, [active, reducedMotion, onComplete])

    if (!mounted || typeof document === 'undefined') return null

    const shouldShake = active && !reducedMotion && phase === 'shake'

    return createPortal(
        <AnimatePresence>
            {active && (
                <motion.div
                    data-testid="domain-expansion-sequence"
                    data-phase={phase}
                    className="fixed inset-0 z-[200] pointer-events-none"
                    initial={{ x: 0, y: 0 }}
                    animate={
                        shouldShake
                            ? { x: [0, -8, 8, -6, 6, 0], y: [0, 4, -4, 2, -2, 0] }
                            : { x: 0, y: 0 }
                    }
                    transition={shouldShake ? { duration: SHAKE_DURATION_MS / 1000, ease: 'easeInOut' } : { duration: 0 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Full-screen aura overlay — CSS/canvas-generated, no video asset (design §5.4) */}
                    <motion.div
                        data-testid="domain-expansion-aura"
                        className="absolute inset-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: phase === 'fade-out' ? 0 : 1 }}
                        transition={{ duration: (phase === 'fade-out' ? TOTAL_DURATION_MS - FADE_OUT_START_MS : AURA_FADE_IN_MS) / 1000 }}
                        style={{
                            background:
                                'radial-gradient(circle at 50% 50%, var(--cn-accent-purple-glow) 0%, var(--cn-accent-gojo-glow) 35%, var(--cn-bg) 75%)',
                            animation:
                                lowCapability || reducedMotion
                                    ? 'none' // static single-frame aura under low-capability/reduced-motion
                                    : 'cn-domain-aura-pulse 1.2s ease-in-out infinite',
                        }}
                    />

                    {/* RGB-split glitch text, rendered over the aura */}
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: phase === 'fade-out' ? 0 : phase === 'aura' ? 1 : 0 }}
                        transition={{ duration: 0.2, delay: phase === 'aura' ? GLITCH_START_MS / 1000 - SHAKE_DURATION_MS / 1000 : 0 }}
                    >
                        <GlitchText as="h1" className="cn-display text-4xl sm:text-6xl tracking-widest text-center px-4">
                            DOMAIN EXPANSION
                        </GlitchText>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    )
}

export { TOTAL_DURATION_MS as DOMAIN_EXPANSION_TOTAL_DURATION_MS }

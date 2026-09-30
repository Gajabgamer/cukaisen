'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useMotionPrefs } from '@/lib/motionPrefs'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

const DURATION_MS = 3200

/**
 * "Territory Reclaimed" — fullscreen payoff when the user (or the guide)
 * reaches a navigation target. Click to skip. Always calls onDone exactly once.
 */
export default function ArrivalBurst({ placeName, onDone }: { placeName: string; onDone: () => void }) {
    const { reducedMotion } = useMotionPrefs()
    const done = useRef(false)
    const doneRef = useRef(onDone)
    useEffect(() => { doneRef.current = onDone })
    const line = useRef(pickMentorLine('arrivalConfirmed', placeName))

    const finish = () => {
        if (done.current) return
        done.current = true
        doneRef.current()
    }

    useEffect(() => {
        const t = setTimeout(finish, DURATION_MS)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <motion.div
            role="alertdialog"
            aria-label={`Territory reclaimed: ${placeName}`}
            onClick={finish}
            className="fixed inset-0 z-[140] cursor-pointer overflow-hidden"
            initial={{ opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: [0, -16, 16, -12, 12, -6, 6, 0], y: [0, 8, -8, 6, -6, 2, 0, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
        >
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(255,31,75,0.35), rgba(5,3,10,0.92) 65%)' }} />
            {/* Impact flash */}
            <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.35 }} />
            {!reducedMotion && (
                <>
                    <span className="burst-ring border-4 border-red-500" style={{ boxShadow: '0 0 40px #ff1f4b' }} />
                    <span className="burst-ring border-2 border-cyan-300" style={{ animationDelay: '0.15s', boxShadow: '0 0 30px #00f0ff' }} />
                    <span className="burst-ring border border-purple-400" style={{ animationDelay: '0.3s' }} />
                </>
            )}
            <div className="scanlines absolute inset-0" />

            <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                {/* Seal stamp */}
                <motion.div
                    className="mb-6 flex h-28 w-28 items-center justify-center rounded-full border-4 border-red-500 bg-black/60"
                    style={{ boxShadow: '0 0 30px #ff1f4b, inset 0 0 20px #ff1f4b' }}
                    initial={{ scale: 3, rotate: -40, opacity: 0 }}
                    animate={{ scale: 1, rotate: -12, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.35, ease: [0.2, 1.6, 0.4, 1] }}
                >
                    <span className="jjk-font neon-red text-6xl">呪</span>
                </motion.div>
                <motion.p className="jjk-font neon-red text-4xl md:text-6xl"
                    initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                    領域奪還
                </motion.p>
                <motion.p className="mt-1 text-xs font-bold tracking-[0.5em] text-cyan-300"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
                    TERRITORY RECLAIMED
                </motion.p>
                <motion.h2 className="jjk-font neon-cyan mt-3 text-5xl md:text-8xl"
                    initial={{ opacity: 0, scale: 1.6, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ delay: 0.85, duration: 0.45 }}>
                    {placeName}
                </motion.h2>
                <motion.p className="mt-6 max-w-md border-l-2 border-red-500 pl-4 text-left text-sm italic text-white/85"
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.3 }}>
                    &ldquo;{line.current}&rdquo;
                    <span className="mt-1 block text-[10px] not-italic tracking-[0.35em] text-red-400">— YOUR SENSEI</span>
                </motion.p>
                <p className="absolute bottom-8 text-[10px] tracking-[0.4em] text-white/50">THE VEIL THINS · CLICK TO CONTINUE</p>
            </div>
        </motion.div>
    )
}

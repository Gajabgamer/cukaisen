'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface AuthShellProps {
    /** Character art shown beside the form. */
    character: string
    /** Aura class for the character glow. */
    aura?: 'aura-blue' | 'aura-red' | 'aura-purple'
    kanji: string
    title: string
    subtitle: string
    quote: string
    children: React.ReactNode
}

/**
 * Shared anime/neon frame for login + register.
 * Left: full-bleed character art with kanji. Right: neon form card.
 */
export default function AuthShell({ character, aura = 'aura-blue', kanji, title, subtitle, quote, children }: AuthShellProps) {
    return (
        <div className="scanlines relative flex min-h-screen overflow-hidden" style={{ background: 'var(--ink)', color: '#fff' }}>
            {/* Backdrop */}
            <img src="/jjk/fx/hero3.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0" style={{
                background: 'radial-gradient(ellipse at 25% 50%, rgba(0,180,255,0.22), transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(255,31,75,0.2), transparent 50%), linear-gradient(90deg, rgba(5,3,10,0.4), var(--ink) 65%)',
            }} />

            {/* Character side (desktop) */}
            <div className="relative hidden flex-1 items-end justify-center lg:flex">
                <span className="kanji-vertical jjk-font neon-red neon-flicker absolute left-8 top-10 text-6xl">{kanji}</span>
                <motion.img
                    src={character}
                    alt=""
                    initial={{ opacity: 0, x: -60 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9 }}
                    className={`${aura} float-slow relative z-10 h-[90vh] object-contain`}
                />
                <div className="absolute bottom-12 left-10 z-20 max-w-sm">
                    <p className="border-l-2 border-red-500 pl-4 text-sm italic text-white/85">&ldquo;{quote}&rdquo;</p>
                    <p className="mt-1 pl-4 text-[10px] tracking-[0.35em] text-red-400">— YOUR SENSEI</p>
                </div>
            </div>

            {/* Form side */}
            <div className="relative z-10 flex w-full items-center justify-center p-5 lg:w-[520px] lg:pr-16">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                    className="w-full max-w-md"
                >
                    <Link href="/" className="mb-8 flex items-center gap-3">
                        <span className="jjk-font neon-red text-4xl">呪</span>
                        <span className="jjk-font text-2xl tracking-widest">THE VEIL</span>
                    </Link>

                    <h1 className="jjk-font neon-cyan text-5xl leading-none md:text-6xl">{title}</h1>
                    <p className="mt-2 text-xs font-bold tracking-[0.3em] text-white/50">{subtitle}</p>

                    <div className="neon-border relative mt-8 bg-black/70 p-7 backdrop-blur-md"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))' }}>
                        {children}
                    </div>

                    <p className="mt-6 text-center text-[10px] tracking-[0.3em] text-white/30">
                        JUJUTSU HIGH // CHANDIGARH UNIVERSITY ANNEX
                    </p>
                </motion.div>
            </div>
        </div>
    )
}

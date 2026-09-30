'use client'

import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

/**
 * First-visit feature tour for the map. Each step spotlights a control
 * (found via [data-tour="…"]) and explains it in a neon dialog. Steps whose
 * target isn't on screen show as a centred dialog instead.
 */

export const ONBOARDING_KEY = 'veil-onboarded-v1'

type Step = { target?: string; kanji: string; title: string; body: string; hint?: string }

const STEPS: Step[] = [
    {
        kanji: '帳', title: 'WELCOME, SORCERER',
        body: 'A cursed Veil has fallen over Chandigarh University. Your mission: map it back, one territory at a time — DISCOVER a place, NAVIGATE to it, ARRIVE and reclaim it.',
        hint: 'This quick tour takes 30 seconds.',
    },
    {
        target: 'search', kanji: '見', title: 'DISCOVER — CURSED SIGHT',
        body: 'Search any block, lab, hostel, canteen or gate. Enter jumps to the top result. The chips below filter by category.',
    },
    {
        kanji: '符', title: 'TALISMAN PINS',
        body: 'Every place is a talisman pin. Tap one to open its dossier: photos, reviews, directions and its 360° view if it has one.',
    },
    {
        kanji: '動', title: 'NAVIGATE — CURSED MOVEMENT',
        body: 'Hit Navigate in a place panel and a glowing route traces from your GPS (or Gate 2 when you are indoors). Tap ARRIVED when you get there.',
    },
    {
        target: 'guide', kanji: '導', title: 'SUMMON YOUR GUIDE',
        body: 'Press Space or 🧿 to step in as yourself — a Grade 4 first-year with a wooden staff. ↑↓ float, ←→ turn; you stick to the roads. With a route open you can float the whole path hands-free.',
        hint: 'On phones, use the on-screen arrow pad.',
    },
    {
        target: 'tour360', kanji: '眼', title: '360° CURSED SIGHT',
        body: 'Zoom close to a 👁 marker and a 360° view of that spot pops open. This button flies you from one 360° site to the next.',
    },
    {
        target: 'modes', kanji: '界', title: 'CHOOSE YOUR VIEW',
        body: '呪 Cursed view for THE VEIL experience. 🗺️ Normal view for the plain, accurate map. 🛰️ Satellite for real imagery. Your choice is remembered.',
    },
    {
        target: 'hud', kanji: '着', title: 'ARRIVE — RECLAIM',
        body: 'Every place you reach is reclaimed with a red 呪 seal and counted here. ▶ DEMO plays the whole journey for you, hands-free.',
        hint: 'Reopen this tour any time with the ? button.',
    },
]

type Rect = { top: number; left: number; width: number; height: number }

function findTarget(name?: string): Rect | null {
    if (!name) return null
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight) {
            return { top: r.top, left: r.left, width: r.width, height: r.height }
        }
    }
    return null
}

export default function VeilOnboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [i, setI] = useState(0)
    const [rect, setRect] = useState<Rect | null>(null)
    const [vw, setVw] = useState(1200)
    const step = STEPS[i]
    const last = i === STEPS.length - 1

    const finish = useCallback(() => {
        try { localStorage.setItem(ONBOARDING_KEY, '1') } catch { /* ignore */ }
        setI(0)
        onClose()
    }, [onClose])

    // Measure the current target (async so layout has settled)
    useEffect(() => {
        if (!open) return
        const measure = () => { setRect(findTarget(STEPS[i].target)); setVw(window.innerWidth) }
        const t = setTimeout(measure, 60)
        window.addEventListener('resize', measure)
        return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
    }, [open, i])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { e.preventDefault(); finish() }
            else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (last) finish(); else setI(n => n + 1) }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); setI(n => Math.max(0, n - 1)) }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [open, last, finish])

    // Dialog placement: near the target on desktop, bottom sheet on phones
    const mobile = vw < 768
    const W = Math.min(380, vw - 24)
    let style: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: W }
    if (mobile) style = { left: 12, right: 12, bottom: 12 }
    else if (rect) {
        const below = rect.top + rect.height / 2 < window.innerHeight / 2
        const left = Math.min(Math.max(12, rect.left + rect.width / 2 - W / 2), vw - W - 12)
        style = below ? { left, top: rect.top + rect.height + 18, width: W } : { left, bottom: window.innerHeight - rect.top + 18, width: W }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div key="onboarding" className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-labelledby="veil-onb-title"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Dim + spotlight */}
                    {rect ? (
                        <motion.div className="pointer-events-none absolute rounded-xl border-2 border-cyan-300"
                            animate={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            style={{ boxShadow: '0 0 0 9999px rgba(5,3,10,0.72), 0 0 24px #00f0ff, inset 0 0 16px rgba(0,240,255,0.4)' }} />
                    ) : (
                        <div className="absolute inset-0 bg-[rgba(5,3,10,0.72)]" />
                    )}
                    {/* Click-blocker so the map underneath doesn't react */}
                    <div className="absolute inset-0" onClick={e => e.stopPropagation()} />

                    <motion.div key={i} className="absolute" style={style}
                        initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25 }}>
                        <div className="neon-border relative overflow-hidden bg-black/90 p-5 backdrop-blur-md"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
                            {i === 0 && (
                                <img src="/jjk/chars/gojo_large.webp" alt="" className="aura-blue pointer-events-none absolute -right-6 -top-2 h-40 opacity-40" />
                            )}
                            <div className="relative flex items-start gap-3">
                                <span className="jjk-font neon-red text-4xl leading-none">{step.kanji}</span>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold tracking-[0.35em] text-cyan-300">STEP {i + 1} / {STEPS.length}</p>
                                    <h2 id="veil-onb-title" className="jjk-font text-2xl leading-tight text-white">{step.title}</h2>
                                </div>
                            </div>
                            <p className="relative mt-3 text-sm leading-relaxed text-white/80">{step.body}</p>
                            {step.hint && <p className="relative mt-2 text-xs italic text-white/50">{step.hint}</p>}

                            <div className="relative mt-4 flex items-center gap-1.5">
                                {STEPS.map((_, n) => (
                                    <button key={n} aria-label={`Go to step ${n + 1}`} onClick={() => setI(n)}
                                        className="h-1.5 rounded-full transition-all"
                                        style={{ width: n === i ? 22 : 8, background: n === i ? '#00f0ff' : n < i ? 'rgba(0,240,255,0.45)' : 'rgba(255,255,255,0.2)' }} />
                                ))}
                            </div>

                            <div className="relative mt-4 flex items-center justify-between gap-2">
                                <button onClick={finish} className="text-xs font-bold tracking-widest text-white/50 hover:text-white">SKIP</button>
                                <div className="flex gap-2">
                                    {i > 0 && (
                                        <button onClick={() => setI(n => n - 1)} className="border border-white/25 px-3 py-2 text-xs font-bold tracking-widest text-white/80 hover:border-white/60">
                                            ← BACK
                                        </button>
                                    )}
                                    <button onClick={() => (last ? finish() : setI(n => n + 1))} className="neon-btn !px-4 !py-2 !text-[11px]" autoFocus>
                                        {last ? '⚡ LIFT THE VEIL' : 'NEXT →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

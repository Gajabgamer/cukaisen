'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Guide } from '@/lib/guides'

/**
 * Visual-novel / game style dialogue box: big character portrait, name plate,
 * typewriter text, ▼ to advance. Two uses:
 *   - `lines` (intro): click / Enter / Space advances, last line closes.
 *   - `bark`: single auto-dismissing line (route ready, on the way, arrival).
 */
export default function GuideDialog({ guide, lines, open, onClose, bark = false, barkMs = 6500, actions }: {
    guide: Guide
    lines: string[]
    open: boolean
    onClose: () => void
    bark?: boolean
    barkMs?: number
    actions?: { label: string; onClick: () => void; primary?: boolean }[]
}) {
    const [idx, setIdx] = useState(0)
    const [shown, setShown] = useState(0)
    const line = lines[idx] || ''
    const done = shown >= line.length
    const closeRef = useRef(onClose)
    useEffect(() => { closeRef.current = onClose })

    // Reset when opened / lines change
    const key = lines.join('|')
    useEffect(() => { if (open) { setIdx(0); setShown(0) } }, [open, key])

    // Typewriter
    useEffect(() => {
        if (!open || done) return
        const t = setTimeout(() => setShown(s => Math.min(line.length, s + 2)), 18)
        return () => clearTimeout(t)
    }, [open, shown, done, line.length])

    // Barks dismiss themselves once fully typed
    useEffect(() => {
        if (!open || !bark || !done) return
        const t = setTimeout(() => closeRef.current(), barkMs)
        return () => clearTimeout(t)
    }, [open, bark, done, barkMs, key])

    const advance = () => {
        if (!done) { setShown(line.length); return }
        if (idx < lines.length - 1) { setIdx(i => i + 1); setShown(0) }
        else onClose()
    }
    const advanceRef = useRef(advance)
    useEffect(() => { advanceRef.current = advance })

    useEffect(() => {
        if (!open || bark) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); advanceRef.current() }
            if (e.key === 'Escape') { e.stopPropagation(); closeRef.current() }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [open, bark])

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    key={bark ? 'bark' : 'dialog'}
                    initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    className={`pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3 ${bark ? 'bottom-24 md:bottom-8' : 'bottom-3 md:bottom-6'}`}
                    role="dialog" aria-live="polite" aria-label={`${guide.name} says`}
                >
                    {!bark && <div className="pointer-events-auto fixed inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent" onClick={advance} />}
                    <div className={`pointer-events-auto relative w-full ${bark ? 'max-w-xl' : 'max-w-3xl'}`}>
                        {/* Portrait breaking out of the box */}
                        <motion.img
                            src={guide.img} alt={guide.name}
                            initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.35 }}
                            className={`absolute bottom-0 left-0 z-10 w-auto select-none object-contain ${bark ? 'h-[120px] md:h-[150px]' : 'h-[190px] md:h-[300px]'}`}
                            style={{ filter: `drop-shadow(0 0 18px ${guide.color}aa)` }}
                            draggable={false}
                        />
                        <div
                            onClick={bark ? onClose : advance}
                            className={`relative cursor-pointer overflow-hidden border-2 bg-[#0b0614]/95 backdrop-blur-md ${bark ? 'ml-[84px] md:ml-[104px] min-h-[92px] p-3 pl-4' : 'ml-[120px] md:ml-[200px] min-h-[150px] p-4 pl-5 md:p-6'}`}
                            style={{ borderColor: guide.color, boxShadow: `0 0 28px ${guide.color}55, inset 0 0 40px ${guide.color}18`, clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))' }}
                        >
                            {/* Name plate */}
                            <div className="mb-2 flex items-center gap-2">
                                <span className="jjk-font px-2 py-0.5 text-sm tracking-wider text-black md:text-base" style={{ background: guide.color }}>{guide.name}</span>
                                <span className="hidden text-[10px] font-bold uppercase tracking-[0.25em] text-white/40 sm:inline">{guide.title}</span>
                                {!bark && lines.length > 1 && <span className="ml-auto text-[10px] font-bold text-white/40">{idx + 1}/{lines.length}</span>}
                            </div>
                            <p className={`whitespace-pre-line leading-relaxed text-white ${bark ? 'text-[13px] md:text-sm' : 'text-sm md:text-lg'}`}>
                                {line.slice(0, shown)}
                                {!done && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse align-middle" style={{ background: guide.color }} />}
                            </p>
                            {actions && done && idx === lines.length - 1 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {actions.map(a => (
                                        <button key={a.label} onClick={e => { e.stopPropagation(); a.onClick() }}
                                            className="border px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-transform hover:scale-105"
                                            style={a.primary ? { background: guide.color, color: '#000', borderColor: guide.color } : { borderColor: `${guide.color}88`, color: guide.color }}>
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {!bark && (
                                <div className="mt-2 flex items-center justify-end gap-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    <button onClick={e => { e.stopPropagation(); onClose() }} className="hover:text-white">Skip</button>
                                    <motion.span animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 0.9 }} style={{ color: guide.color }}>
                                        {done ? (idx < lines.length - 1 ? '▼ Next' : '▼ Start') : '▼'}
                                    </motion.span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

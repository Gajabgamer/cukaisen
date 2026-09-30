'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type VeilStage = 'discover' | 'navigate' | 'arrive'

const STEPS: { id: VeilStage; label: string; kanji: string; tech: string; color: string }[] = [
    { id: 'discover', label: 'DISCOVER', kanji: '見', tech: 'Cursed Sight', color: '#00f0ff' },
    { id: 'navigate', label: 'NAVIGATE', kanji: '動', tech: 'Cursed Movement', color: '#ff1f4b' },
    { id: 'arrive', label: 'ARRIVE', kanji: '着', tech: 'Reclaim', color: '#a855f7' },
]

export interface DemoCaption { kicker: string; text: string }

interface Props {
    stage: VeilStage
    liftedPct: number
    reclaimed: number
    total: number
    fogVisible: boolean
    onToggleFog: () => void
    musicOn: boolean
    onToggleMusic: () => void
    muted: boolean
    onToggleMute: () => void
    onTour360: () => void
    onDemo: () => void
    demoRunning: boolean
    caption: DemoCaption | null
    toast: string | null
    /** Hide the small-screen pill (e.g. while the guide's controls own the bottom of the screen). */
    hideCompact?: boolean
    /** Reopen the feature tour. */
    onHelp: () => void
    /** Squad live location */
    onShare: () => void
    shareOpen: boolean
    sharing: boolean
    squadCount: number
}

export default function VeilHud(p: Props) {
    const activeIdx = STEPS.findIndex(s => s.id === p.stage)
    const [open, setOpen] = useState(false)
    const step = STEPS[Math.max(0, activeIdx)]
    const tool = 'flex h-10 w-full items-center gap-2 border border-cyan-400/30 bg-black/60 px-2.5 text-left text-[11px] font-bold tracking-wider text-white/80 hover:border-cyan-300 hover:text-white'

    return (
        <>
            {/* ── Right-edge slide-out tool drawer ── */}
            <div className={`pointer-events-auto fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-[212px]'}`}>
                <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={open ? 'Hide tools' : 'Show tools'}
                    className="neon-border flex h-16 w-7 items-center justify-center bg-black/80 text-cyan-300 backdrop-blur-md hover:text-white"
                    style={{ clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 40% 100%, 0 80%, 0 20%)' }}>
                    <span className={`text-sm transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>◀</span>
                </button>
                <div data-tour="hud" className="neon-border flex w-[212px] flex-col gap-1.5 bg-black/85 p-2.5 backdrop-blur-md">
                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                        <Link href="/" title="Back to THE VEIL" className="jjk-font neon-red text-xl">呪</Link>
                        <span className="jjk-font text-xl" style={{ color: step.color, textShadow: `0 0 10px ${step.color}` }}>{step.kanji}</span>
                        <div className="leading-tight">
                            <p className="text-[11px] font-black tracking-[0.2em] text-white">{step.label}</p>
                            <p className="text-[9px] tracking-widest text-white/40">{step.tech}</p>
                        </div>
                    </div>
                    <div className="flex justify-between pb-1 text-[10px] font-bold tracking-widest text-white/60">
                        <span>帳 <span className="text-cyan-300">{p.liftedPct}%</span></span>
                        <span>RECLAIMED <span className="text-red-400">{p.reclaimed}/{p.total}</span></span>
                    </div>
                    <button onClick={p.onToggleFog} className={tool} aria-pressed={p.fogVisible}><span className="w-5 text-center">{p.fogVisible ? '霧' : '晴'}</span>{p.fogVisible ? 'HIDE VEIL' : 'SHOW VEIL'}</button>
                    <button data-tour="tour360" onClick={p.onTour360} className={tool}><span className="w-5 text-center">👁</span>NEXT 360° SITE</button>
                    <button data-tour="share" onClick={p.onShare} aria-pressed={p.shareOpen} className={`${tool} ${p.sharing ? 'border-red-400 text-red-300' : ''}`}>
                        <span className="w-5 text-center">📡</span>{p.sharing ? <>LIVE · {p.squadCount} <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /></> : 'SHARE LOCATION'}
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={p.onToggleMusic} className={tool} aria-pressed={p.musicOn}><span>{p.musicOn ? '♪' : '♫'}</span>MUSIC</button>
                        <button onClick={p.onToggleMute} className={tool} aria-pressed={!p.muted}><span>{p.muted ? '🔇' : '🔊'}</span>SFX</button>
                        <button onClick={p.onDemo} className={`${tool} ${p.demoRunning ? 'border-red-400 text-red-300' : ''}`}><span>{p.demoRunning ? '■' : '▶'}</span>{p.demoRunning ? 'STOP' : 'DEMO'}</button>
                        <button onClick={p.onHelp} className={tool}><span>?</span>HELP</button>
                    </div>
                </div>
            </div>
            {Overlays(p)}
        </>
    )
}

function Overlays(p: Props) {
    return (
        <>
            {/* ── Demo caption ── */}
            <AnimatePresence mode="wait">
                {p.caption && (
                    <motion.div key={p.caption.kicker + p.caption.text}
                        className="pointer-events-none fixed inset-x-0 top-28 z-[60] flex justify-center px-4 xl:top-32"
                        initial={{ opacity: 0, y: -16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.35 }}>
                        <div className="neon-border-red bg-black/85 px-6 py-3 text-center backdrop-blur-md">
                            <p className="text-[10px] font-black tracking-[0.4em] text-red-400">{p.caption.kicker}</p>
                            <p className="jjk-font mt-1 text-2xl text-white md:text-3xl">{p.caption.text}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {p.toast && !p.caption && (
                    <motion.div key={p.toast}
                        className="pointer-events-none fixed inset-x-0 top-28 z-[60] flex justify-center px-4"
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <p className="neon-border bg-black/85 px-4 py-2 text-xs font-bold tracking-[0.3em] text-cyan-200">{p.toast}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

/** Previous top-centre HUD, kept for reference (no longer rendered). */
export function LegacyVeilHud(p: Props) {
    const activeIdx = STEPS.findIndex(s => s.id === p.stage)

    const Stats = (
        <div className="flex items-center gap-3 text-[10px] font-bold tracking-[0.25em]">
            <span className="text-white/60">帳 VEIL LIFTED <span className="text-cyan-300">{p.liftedPct}%</span></span>
            <span className="h-3 w-px bg-white/20" />
            <span className="text-white/60">RECLAIMED <span className="text-red-400">{p.reclaimed}/{p.total}</span></span>
        </div>
    )

    const iconBtn = 'flex h-8 w-8 items-center justify-center border border-cyan-400/40 bg-black/60 text-xs text-white/80 hover:border-cyan-300 hover:text-white'

    return (
        <>
            {/* ── Desktop HUD (top centre) ── */}
            <div className="pointer-events-auto absolute left-1/2 top-4 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 xl:flex">
                <div className="neon-border flex items-stretch bg-black/75 backdrop-blur-md"
                    style={{ clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
                    <Link href="/" className="flex items-center gap-1.5 border-r border-white/10 px-4" title="Back to THE VEIL">
                        <span className="jjk-font neon-red text-xl">呪</span>
                    </Link>
                    {STEPS.map((s, i) => {
                        const on = i === activeIdx
                        const done = i < activeIdx
                        return (
                            <div key={s.id} className="relative flex items-center gap-2 px-4 py-2">
                                <span className="jjk-font text-2xl transition-all" style={{ color: on || done ? s.color : 'rgba(255,255,255,0.25)', textShadow: on ? `0 0 12px ${s.color}` : 'none' }}>{s.kanji}</span>
                                <div className="leading-tight">
                                    <p className="text-[11px] font-black tracking-[0.25em]" style={{ color: on ? '#fff' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)' }}>
                                        {done ? '✓ ' : ''}{s.label}
                                    </p>
                                    <p className="text-[9px] tracking-widest text-white/40">{s.tech}</p>
                                </div>
                                {on && <motion.span layoutId="veil-step" className="absolute inset-x-2 bottom-0 h-0.5" style={{ background: s.color, boxShadow: `0 0 10px ${s.color}` }} />}
                                {i < STEPS.length - 1 && <span className="ml-2 text-white/25">→</span>}
                            </div>
                        )
                    })}
                </div>
                <div data-tour="hud" className="flex items-center gap-2 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                    {Stats}
                    <span className="h-3 w-px bg-white/20" />
                    <button onClick={p.onToggleFog} className={iconBtn} title={p.fogVisible ? 'Hide the Veil barrier' : 'Show the Veil barrier'} aria-pressed={p.fogVisible}>{p.fogVisible ? '霧' : '晴'}</button>
                    <button data-tour="tour360" onClick={p.onTour360} className={iconBtn} title="Fly to the next 360° site">👁</button>
                    <button onClick={p.onToggleMusic} className={iconBtn} title="Opening theme" aria-pressed={p.musicOn}>{p.musicOn ? '♪' : '♫'}</button>
                    <button onClick={p.onToggleMute} className={iconBtn} title={p.muted ? 'Unmute effects' : 'Mute effects'} aria-pressed={!p.muted}>{p.muted ? '🔇' : '🔊'}</button>
                    <button data-tour="share" onClick={p.onShare} aria-pressed={p.shareOpen}
                        className={`${iconBtn} w-auto gap-1.5 px-2 font-black tracking-widest ${p.sharing ? 'border-red-400 text-red-300' : ''}`}
                        title={p.sharing ? 'Squad live location' : 'Share live location'}>
                        {p.sharing ? <><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE {p.squadCount}</> : '📡 SHARE'}
                    </button>
                    <button onClick={p.onDemo} className={`${iconBtn} w-auto px-2 font-black tracking-widest ${p.demoRunning ? 'border-red-400 text-red-300' : ''}`} title="Play the guided demo (Shift+D)">
                        {p.demoRunning ? '■ STOP' : '▶ DEMO'}
                    </button>
                    <button onClick={p.onHelp} className={iconBtn} title="Feature tour">?</button>
                </div>
            </div>

            {/* ── Mobile / tablet compact HUD ── */}
            <div data-tour="hud" className={`neon-border pointer-events-auto absolute bottom-24 left-1/2 z-20 -translate-x-1/2 items-center gap-2 bg-black/75 px-3 py-2 backdrop-blur-md xl:hidden ${p.hideCompact ? 'hidden' : 'flex'}`}>
                <span className="jjk-font text-lg" style={{ color: STEPS[Math.max(0, activeIdx)].color }}>{STEPS[Math.max(0, activeIdx)].kanji}</span>
                <span className="text-[10px] font-black tracking-widest text-white">{STEPS[Math.max(0, activeIdx)].label}</span>
                <span className="text-[10px] font-bold text-cyan-300">{p.liftedPct}%</span>
                <span className="text-[10px] font-bold text-red-400">{p.reclaimed}/{p.total}</span>
                <button onClick={p.onToggleFog} className={iconBtn} aria-label="Toggle Veil fog">{p.fogVisible ? '霧' : '晴'}</button>
                <button data-tour="tour360" onClick={p.onTour360} className={iconBtn} aria-label="Next 360° site">👁</button>
                <button data-tour="share" onClick={p.onShare} aria-pressed={p.shareOpen}
                    className={`${iconBtn} relative ${p.sharing ? 'border-red-400' : ''}`} aria-label={p.sharing ? 'Squad live location' : 'Share live location'}>
                    📡{p.sharing && <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />}
                </button>
                <button onClick={p.onDemo} className={iconBtn} aria-label={p.demoRunning ? 'Stop demo' : 'Play demo'}>{p.demoRunning ? '■' : '▶'}</button>
                <button onClick={p.onHelp} className={iconBtn} aria-label="Feature tour">?</button>
            </div>

            {/* ── Demo caption ── */}
            <AnimatePresence mode="wait">
                {p.caption && (
                    <motion.div key={p.caption.kicker + p.caption.text}
                        className="pointer-events-none fixed inset-x-0 top-28 z-[60] flex justify-center px-4 xl:top-32"
                        initial={{ opacity: 0, y: -16, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.35 }}>
                        <div className="neon-border-red bg-black/85 px-6 py-3 text-center backdrop-blur-md">
                            <p className="text-[10px] font-black tracking-[0.4em] text-red-400">{p.caption.kicker}</p>
                            <p className="jjk-font mt-1 text-2xl text-white md:text-3xl">{p.caption.text}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toast ── */}
            <AnimatePresence>
                {p.toast && !p.caption && (
                    <motion.div key={p.toast}
                        className="pointer-events-none fixed inset-x-0 top-28 z-[60] flex justify-center px-4"
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <p className="neon-border bg-black/85 px-4 py-2 text-xs font-bold tracking-[0.3em] text-cyan-200">{p.toast}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

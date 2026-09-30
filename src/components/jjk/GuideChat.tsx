'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GUIDE_LIST, shortName, type Guide, type GuideId } from '@/lib/guides'

interface Hit { id: string; name: string; cat: string; dist: number }
interface Msg {
    role: 'user' | 'assistant'
    content: string
    place?: Hit | null
    list?: Hit[]
    way?: Hit[]
    dist?: number | null
    min?: number | null
    intent?: string
}

/**
 * Chat with your chosen sorcerer. Answers come from /api/chat (real campus
 * data), with one-tap actions to start navigation or show a place.
 */
export default function GuideChat({ guide, open, onOpenChange, getOrigin, onNavigate, onShow, onGuideChange, hidden }: {
    guide: Guide
    open: boolean
    onOpenChange: (v: boolean) => void
    getOrigin: () => { lat: number; lng: number } | null
    onNavigate: (placeId: string) => void
    onShow: (placeId: string) => void
    onGuideChange: (id: GuideId) => void
    hidden?: boolean
}) {
    const [msgs, setMsgs] = useState<Msg[]>([])
    const [input, setInput] = useState('')
    const [busy, setBusy] = useState(false)
    const [picking, setPicking] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // New guide → fresh greeting in their voice
    useEffect(() => { setMsgs([{ role: 'assistant', content: guide.t.hello }]) }, [guide])
    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs, busy])
    useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

    const send = async (text: string) => {
        const message = text.trim()
        if (!message || busy) return
        setInput('')
        const history = msgs.slice(-4).map(m => ({ role: m.role, content: m.content }))
        setMsgs(m => [...m, { role: 'user', content: message }])
        setBusy(true)
        try {
            const r = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, guideId: guide.id, origin: getOrigin(), history }),
            })
            const j = await r.json()
            if (!r.ok) throw new Error(j.error || 'failed')
            setMsgs(m => [...m, { role: 'assistant', content: j.reply, place: j.place, list: j.list, way: j.way, dist: j.dist, min: j.min, intent: j.intent }])
        } catch {
            setMsgs(m => [...m, { role: 'assistant', content: 'My cursed energy flickered. Try that again?' }])
        } finally {
            setBusy(false)
        }
    }

    if (hidden) return null
    const c = guide.color

    return (
        <>
            {/* Launcher: the guide's portrait */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                        onClick={() => onOpenChange(true)}
                        aria-label={`Ask ${guide.name}`} title={`Ask ${guide.name}`}
                        className="veil-flame fixed bottom-6 right-[58px] z-[45] h-14 w-14"
                    >
                        {/* Violet cursed flames licking up around the orb */}
                        <span aria-hidden className="veil-flame-tongue" style={{ left: '8%', animationDelay: '0s' }} />
                        <span aria-hidden className="veil-flame-tongue" style={{ left: '30%', animationDelay: '-.35s', height: '118%' }} />
                        <span aria-hidden className="veil-flame-tongue" style={{ left: '52%', animationDelay: '-.7s', height: '128%' }} />
                        <span aria-hidden className="veil-flame-tongue" style={{ left: '70%', animationDelay: '-.2s' }} />
                        <span className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-full border-2 border-violet-400 bg-[#12051f]"
                            style={{ boxShadow: '0 0 18px #a855f7, 0 0 36px #7c3aed88, inset 0 0 14px #a855f799' }}>
                            <img src={guide.img} alt="" className="h-[140%] w-auto max-w-none object-cover object-top" draggable={false} />
                        </span>
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-sm bg-violet-500 px-1 text-[9px] font-black text-white">ASK</span>
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        className="fixed inset-x-2 bottom-2 top-auto z-[65] flex max-h-[72vh] flex-col overflow-hidden border-2 bg-[#0b0614]/95 backdrop-blur-md md:inset-x-auto md:right-4 md:bottom-4 md:top-20 md:max-h-none md:w-[380px]"
                        style={{ borderColor: c, boxShadow: `0 0 30px ${c}44` }}
                        role="dialog" aria-label={`Chat with ${guide.name}`}
                    >
                        {/* Header */}
                        <div className="relative flex items-center gap-3 border-b px-3 py-2" style={{ borderColor: `${c}55`, background: `linear-gradient(90deg, ${c}22, transparent)` }}>
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border" style={{ borderColor: c }}>
                                <img src={guide.img} alt="" className="h-[150%] w-full object-cover object-top" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="jjk-font truncate text-lg leading-none" style={{ color: c }}>{guide.name}</p>
                                <p className="truncate text-[10px] font-bold uppercase tracking-widest text-white/40">Guide · {guide.specialtyLabel}</p>
                            </div>
                            <button onClick={() => setPicking(p => !p)} className="border px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/70 hover:text-white" style={{ borderColor: `${c}66` }}>Swap</button>
                            <button onClick={() => onOpenChange(false)} aria-label="Close chat" className="px-1 text-lg text-white/60 hover:text-white">✕</button>
                        </div>

                        {/* Guide picker */}
                        {picking && (
                            <div className="grid grid-cols-5 gap-1.5 border-b p-2" style={{ borderColor: `${c}33` }}>
                                {GUIDE_LIST.map(g => (
                                    <button key={g.id} onClick={() => { onGuideChange(g.id); setPicking(false) }} title={`${g.name} · ${g.specialtyLabel}`}
                                        className={`relative aspect-square overflow-hidden rounded border-2 bg-black ${g.id === guide.id ? '' : 'opacity-70 hover:opacity-100'}`}
                                        style={{ borderColor: g.id === guide.id ? g.color : 'transparent' }}>
                                        <img src={g.img} alt={g.name} className="h-[160%] w-full object-cover object-top" />
                                        <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] font-black uppercase text-white">{shortName(g)}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3 scrollbar-hide">
                            {msgs.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] px-3 py-2 text-[13px] leading-relaxed ${m.role === 'user' ? 'bg-white/10 text-white' : 'text-white'}`}
                                        style={m.role === 'assistant' ? { borderLeft: `3px solid ${c}`, background: `${c}14` } : undefined}>
                                        <p className="whitespace-pre-line">{m.content}</p>

                                        {m.intent === 'navigate' && m.place && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider text-white/50">
                                                    <span>📍 {m.place.name}</span>
                                                    {m.dist != null && <span>{m.dist} m · {m.min} min</span>}
                                                </div>
                                                {!!m.way?.length && (
                                                    <ol className="space-y-0.5 border-l border-dashed pl-2 text-[11px] text-white/70" style={{ borderColor: `${c}66` }}>
                                                        {m.way.map(w => <li key={w.id}>↳ {w.name}</li>)}
                                                        <li className="font-bold" style={{ color: c }}>◎ {m.place.name}</li>
                                                    </ol>
                                                )}
                                                <div className="flex gap-2">
                                                    <button onClick={() => onNavigate(m.place!.id)} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black" style={{ background: c }}>⚡ Lead me</button>
                                                    <button onClick={() => onShow(m.place!.id)} className="border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider" style={{ borderColor: `${c}88`, color: c }}>Show</button>
                                                </div>
                                            </div>
                                        )}
                                        {m.intent === 'info' && m.place && (
                                            <div className="mt-2 flex gap-2">
                                                <button onClick={() => onNavigate(m.place!.id)} className="px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black" style={{ background: c }}>⚡ Lead me</button>
                                                <button onClick={() => onShow(m.place!.id)} className="border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider" style={{ borderColor: `${c}88`, color: c }}>Show</button>
                                            </div>
                                        )}
                                        {!!m.list?.length && m.intent === 'nearest' && (
                                            <div className="mt-2 space-y-1">
                                                {m.list.map(h => (
                                                    <button key={h.id} onClick={() => onNavigate(h.id)}
                                                        className="flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
                                                        style={{ borderColor: `${c}44` }}>
                                                        <span className="truncate">{h.name}</span>
                                                        <span className="shrink-0 text-[10px] font-bold" style={{ color: c }}>{Math.round(h.dist * 1.25 / 10) * 10} m ⚡</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {busy && (
                                <div className="flex items-center gap-1 pl-2" aria-label={`${guide.name} is thinking`}>
                                    {[0, 1, 2].map(d => <motion.span key={d} className="h-1.5 w-1.5 rounded-full" style={{ background: c }}
                                        animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.9, delay: d * 0.15 }} />)}
                                </div>
                            )}
                        </div>

                        {/* Suggestions */}
                        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-hide">
                            {guide.chips.map(s => (
                                <button key={s} onClick={() => send(s)} disabled={busy}
                                    className="shrink-0 border px-2 py-1 text-[11px] text-white/70 hover:text-white disabled:opacity-40" style={{ borderColor: `${c}44` }}>
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2 border-t p-2" style={{ borderColor: `${c}33` }}>
                            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={300}
                                onKeyDown={e => e.stopPropagation()}
                                placeholder={`Ask ${shortName(guide)}… "nearest cafe", "B1 kaha hai"`}
                                aria-label="Message your guide"
                                className="min-w-0 flex-1 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1"
                                style={{ ['--tw-ring-color' as string]: c }} />
                            <button type="submit" disabled={busy || !input.trim()} className="px-3 text-sm font-black text-black disabled:opacity-40" style={{ background: c }}>➤</button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

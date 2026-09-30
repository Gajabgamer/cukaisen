'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CAMPUS_BLOCKS, type CampusBlock } from '@/lib/campusBlocks'

/**
 * Admin "name this block" panel. The page puts the map in naming mode; each
 * tapped building sets `target`, and this panel lets the admin pick its name.
 */
export default function BlockNamer({ active, target, placed, saving, lastSaved, error, onPick, onRemove, onExit }: {
    active: boolean
    target: { lat: number; lng: number; snapped: boolean } | null
    /** Lower-cased names that already exist as places */
    placed: Set<string>
    saving: boolean
    lastSaved: string | null
    error: string | null
    onPick: (b: CampusBlock) => void
    /** Delete the saved place with this name from the map */
    onRemove: (name: string) => void
    onExit: () => void
}) {
    const [q, setQ] = useState('')
    const [confirming, setConfirming] = useState<string | null>(null)
    const [hideDone, setHideDone] = useState(false)

    const groups = useMemo(() => {
        const s = q.trim().toLowerCase()
        const list = CAMPUS_BLOCKS.filter(b =>
            (!s || b.name.toLowerCase().includes(s) || b.description.toLowerCase().includes(s)) &&
            (!hideDone || !placed.has(b.name.toLowerCase())))
        const out = new Map<string, CampusBlock[]>()
        for (const b of list) out.set(b.group, [...(out.get(b.group) ?? []), b])
        return [...out.entries()]
    }, [q, hideDone, placed])

    const done = CAMPUS_BLOCKS.filter(b => placed.has(b.name.toLowerCase())).length

    return (
        <AnimatePresence>
            {active && (
                <motion.aside key="namer" aria-label="Name campus blocks"
                    className="pointer-events-auto fixed inset-x-3 bottom-3 z-[72] flex max-h-[58vh] flex-col md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:max-h-[calc(100vh-7rem)] md:w-[340px]"
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                    <div className="neon-border flex min-h-0 flex-1 flex-col bg-black/92 backdrop-blur-md">
                        <div className="border-b border-cyan-400/25 p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="jjk-font neon-red text-2xl leading-none">名</span>
                                    <div>
                                        <p className="jjk-font text-lg leading-none text-white">NAME THIS BLOCK</p>
                                        <p className="text-[9px] font-bold tracking-[0.25em] text-white/50">ADMIN · {done}/{CAMPUS_BLOCKS.length} PLACED</p>
                                    </div>
                                </div>
                                <button onClick={onExit} className="border border-red-500/60 px-2 py-1 text-[10px] font-black tracking-widest text-red-300 hover:bg-red-500/10">
                                    DONE
                                </button>
                            </div>
                            <p className={`mt-2 text-xs ${target ? 'text-cyan-200' : 'text-white/60'}`}>
                                {target
                                    ? `${target.snapped ? '▣ Building selected' : '⌖ Point selected'} — pick its name below.`
                                    : 'Tap a building on the map, then pick its name.'}
                            </p>
                            {lastSaved && <p className="mt-1 text-[11px] font-bold text-green-300">✓ Saved {lastSaved}</p>}
                            {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
                            <div className="mt-2 flex gap-2">
                                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter: B4, NCT, hostel…"
                                    aria-label="Filter block names"
                                    className="min-w-0 flex-1 border border-cyan-400/30 bg-white/5 px-2 py-1.5 text-xs text-white outline-none placeholder:text-white/35 focus:border-cyan-300" />
                                <button onClick={() => setHideDone(v => !v)} aria-pressed={hideDone}
                                    className={`px-2 text-[10px] font-black tracking-widest ${hideDone ? 'bg-cyan-400 text-black' : 'border border-cyan-400/40 text-cyan-200'}`}>
                                    TODO
                                </button>
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {groups.map(([group, list]) => (
                                <div key={group} className="mb-2">
                                    <p className="px-1 pb-1 text-[9px] font-black tracking-[0.3em] text-white/40">{group.toUpperCase()}</p>
                                    <div className="space-y-1">
                                        {list.map(b => {
                                            const isDone = placed.has(b.name.toLowerCase())
                                            if (confirming === b.name) {
                                                return (
                                                    <div key={b.name} className="flex items-center gap-2 border border-red-500/60 bg-red-500/10 px-2 py-1.5">
                                                        <span className="flex-1 text-[11px] text-red-200">Remove <b>{b.name}</b> from the map?</span>
                                                        <button type="button" disabled={saving} onClick={() => { setConfirming(null); onRemove(b.name) }}
                                                            className="bg-red-500 px-2 py-1 text-[10px] font-black tracking-widest text-white disabled:opacity-50">REMOVE</button>
                                                        <button type="button" onClick={() => setConfirming(null)}
                                                            className="px-1 text-[10px] font-black tracking-widest text-white/60 hover:text-white">NO</button>
                                                    </div>
                                                )
                                            }
                                            return (
                                                <div key={b.name} className="flex items-stretch gap-1">
                                                    <button type="button" disabled={!target || saving} onClick={() => onPick(b)}
                                                        className="flex min-w-0 flex-1 items-start gap-2 border border-white/10 px-2 py-1.5 text-left transition-colors hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">
                                                        <span className={`mt-0.5 w-14 shrink-0 text-xs font-black ${isDone ? 'text-green-300' : 'text-cyan-200'}`}>
                                                            {isDone ? '✓ ' : ''}{b.name}
                                                        </span>
                                                        <span className="text-[11px] leading-snug text-white/65">{b.description}</span>
                                                    </button>
                                                    {isDone && (
                                                        <button type="button" disabled={saving} onClick={() => setConfirming(b.name)}
                                                            aria-label={`Remove ${b.name} from the map`} title="Remove from map"
                                                            className="w-7 shrink-0 border border-white/10 text-xs text-red-300/80 hover:border-red-400 hover:text-red-300 disabled:opacity-40">✕</button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                            {groups.length === 0 && <p className="p-2 text-xs italic text-white/50">Nothing matches.</p>}
                        </div>
                        <p className="border-t border-white/10 px-3 py-2 text-[10px] leading-snug text-white/45">
                            Picking a name that already exists moves it to the selected spot. ✕ removes a saved name.
                        </p>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { inviteUrl, squadColours, SELF_COLOUR, type Squad, type SquadMember } from '@/lib/squad'

const DURATIONS = [{ m: 15, label: '15 MIN' }, { m: 60, label: '1 HOUR' }, { m: 120, label: '2 HOURS' }]

function left(iso: string | null) {
    if (!iso) return ''
    const s = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
    return s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.max(1, Math.round(s / 60))}m`
}

export default function SquadPanel({ open, squad, onClose, onFlyTo }: {
    open: boolean
    squad: Squad
    onClose: () => void
    onFlyTo: (m: SquadMember) => void
}) {
    const [minutes, setMinutes] = useState(60)
    const [copied, setCopied] = useState(false)
    const [, force] = useState(0)

    // Refresh the countdown every 20 s while open
    useEffect(() => {
        if (!open) return
        const id = setInterval(() => force(n => n + 1), 20000)
        return () => clearInterval(id)
    }, [open])

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    const url = squad.code ? inviteUrl(squad.code) : ''
    const msg = `Join my squad on THE VEIL and see me live on the campus map 呪 ${url}`
    const copy = async () => {
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* no clipboard */ }
    }
    const nativeShare = async () => {
        try { await navigator.share({ title: 'THE VEIL — squad invite', text: msg, url }) } catch { /* cancelled */ }
    }
    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    const loginHref = `/login?redirect=${encodeURIComponent(`/map${squad.invited ? `?squad=${squad.invited}` : ''}`)}`

    const Durations = (
        <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map(d => (
                <button key={d.m} type="button" onClick={() => setMinutes(d.m)} aria-pressed={minutes === d.m}
                    className={`py-2 text-[11px] font-black tracking-widest ${minutes === d.m ? 'bg-cyan-400 text-black' : 'border border-cyan-400/40 text-cyan-200 hover:border-cyan-300'}`}>
                    {d.label}
                </button>
            ))}
        </div>
    )

    const others = squad.members.filter(m => m.userId !== squad.me)
    const colours = squadColours(squad.members, squad.me)

    return (
        <AnimatePresence>
            {open && (
                <motion.div key="squad"
                    role="dialog" aria-modal="false" aria-labelledby="squad-title"
                    className="pointer-events-auto fixed inset-x-3 bottom-40 z-[70] xl:inset-x-auto xl:bottom-auto xl:left-1/2 xl:top-[118px] xl:w-[380px] xl:-translate-x-1/2"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                    <div className="neon-border bg-black/90 p-4 backdrop-blur-md"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}>
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="jjk-font neon-red text-2xl leading-none">結</span>
                                <div>
                                    <p id="squad-title" className="jjk-font text-xl leading-none text-white">SQUAD LINK</p>
                                    <p className="text-[9px] font-bold tracking-[0.3em] text-white/50">LIVE LOCATION</p>
                                </div>
                            </div>
                            <button onClick={onClose} aria-label="Close" className="px-1 text-white/60 hover:text-white">✕</button>
                        </div>

                        {squad.needsLogin ? (
                            <div className="space-y-3 text-sm text-white/80">
                                <p>Sign in to share your location with your squad.</p>
                                <Link href={loginHref} className="neon-btn w-full justify-center !py-2.5 !text-[11px]">⚡ SIGN IN</Link>
                            </div>
                        ) : !squad.sharing ? (
                            <div className="space-y-3">
                                {squad.invited ? (
                                    <p className="text-sm text-white/80">You&apos;ve been invited to squad <span className="font-black tracking-widest text-cyan-300">{squad.invited}</span>. Share your location to see each other live.</p>
                                ) : (
                                    <p className="text-sm text-white/80">Share where you are and invite friends. Only people in your squad who also share can see you.</p>
                                )}
                                {Durations}
                                <button type="button" disabled={squad.busy}
                                    onClick={() => void squad.start(minutes, squad.invited ?? undefined)}
                                    className="neon-btn w-full justify-center !py-2.5 !text-[11px] disabled:opacity-50">
                                    {squad.busy ? 'CONNECTING…' : squad.invited ? '結 JOIN & SHARE' : '📡 START SHARING'}
                                </button>
                                {squad.invited && (
                                    <button type="button" onClick={squad.dismissInvite} className="w-full text-[10px] font-bold tracking-widest text-white/50 hover:text-white">
                                        NOT NOW
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.2em]">
                                    <span className="flex items-center gap-1.5 text-red-400">
                                        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" style={{ boxShadow: '0 0 8px #ff1f4b' }} /> LIVE · {left(squad.expiresAt)} LEFT
                                    </span>
                                    <span className="text-white/50">SQUAD <span className="text-cyan-300">{squad.code}</span></span>
                                </div>
                                <p className="text-[10px] tracking-wider text-white/40">
                                    Sharing {squad.source === 'guide' ? 'your floating guide’s position' : squad.source === 'gps' ? 'your GPS position' : 'the map centre (no GPS fix yet)'}
                                </p>

                                <div>
                                    <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-white/50">INVITE</p>
                                    <div className="flex items-stretch gap-1">
                                        <input readOnly value={url} aria-label="Invite link" onFocus={e => e.currentTarget.select()}
                                            className="min-w-0 flex-1 border border-cyan-400/30 bg-white/5 px-2 py-2 text-[11px] text-cyan-100 outline-none" />
                                        <button type="button" onClick={copy} className="border border-cyan-400/50 px-3 text-[10px] font-black tracking-widest text-cyan-200 hover:bg-cyan-400/15">
                                            {copied ? '✓' : 'COPY'}
                                        </button>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2">
                                        <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"
                                            className="border border-green-400/50 py-2 text-center text-[10px] font-black tracking-widest text-green-300 hover:bg-green-400/10">
                                            WHATSAPP
                                        </a>
                                        {canNativeShare ? (
                                            <button type="button" onClick={nativeShare} className="border border-white/25 py-2 text-[10px] font-black tracking-widest text-white/80 hover:border-white/60">
                                                SHARE…
                                            </button>
                                        ) : (
                                            <a href={`mailto:?subject=${encodeURIComponent('THE VEIL — squad invite')}&body=${encodeURIComponent(msg)}`}
                                                className="border border-white/25 py-2 text-center text-[10px] font-black tracking-widest text-white/80 hover:border-white/60">
                                                EMAIL
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="mb-1 text-[10px] font-bold tracking-[0.3em] text-white/50">SQUAD · {squad.members.length}</p>
                                    <ul className="max-h-40 space-y-1 overflow-y-auto">
                                        {[...squad.members.filter(m => m.userId === squad.me), ...others].map(m => {
                                            const isMe = m.userId === squad.me
                                            const c = colours.get(m.userId) ?? SELF_COLOUR
                                            return (
                                                <li key={m.userId}>
                                                    <button type="button" onClick={() => onFlyTo(m)}
                                                        className="flex w-full items-center gap-2 border border-white/10 px-2 py-1.5 text-left hover:border-white/30">
                                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                                                        <span className="min-w-0 flex-1 truncate text-xs font-bold" style={{ color: c }}>{isMe ? `${m.name} (you)` : m.name}</span>
                                                        <span className="text-[9px] tracking-widest text-white/40">FLY ↗</span>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                        {others.length === 0 && (
                                            <li className="px-1 py-1 text-[11px] italic text-white/45">No one else yet — send the invite link.</li>
                                        )}
                                    </ul>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button type="button" disabled={squad.busy} onClick={() => void squad.start(minutes, squad.code ?? undefined)}
                                        className="border border-cyan-400/40 py-2 text-[10px] font-black tracking-widest text-cyan-200 hover:border-cyan-300 disabled:opacity-50">
                                        ↻ EXTEND {DURATIONS.find(d => d.m === minutes)?.label}
                                    </button>
                                    <button type="button" disabled={squad.busy} onClick={() => void squad.stop()}
                                        className="border border-red-500/60 py-2 text-[10px] font-black tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-50">
                                        ■ STOP SHARING
                                    </button>
                                </div>
                            </div>
                        )}
                        {squad.error && <p className="mt-2 text-xs text-red-400">{squad.error}</p>}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

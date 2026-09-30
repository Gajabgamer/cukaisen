'use client'

/**
 * Tiny synthesized SFX (WebAudio, no audio files) + the JJK opening loop.
 * Mute state persists in localStorage. Audio only starts after a user gesture.
 */

const MUTE_KEY = 'veil-sfx-muted'
let ctx: AudioContext | null = null
let muted: boolean | null = null
let music: HTMLAudioElement | null = null

export function isMuted() {
    if (muted === null) {
        try { muted = localStorage.getItem(MUTE_KEY) === '1' } catch { muted = false }
    }
    return muted
}

export function setMuted(v: boolean) {
    muted = v
    try { localStorage.setItem(MUTE_KEY, v ? '1' : '0') } catch { /* ignore */ }
    if (v) music?.pause()
}

function ac() {
    if (typeof window === 'undefined' || isMuted()) return null
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) ctx = new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number; delay?: number } = {}) {
    const a = ac()
    if (!a) return
    const t = a.currentTime + (opts.delay ?? 0)
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = opts.type ?? 'sine'
    o.frequency.setValueAtTime(freq, t)
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
}

function noise(dur: number, opts: { gain?: number; from?: number; to?: number; delay?: number } = {}) {
    const a = ac()
    if (!a) return
    const t = a.currentTime + (opts.delay ?? 0)
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
    const ch = buf.getChannelData(0)
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1
    const src = a.createBufferSource()
    src.buffer = buf
    const f = a.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.setValueAtTime(opts.from ?? 400, t)
    f.frequency.exponentialRampToValueAtTime(opts.to ?? 2400, t + dur)
    f.Q.value = 1.2
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t + dur * 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(a.destination)
    src.start(t)
}

export const sfx = {
    /** Picking a place / chip */
    select: () => { tone(880, 0.09, { type: 'triangle', gain: 0.08 }); tone(1320, 0.12, { type: 'sine', gain: 0.06, delay: 0.05 }) },
    /** Route traced */
    route: () => { tone(220, 0.5, { type: 'sawtooth', gain: 0.05, slideTo: 880 }); noise(0.45, { gain: 0.06, from: 300, to: 3000 }) },
    /** 360° portal pops */
    portal: () => { noise(0.5, { gain: 0.12, from: 2400, to: 300 }); tone(660, 0.25, { type: 'sine', gain: 0.05, slideTo: 330 }) },
    /** Domain expansion / arrival slam */
    arrive: () => {
        tone(55, 1.2, { type: 'sine', gain: 0.35, slideTo: 38 })
        noise(0.9, { gain: 0.25, from: 180, to: 60 })
        tone(1760, 0.6, { type: 'triangle', gain: 0.05, delay: 0.25, slideTo: 2640 })
    },
    /** Guide summoned / dismissed */
    summon: () => { tone(330, 0.35, { type: 'sine', gain: 0.1, slideTo: 990 }); noise(0.3, { gain: 0.06, from: 800, to: 4000 }) },
    dismiss: () => { tone(990, 0.3, { type: 'sine', gain: 0.08, slideTo: 330 }) },
    /** Guide bumps into the barrier (off-road) */
    bump: () => { tone(120, 0.12, { type: 'square', gain: 0.05 }) },
}

export function toggleMusic(): boolean {
    if (typeof window === 'undefined') return false
    if (!music) {
        music = new Audio('/jjk/audio/specialz.mp3')
        music.loop = true
        music.volume = 0.3
    }
    if (music.paused) {
        if (isMuted()) setMuted(false)
        void music.play().catch(() => {})
        return true
    }
    music.pause()
    return false
}

export function stopMusic() { music?.pause() }

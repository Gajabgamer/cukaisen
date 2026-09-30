'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type maplibregl from 'maplibre-gl'
import {
    offset, inCampus, buildPath, calculateBearing, angleDelta, type LngLat,
} from '@/lib/map/campusGeo'
import { sfx } from '@/lib/sfx'
import { mapAlive } from '@/lib/map/mapAlive'
import WizardSprite from '@/components/jjk/WizardSprite'

/**
 * Floating guide — replaces the old first-person camera.
 *
 * The character is fixed at screen centre; the map glides underneath (the map
 * centre IS the guide's position), so there's no camera maths to drift.
 *  - Manual: ↑/W float forward, ↓/S back, ←→/A D turn. Steers itself along
 *    roads by probing the rendered road layers ahead and bending toward them.
 *  - Follow: floats along a navigation route on its own and fires onArrive.
 */

const ROAD_LAYERS = ['campus-roads-fill', 'campus-roads-border', 'campus-paths']
const PROBE_OFFSETS = [0, 12, -12, 25, -25, 40, -40, 60, -60]
const MAX_SPEED = 11      // m/s manual
const TURN_RATE = 95      // deg/s
const LOOKAHEAD = 7       // m
const TRAIL_EVERY = 12    // m — fog reveal cadence
type Key = 'up' | 'down' | 'left' | 'right'

const KEYMAP: Record<string, Key> = {
    arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
}

interface Props {
    map: maplibregl.Map
    route: [number, number][] | null
    follow: boolean
    followSpeed?: number
    paused?: boolean
    targetName?: string
    onFollowChange: (follow: boolean) => void
    onStep: (p: LngLat) => void
    onArrive: () => void
    onExit: () => void
}

export default function CursedGuide({
    map, route, follow, followSpeed = 9, paused = false, targetName, onFollowChange, onStep, onArrive, onExit,
}: Props) {
    const keys = useRef(new Set<Key>())
    const spriteRef = useRef<HTMLDivElement>(null)
    const readyRef = useRef(false)
    const [mode, setMode] = useState<'roam' | 'follow' | 'blocked'>('roam')
    const latest = useRef({ follow, followSpeed, paused, onFollowChange, onStep, onArrive })
    useEffect(() => { latest.current = { follow, followSpeed, paused, onFollowChange, onStep, onArrive } })

    // ── Enter / exit: lock the camera into guide view ──
    useEffect(() => {
        const m = map
        m.dragPan.disable()
        m.dragRotate.disable()
        m.keyboard.disable()
        m.doubleClickZoom.disable()
        const start = route && follow && route.length > 1 ? { lng: route[0][0], lat: route[0][1] } : m.getCenter()
        const bearing = route && follow && route.length > 1
            ? calculateBearing(route[0][1], route[0][0], route[Math.min(3, route.length - 1)][1], route[Math.min(3, route.length - 1)][0])
            : m.getBearing()
        m.easeTo({ center: [start.lng, start.lat], zoom: 18.6, pitch: 62, bearing, duration: 900 })
        const t = setTimeout(() => { readyRef.current = true }, 950)
        return () => {
            clearTimeout(t)
            readyRef.current = false
            m.dragPan.enable()
            m.dragRotate.enable()
            m.keyboard.enable()
            m.doubleClickZoom.enable()
            m.easeTo({ pitch: 55, zoom: 17.2, duration: 800 })
        }
        // Only on mount/unmount — route/follow changes are handled in the loop
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map])

    // ── Keyboard ──
    useEffect(() => {
        const isTyping = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            return tag === 'input' || tag === 'textarea' || tag === 'select'
        }
        const down = (e: KeyboardEvent) => {
            if (isTyping(e)) return
            const k = KEYMAP[e.key.toLowerCase()]
            if (!k) return
            e.preventDefault()
            keys.current.add(k)
            if (latest.current.follow) latest.current.onFollowChange(false) // manual override
        }
        const up = (e: KeyboardEvent) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys.current.delete(k) }
        const blur = () => keys.current.clear()
        window.addEventListener('keydown', down)
        window.addEventListener('keyup', up)
        window.addEventListener('blur', blur)
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur) }
    }, [])

    // ── Follow-path state (reset whenever a new route arrives) ──
    const pathRef = useRef<ReturnType<typeof buildPath> | null>(null)
    const followS = useRef(0)
    const arrivedFired = useRef(false)
    useEffect(() => {
        pathRef.current = route && route.length > 1 ? buildPath(route) : null
        followS.current = 0
        arrivedFired.current = false
        if (route && route.length > 1 && follow) {
            map.easeTo({ center: route[0], zoom: 18.6, pitch: 62, duration: 700 })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route])

    // ── Road probe: is there a rendered road under this ground point? ──
    const onRoad = useCallback((p: LngLat, layers: string[]) => {
        const pt = map.project([p.lng, p.lat])
        return map.queryRenderedFeatures([[pt.x - 4, pt.y - 4], [pt.x + 4, pt.y + 4]], { layers }).length > 0
    }, [map])

    // ── Main loop ──
    useEffect(() => {
        let raf = 0
        let last = performance.now()
        let speed = 0
        let bearing = map.getBearing()
        let travelled = 0
        let lastBump = 0
        let shownMode: typeof mode = 'roam'
        const setShownMode = (m: typeof mode) => { if (m !== shownMode) { shownMode = m; setMode(m) } }

        const frame = (now: number) => {
            if (!mapAlive(map)) return // map removed (HMR / remount): stop
            raf = requestAnimationFrame(frame)
            // Clamp generously so slow laptops (low FPS) still float at real speed
            const dt = Math.min(0.12, (now - last) / 1000)
            last = now
            const L = latest.current
            if (!readyRef.current || L.paused) return

            const k = keys.current
            const turn = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0)
            const fwd = (k.has('up') ? 1 : 0) - (k.has('down') ? 1 : 0)
            let pos: LngLat = map.getCenter()
            let moved = 0

            if (L.follow && pathRef.current && pathRef.current.total > 0) {
                // ── Auto-float along the route ──
                const path = pathRef.current
                followS.current = Math.min(path.total, followS.current + L.followSpeed * dt)
                pos = path.at(followS.current)
                const ahead = path.at(followS.current + 12)
                if (Math.abs(ahead.lng - pos.lng) + Math.abs(ahead.lat - pos.lat) > 1e-9) {
                    const target = calculateBearing(pos.lat, pos.lng, ahead.lat, ahead.lng)
                    bearing += angleDelta(bearing, target) * Math.min(1, dt * 3)
                }
                moved = L.followSpeed * dt
                speed = L.followSpeed
                setShownMode('follow')
                if (followS.current >= path.total - 0.5 && !arrivedFired.current) {
                    arrivedFired.current = true
                    L.onFollowChange(false)
                    L.onArrive()
                }
            } else {
                // ── Manual float, self-steering along roads ──
                bearing = map.getBearing() + turn * TURN_RATE * dt
                const target = fwd * MAX_SPEED
                speed += (target - speed) * Math.min(1, dt * 4)
                if (fwd === 0 && Math.abs(speed) < 0.15) speed = 0
                if (speed !== 0) {
                    const dir = speed > 0 ? bearing : bearing + 180
                    const step = Math.abs(speed) * dt
                    const layers = ROAD_LAYERS.filter(id => map.getLayer(id))
                    const here = map.getCenter()
                    const hereOnRoad = layers.length ? onRoad(here, layers) : false
                    let next: LngLat | null = null
                    for (const off of PROBE_OFFSETS) {
                        const probe = offset(here, dir + off, LOOKAHEAD)
                        if (!inCampus(probe)) continue
                        // Off-road (e.g. just summoned on grass): float freely until a road is reached
                        if (!layers.length || !hereOnRoad || onRoad(probe, layers)) {
                            next = offset(here, dir + off, step)
                            if (off !== 0 && turn === 0) bearing += off * Math.min(1, dt * 5)
                            break
                        }
                    }
                    if (next) {
                        pos = next
                        moved = step
                        setShownMode('roam')
                    } else {
                        speed = 0
                        setShownMode('blocked')
                        if (now - lastBump > 600) { lastBump = now; sfx.bump() }
                    }
                } else if (shownMode === 'blocked' && fwd === 0) {
                    setShownMode('roam')
                }
            }

            if (moved > 0 || turn !== 0) map.jumpTo({ center: [pos.lng, pos.lat], bearing })

            // Lean into turns + glow harder while moving (direct DOM: no React re-render per frame)
            const el = spriteRef.current
            if (el) {
                const lean = L.follow ? 0 : turn * 9
                el.style.transform = `rotate(${lean}deg)`
                el.dataset.moving = Math.abs(speed) > 0.5 ? '1' : '0'
            }

            travelled += moved
            if (travelled >= TRAIL_EVERY) { travelled = 0; L.onStep(pos) }
        }
        raf = requestAnimationFrame(frame)
        return () => cancelAnimationFrame(raf)
    }, [map, onRoad])

    const press = useCallback((k: Key, on: boolean) => {
        if (on) { keys.current.add(k); if (latest.current.follow) latest.current.onFollowChange(false) }
        else keys.current.delete(k)
    }, [])
    const hasRoute = !!route && route.length > 1

    return (
        <>
            {/* The guide, pinned at the map centre */}
            <div className="pointer-events-none fixed inset-0 z-[35]" aria-hidden="true">
                <div className="absolute left-1/2 top-1/2">
                    {/* Ground sigil */}
                    <div className="absolute left-0 top-0 h-3 w-10 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-black/60 blur-[3px]" />
                    <div className="pulse-ring absolute left-0 top-0 h-3 w-10 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-300/70" />
                    {/* Character */}
                    <div className="guide-float absolute bottom-1 left-0 w-max -translate-x-1/2">
                        <div ref={spriteRef} className="guide-sprite origin-bottom transition-transform duration-150" data-moving="0">
                            {/* max-w-none: Tailwind's media reset (max-width:100%) would squash it to 0px inside the zero-width centre anchor */}
                            <WizardSprite className="guide-wizard h-[72px] w-auto max-w-none select-none md:h-[84px]" />
                        </div>
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 px-1.5 py-px text-[8px] font-bold tracking-[0.2em] text-cyan-200/90">
                            {mode === 'follow' ? `▶ ${targetName ? targetName.toUpperCase() : 'FOLLOWING PATH'}` : mode === 'blocked' ? '帳 BARRIER' : '四級 // YOU'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[36] flex -translate-x-1/2 items-end gap-3">
                <div className="grid shrink-0 grid-cols-[3rem_3rem_3rem] gap-1">
                    <span /><Pad k="up" label="▲" press={press} /><span />
                    <Pad k="left" label="◀" press={press} /><Pad k="down" label="▼" press={press} /><Pad k="right" label="▶" press={press} />
                </div>
                <div className="neon-border flex flex-col gap-2 bg-black/80 p-3 backdrop-blur-md">
                    <p className="hidden text-[10px] tracking-[0.25em] text-white/60 md:block">↑↓ FLOAT · ←→ TURN · SPACE DISMISS</p>
                    <div className="flex gap-2">
                        {hasRoute && (
                            <button
                                type="button"
                                onClick={() => onFollowChange(!follow)}
                                className={`px-3 py-2 text-[11px] font-bold tracking-widest ${follow ? 'bg-cyan-400 text-black' : 'border border-cyan-400/60 text-cyan-200'}`}
                            >
                                {follow ? '❚❚ PAUSE PATH' : '▶ FOLLOW PATH'}
                            </button>
                        )}
                        <button type="button" onClick={onExit} className="border border-red-500/70 px-3 py-2 text-[11px] font-bold tracking-widest text-red-300">
                            解 DISMISS
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

function Pad({ k, label, press }: { k: Key; label: string; press: (k: Key, on: boolean) => void }) {
    return (
        <button
            type="button"
            aria-label={`Float ${k}`}
            className="neon-border flex h-12 w-12 select-none items-center justify-center bg-black/75 text-lg text-cyan-200 active:bg-cyan-400/30"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); press(k, true) }}
            onPointerUp={() => press(k, false)}
            onPointerCancel={() => press(k, false)}
            onPointerLeave={() => press(k, false)}
        >{label}</button>
    )
}

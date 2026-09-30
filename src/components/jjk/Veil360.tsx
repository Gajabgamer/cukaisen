'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMotionPrefs } from '@/lib/motionPrefs'
import type { TourScene } from '@/lib/tour360'

/* ───────── Pannellum loader (served locally from /public/vendor) ───────── */

type PannellumViewer = { destroy: () => void }
declare global {
    interface Window {
        pannellum?: { viewer: (el: HTMLElement, cfg: Record<string, unknown>) => PannellumViewer }
    }
}

let loader: Promise<void> | null = null
function loadPannellum(): Promise<void> {
    if (typeof window === 'undefined') return Promise.reject(new Error('ssr'))
    if (window.pannellum) return Promise.resolve()
    if (loader) return loader
    loader = new Promise<void>((resolve, reject) => {
        const css = document.createElement('link')
        css.rel = 'stylesheet'
        css.href = '/vendor/pannellum/pannellum.css'
        document.head.appendChild(css)
        const s = document.createElement('script')
        s.src = '/vendor/pannellum/pannellum.js'
        s.onload = () => resolve()
        s.onerror = () => { loader = null; reject(new Error('Failed to load 360 viewer')) }
        document.head.appendChild(s)
    })
    return loader
}

/* ───────── Panorama canvas ───────── */

function PanoCanvas({ scene, autoRotate = 0, interactive = true, className = '' }: {
    scene: TourScene
    autoRotate?: number
    interactive?: boolean
    className?: string
}) {
    const ref = useRef<HTMLDivElement>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        let viewer: PannellumViewer | null = null
        let cancelled = false
        loadPannellum()
            .then(() => {
                const el = ref.current
                if (cancelled || !el || !window.pannellum) return
                // Partial panorama: cap the horizontal FOV so the vertical FOV
                // never exceeds the photo's height (no black bands, even portrait).
                const aspect = el.clientWidth / Math.max(1, el.clientHeight)
                const maxV = (scene.vaov * 0.92 * Math.PI) / 180
                const fitH = (2 * Math.atan(Math.tan(maxV / 2) * aspect) * 180) / Math.PI
                const hfov = Math.min(100, fitH)
                viewer = window.pannellum.viewer(el, {
                    type: 'equirectangular',
                    panorama: scene.image,
                    autoLoad: true,
                    showControls: false,
                    compass: false,
                    haov: 360,
                    vaov: scene.vaov,
                    vOffset: 0,
                    minPitch: -scene.vaov / 2,
                    maxPitch: scene.vaov / 2,
                    yaw: scene.yaw ?? 0,
                    pitch: scene.pitch ?? 0,
                    hfov,
                    minHfov: Math.min(35, hfov),
                    maxHfov: Math.min(120, fitH),
                    autoRotate,
                    autoRotateInactivityDelay: 2500,
                    draggable: interactive,
                    mouseZoom: interactive,
                    keyboardZoom: interactive,
                })
            })
            .catch(() => { if (!cancelled) setFailed(true) })
        return () => { cancelled = true; viewer?.destroy() }
    }, [scene, autoRotate, interactive])

    return (
        <div className={`relative bg-black ${className}`}>
            <div ref={ref} className="absolute inset-0" />
            {failed && (
                <img src={scene.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
        </div>
    )
}

/* ───────── Small pop-up portal (auto-shown when you reach the place) ───────── */

export function Veil360Portal({ scene, placeName, onEnter, onDismiss }: {
    scene: TourScene
    placeName: string
    onEnter: () => void
    onDismiss: () => void
}) {
    return (
        <motion.div
            className="fixed left-4 right-4 top-32 z-[45] md:left-auto md:right-4 md:top-20 md:w-[320px]"
            initial={{ opacity: 0, scale: 0.55, y: -24, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
            <div className="neon-border overflow-hidden bg-black/85 backdrop-blur-md"
                style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}>
                <div className="flex items-center justify-between border-b border-cyan-400/30 px-3 py-2">
                    <p className="jjk-font neon-red neon-flicker text-sm tracking-widest">帳 VEIL THINNING</p>
                    <button onClick={onDismiss} aria-label="Dismiss 360° preview" className="px-1 text-white/60 hover:text-white">✕</button>
                </div>
                <button onClick={onEnter} className="group relative block aspect-video w-full text-left" aria-label={`Open 360° view of ${placeName}`}>
                    <PanoCanvas scene={scene} autoRotate={-5} interactive={false} className="pointer-events-none h-full w-full" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
                        <p className="text-[10px] tracking-[0.35em] text-cyan-300">360° SIGHT DETECTED</p>
                        <p className="jjk-font text-2xl text-white">{placeName}</p>
                        <p className="mt-1 text-[11px] font-bold tracking-widest text-red-400 group-hover:text-red-300">▶ ENTER DOMAIN</p>
                    </div>
                </button>
            </div>
        </motion.div>
    )
}

/* ───────── Fullscreen Domain Expansion 360° view ───────── */

export function Veil360Domain({ scene, placeName, onClose }: {
    scene: TourScene
    placeName: string
    onClose: () => void
}) {
    const { reducedMotion } = useMotionPrefs()
    const [live, setLive] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setLive(true), reducedMotion ? 150 : 1300)
        return () => clearTimeout(t)
    }, [reducedMotion])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <motion.div
            className="fixed inset-0 z-[150] overflow-hidden bg-black"
            initial={{ opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, x: [0, -14, 14, -9, 9, -4, 4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
            role="dialog"
            aria-label={`360° view of ${placeName}`}
        >
            {/* Panorama, revealed by an expanding circle */}
            <motion.div
                className="absolute inset-0"
                initial={{ clipPath: 'circle(0% at 50% 50%)' }}
                animate={{ clipPath: 'circle(150% at 50% 50%)' }}
                transition={{ delay: reducedMotion ? 0 : 0.55, duration: reducedMotion ? 0.2 : 0.9, ease: [0.7, 0, 0.2, 1] }}
            >
                <PanoCanvas scene={scene} autoRotate={-1.5} className="h-full w-full" />
            </motion.div>

            {/* Expanding cursed-energy ring */}
            {!reducedMotion && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <motion.div
                        className="h-40 w-40 rounded-full border-4 border-cyan-300"
                        style={{ boxShadow: '0 0 40px #00f0ff, inset 0 0 40px #00f0ff' }}
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 14, opacity: 0 }}
                        transition={{ delay: 0.5, duration: 1.1, ease: 'easeOut' }}
                    />
                </div>
            )}

            {/* 領域展開 title card */}
            <AnimatePresence>
                {!live && (
                    <motion.div
                        key="title"
                        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center"
                        initial={{ opacity: 0, scale: 2.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85, filter: 'blur(8px)' }}
                        transition={{ duration: 0.45 }}
                    >
                        <p className="jjk-font neon-red text-5xl md:text-7xl">領域展開</p>
                        <p className="jjk-font neon-cyan mt-2 text-4xl md:text-6xl">{placeName}</p>
                        <p className="mt-3 text-[10px] tracking-[0.5em] text-white/70">THE VEIL IS LIFTED</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HUD */}
            <motion.div
                className="pointer-events-none absolute inset-0 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: live ? 1 : 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)' }} />
                <div className="scanlines absolute inset-0" />
                <span className="absolute left-4 top-4 h-10 w-10 border-l-2 border-t-2 border-cyan-300" />
                <span className="absolute right-4 top-4 h-10 w-10 border-r-2 border-t-2 border-cyan-300" />
                <span className="absolute bottom-4 left-4 h-10 w-10 border-b-2 border-l-2 border-red-500" />
                <span className="absolute bottom-4 right-4 h-10 w-10 border-b-2 border-r-2 border-red-500" />
                <div className="absolute left-7 top-7 md:left-10 md:top-9">
                    <p className="text-[10px] tracking-[0.4em] text-cyan-300">帳 360° FIELD RECORD // {scene.id.toUpperCase()}</p>
                    <h2 className="jjk-font neon-cyan text-4xl md:text-6xl">{placeName}</h2>
                </div>
                <p className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tracking-[0.4em] text-white/70">
                    DRAG TO LOOK AROUND · SCROLL TO ZOOM · ESC TO RELEASE
                </p>
            </motion.div>

            <button onClick={onClose} className="neon-btn neon-btn-red absolute right-7 top-7 z-20 !px-4 !py-2 md:right-10 md:top-9">
                解 Release
            </button>
        </motion.div>
    )
}

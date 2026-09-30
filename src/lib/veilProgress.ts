'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GATE_2_COORDS, metersBetween, type LngLat } from '@/lib/map/campusGeo'

/**
 * "Lift the Veil" progress, persisted per device in localStorage.
 *  - reveals: circles that burn holes in the Veil fog
 *  - reclaimed: place ids the user has actually arrived at (red 呪 seal + counter)
 */

export type Reveal = { lng: number; lat: number; r: number }
export interface VeilProgress { reclaimed: string[]; reveals: Reveal[] }

const KEY = 'veil-progress-v1'
const MAX_REVEALS = 450
/** Where every first-year enters: a small clearing at Gate 2 so the fog reads as "lifted here". */
export const START_REVEAL: Reveal = { lng: GATE_2_COORDS.lng, lat: GATE_2_COORDS.lat, r: 55 }

export const REVEAL_RADIUS = { sensed: 38, reclaimed: 85, trail: 26, sight360: 45 } as const

const empty = (): VeilProgress => ({ reclaimed: [], reveals: [START_REVEAL] })

function load(): VeilProgress {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return empty()
        const p = JSON.parse(raw) as VeilProgress
        return { reclaimed: Array.isArray(p.reclaimed) ? p.reclaimed : [], reveals: Array.isArray(p.reveals) && p.reveals.length ? p.reveals : [START_REVEAL] }
    } catch {
        return empty()
    }
}

/** True if `next` is already fully covered by an existing reveal (skip duplicates). */
function covered(list: Reveal[], next: Reveal) {
    return list.some(r => r.r >= next.r && metersBetween(r, next) + next.r <= r.r + 4)
}

export function useVeilProgress() {
    const [progress, setProgress] = useState<VeilProgress>(empty)
    const loaded = useRef(false)

    useEffect(() => {
        // One-time client-only localStorage read (unavailable during SSR).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProgress(load())
        loaded.current = true
    }, [])

    useEffect(() => {
        if (!loaded.current) return
        const t = setTimeout(() => {
            try { localStorage.setItem(KEY, JSON.stringify(progress)) } catch { /* quota / private mode */ }
        }, 300)
        return () => clearTimeout(t)
    }, [progress])

    const reveal = useCallback((pt: LngLat, r: number) => {
        setProgress(prev => {
            const next = { lng: pt.lng, lat: pt.lat, r }
            if (covered(prev.reveals, next)) return prev
            const reveals = [...prev.reveals, next]
            return { ...prev, reveals: reveals.length > MAX_REVEALS ? [START_REVEAL, ...reveals.slice(-MAX_REVEALS + 1)] : reveals }
        })
    }, [])

    const reclaim = useCallback((placeId: string, pt: LngLat) => {
        setProgress(prev => ({
            reclaimed: prev.reclaimed.includes(placeId) ? prev.reclaimed : [...prev.reclaimed, placeId],
            reveals: covered(prev.reveals, { ...pt, r: REVEAL_RADIUS.reclaimed })
                ? prev.reveals
                : [...prev.reveals, { lng: pt.lng, lat: pt.lat, r: REVEAL_RADIUS.reclaimed }],
        }))
    }, [])

    const reset = useCallback(() => setProgress(empty()), [])

    return { progress, reveal, reclaim, reset }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GATE_2_COORDS, isWithinCU } from '@/lib/map/campusGeo'

/**
 * Squad live-location sharing.
 * Only people holding the same invite code AND actively sharing can see each
 * other (enforced by /api/location/active). Positions are pushed/pulled every
 * 5 s while the page is open.
 */

export interface SquadMember {
    userId: string
    name: string
    latitude: number
    longitude: number
    expiresAt: string
    updatedAt: string
}

type Pos = { lat: number; lng: number }
type Saved = { code: string; expiresAt: string }

const KEY = 'veil-squad-v1'
const TICK_MS = 5000
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

export const SQUAD_RE = /^[A-Z0-9]{4,8}$/

export function newSquadCode(len = 6) {
    const bytes = new Uint8Array(len)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
}

export function inviteUrl(code: string) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/map?squad=${code}`
}

// Clearly distinct hues (you are always cyan)
const PALETTE = ['#ff4d8d', '#a3e635', '#ffb020', '#c084fc', '#34d399', '#fde047', '#fb7185', '#60a5fa', '#f97316', '#e879f9']
export const SELF_COLOUR = '#5ff5ff'

/** Each squad mate gets a different colour (by stable sorted order), you stay cyan. */
export function squadColours(members: { userId: string }[], me: string | null) {
    const map = new Map<string, string>()
    const others = members.map(m => m.userId).filter(id => id !== me).sort()
    others.forEach((id, i) => map.set(id, PALETTE[i % PALETTE.length]))
    if (me) map.set(me, SELF_COLOUR)
    return map
}

export type ShareSource = 'guide' | 'gps' | 'map'

/**
 * @param getGuidePos returns the floating guide's position when it's out
 *        (so a stage demo shares where the guide floats), else null.
 */
export function useSquad(getGuidePos: () => Pos | null, getMapCentre: () => Pos | null) {
    const [code, setCode] = useState<string | null>(null)
    const [invited, setInvited] = useState<string | null>(null)
    const [sharing, setSharing] = useState(false)
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [members, setMembers] = useState<SquadMember[]>([])
    const [me, setMe] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [needsLogin, setNeedsLogin] = useState(false)
    const [source, setSource] = useState<ShareSource>('map')

    const gps = useRef<Pos | null>(null)
    const getters = useRef({ getGuidePos, getMapCentre })
    useEffect(() => { getters.current = { getGuidePos, getMapCentre } })

    // Restore an unexpired share; pick up ?squad=CODE invites
    useEffect(() => {
        const url = new URL(window.location.href)
        const inv = (url.searchParams.get('squad') || '').toUpperCase()
        let saved: Saved | null = null
        try { saved = JSON.parse(localStorage.getItem(KEY) || 'null') } catch { /* ignore */ }
        const live = saved && SQUAD_RE.test(saved.code) && new Date(saved.expiresAt).getTime() > Date.now()
        // One-time client-only restore (URL + localStorage unavailable during SSR)
        /* eslint-disable react-hooks/set-state-in-effect */
        if (SQUAD_RE.test(inv) && (!live || saved!.code !== inv)) setInvited(inv)
        if (live) { setCode(saved!.code); setExpiresAt(saved!.expiresAt); setSharing(true) }
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [])

    const currentPos = useCallback((): { pos: Pos | null; src: ShareSource } => {
        const g = getters.current.getGuidePos()
        if (g) return { pos: g, src: 'guide' }
        if (gps.current) return { pos: gps.current, src: 'gps' }
        const c = getters.current.getMapCentre()
        return { pos: c && isWithinCU(c.lat, c.lng) ? c : { ...GATE_2_COORDS }, src: 'map' }
    }, [])

    const clearLocal = useCallback(() => {
        setSharing(false)
        setExpiresAt(null)
        setMembers([])
        try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    }, [])

    const start = useCallback(async (minutes: number, joinCode?: string) => {
        setBusy(true)
        setError(null)
        const squadCode = (joinCode || code || newSquadCode()).toUpperCase()
        const { pos } = currentPos()
        try {
            const res = await fetch('/api/location/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ latitude: pos!.lat, longitude: pos!.lng, squadCode, durationMinutes: minutes }),
                signal: AbortSignal.timeout(15000),
            })
            if (res.status === 401) { setNeedsLogin(true); return false }
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Could not start sharing')
            setNeedsLogin(false)
            setCode(squadCode)
            setInvited(null)
            setExpiresAt(data.expiresAt)
            setSharing(true)
            try { localStorage.setItem(KEY, JSON.stringify({ code: squadCode, expiresAt: data.expiresAt })) } catch { /* ignore */ }
            // Drop ?squad= from the address bar so a refresh doesn't re-prompt
            const url = new URL(window.location.href)
            if (url.searchParams.has('squad')) { url.searchParams.delete('squad'); window.history.replaceState(null, '', url.toString()) }
            return true
        } catch (e) {
            const timedOut = e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError')
            setError(timedOut ? 'Server took too long. Tap again.' : e instanceof Error ? e.message : 'Could not start sharing')
            return false
        } finally {
            setBusy(false)
        }
    }, [code, currentPos])

    const stop = useCallback(async () => {
        setBusy(true)
        try { await fetch('/api/location/share', { method: 'DELETE' }) } catch { /* offline: expiry cleans up */ }
        clearLocal()
        setBusy(false)
    }, [clearLocal])

    // GPS while sharing (the guide/map centre are fallbacks)
    useEffect(() => {
        if (!sharing || !navigator.geolocation) return
        const id = navigator.geolocation.watchPosition(
            p => {
                const lat = p.coords.latitude, lng = p.coords.longitude
                gps.current = isWithinCU(lat, lng) ? { lat, lng } : null
            },
            () => { gps.current = null },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
        )
        return () => navigator.geolocation.clearWatch(id)
    }, [sharing])

    // Push my position + pull the squad every 5 s
    useEffect(() => {
        if (!sharing || !code) return
        let stopped = false
        const tick = async () => {
            const { pos, src } = currentPos()
            setSource(src)
            try {
                if (pos) {
                    const up = await fetch('/api/location/share', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude: pos.lat, longitude: pos.lng, squadCode: code, update: true }),
                        signal: AbortSignal.timeout(10000),
                    })
                    if (up.status === 410 || up.status === 401) { if (!stopped) { clearLocal(); if (up.status === 401) setNeedsLogin(true) } return }
                }
                const res = await fetch(`/api/location/active?squad=${code}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
                if (!res.ok || stopped) return
                const data = await res.json()
                setMe(data.me)
                setMembers(data.locations || [])
            } catch { /* transient network error: try again next tick */ }
        }
        void tick()
        const id = window.setInterval(tick, TICK_MS)
        // Auto-stop when the share expires
        const ms = expiresAt ? new Date(expiresAt).getTime() - Date.now() : 0
        const exp = ms > 0 ? window.setTimeout(clearLocal, ms) : 0
        return () => { stopped = true; window.clearInterval(id); window.clearTimeout(exp) }
    }, [sharing, code, expiresAt, currentPos, clearLocal])

    return {
        code, invited, sharing, expiresAt, members, me, busy, error, needsLogin, source,
        start, stop, dismissInvite: () => setInvited(null),
    }
}

export type Squad = ReturnType<typeof useSquad>

'use client'

import { useEffect, useRef } from 'react'
import type maplibregl from 'maplibre-gl'
import { mapAlive } from '@/lib/map/mapAlive'
import { squadColours, SELF_COLOUR, type SquadMember } from '@/lib/squad'

/**
 * Squad members on the map: a small Grade-4 sorcerer in the member's own
 * colour with their name above. Positions glide between 5 s updates.
 */

let gradId = 0
function sorcererSvg(colour: string) {
    const g = `sqg${gradId++}`
    return `<svg viewBox="0 0 60 110" width="30" height="55" aria-hidden="true">
<defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${colour}" stop-opacity=".85"/><stop offset="1" stop-color="${colour}" stop-opacity="0"/></linearGradient></defs>
<path d="M17 60 Q30 66 43 60 C42 74 38 86 32 98 C30 102 30 105 31 108 C26 98 22 86 20 76 C18 70 17 65 17 60 Z" fill="url(#${g})"/>
<line x1="44" y1="9" x2="48" y2="104" stroke="#6b4a2e" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="44" cy="8" r="2" fill="${colour}"/>
<path d="M20 28 Q14 40 15 56 L20 56 Q20 42 23 32 Z" fill="#191c2a" stroke="${colour}" stroke-width="1"/>
<path d="M20 26 Q30 22 40 26 L43 60 Q30 65 17 60 Z" fill="#1c1f2e" stroke="${colour}" stroke-width="1.4"/>
<path d="M40 28 Q46 38 46 50 L41 51 Q41 40 37 32 Z" fill="#191c2a" stroke="${colour}" stroke-width="1"/>
<circle cx="44.6" cy="50.5" r="2.2" fill="#d8b894"/>
<path d="M22 22 Q30 26 38 22 L39 28 Q30 31 21 28 Z" fill="${colour}" opacity=".9"/>
<circle cx="30" cy="14" r="8" fill="#16131d"/>
<path d="M22 13 L19 9 L24 10 L23 5 L28 8 L30 3 L32 8 L37 5 L36 10 L41 9 L38 14 Z" fill="#16131d"/>
</svg>`
}

function ago(iso: string) {
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
    return s < 60 ? `${s}s` : `${Math.round(s / 60)}m`
}

type Entry = { marker: maplibregl.Marker; el: HTMLElement; label: HTMLElement; cur: { lng: number; lat: number }; target: { lng: number; lat: number } }

export default function SquadMarkers({ map, members, me, showSelf, onSelect }: {
    map: maplibregl.Map
    members: SquadMember[]
    me: string | null
    /** Hide my own marker while the floating guide already represents me. */
    showSelf: boolean
    onSelect: (m: SquadMember) => void
}) {
    const entries = useRef(new Map<string, Entry>())
    const lib = useRef<typeof maplibregl | null>(null)
    const onSelectRef = useRef(onSelect)
    useEffect(() => { onSelectRef.current = onSelect })
    const byId = useRef(new Map<string, SquadMember>())

    // Sync markers with members
    useEffect(() => {
        let cancelled = false
        const sync = async () => {
            if (!lib.current) lib.current = (await import('maplibre-gl')).default
            if (cancelled || !mapAlive(map)) return
            const want = members.filter(m => showSelf || m.userId !== me)
            const colours = squadColours(members, me)
            byId.current = new Map(want.map(m => [m.userId, m]))
            for (const [id, e] of entries.current) {
                if (!byId.current.has(id)) { e.marker.remove(); entries.current.delete(id) }
            }
            for (const m of want) {
                const isMe = m.userId === me
                const colour = colours.get(m.userId) ?? SELF_COLOUR
                const stale = Date.now() - new Date(m.updatedAt).getTime() > 30000
                const text = `${isMe ? 'YOU' : m.name.toUpperCase()}${stale ? ` · ${ago(m.updatedAt)}` : ''}`
                const target = { lng: m.longitude, lat: m.latitude }
                let e = entries.current.get(m.userId)
                if (!e) {
                    const el = document.createElement('button')
                    el.type = 'button'
                    el.className = 'squad-mk'
                    el.style.setProperty('--c', colour)
                    el.setAttribute('aria-label', `${isMe ? 'You' : m.name} — live location`)
                    const label = document.createElement('span')
                    label.className = 'squad-name'
                    const body = document.createElement('span')
                    body.className = 'squad-body'
                    body.innerHTML = sorcererSvg(colour)
                    const ring = document.createElement('span')
                    ring.className = 'squad-ring'
                    el.append(label, body, ring)
                    el.addEventListener('click', ev => {
                        ev.stopPropagation()
                        const cur = byId.current.get(m.userId)
                        if (cur) onSelectRef.current(cur)
                    })
                    const marker = new lib.current.Marker({ element: el, anchor: 'bottom' }).setLngLat(target).addTo(map)
                    e = { marker, el, label, cur: { ...target }, target }
                    entries.current.set(m.userId, e)
                }
                e.target = target
                e.label.textContent = text
                // Colours can shift when someone joins/leaves — keep marker + SVG in sync
                if (e.el.style.getPropertyValue('--c') !== colour) {
                    e.el.style.setProperty('--c', colour)
                    const body = e.el.querySelector('.squad-body')
                    if (body) body.innerHTML = sorcererSvg(colour)
                }
                e.el.classList.toggle('is-stale', stale)
            }
        }
        void sync()
        return () => { cancelled = true }
    }, [map, members, me, showSelf])

    // Glide toward the latest position
    useEffect(() => {
        let raf = 0
        const tick = () => {
            if (!mapAlive(map)) return
            raf = requestAnimationFrame(tick)
            for (const e of entries.current.values()) {
                const dx = e.target.lng - e.cur.lng, dy = e.target.lat - e.cur.lat
                if (Math.abs(dx) + Math.abs(dy) < 1e-8) continue
                e.cur = { lng: e.cur.lng + dx * 0.08, lat: e.cur.lat + dy * 0.08 }
                e.marker.setLngLat(e.cur)
            }
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [map])

    // Remove everything on unmount / map change
    useEffect(() => {
        const all = entries.current
        return () => { for (const e of all.values()) e.marker.remove(); all.clear() }
    }, [map])

    return null
}

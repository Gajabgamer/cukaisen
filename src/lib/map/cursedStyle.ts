import type maplibregl from 'maplibre-gl'
import { CU_CAMPUS_BOUNDARY } from '@/lib/map/campusGeo'
import { applyJapanStyle } from '@/lib/map/japanStyle'
import { mapAlive } from '@/lib/map/mapAlive'

/**
 * "Cursed dusk" look for the campus map.
 *  - The real campus stays readable: grass is green, water is blue, roads are
 *    roads — just graded toward a violet dusk.
 *  - Buildings are the cursed part: crimson, pulsing like a heartbeat.
 *  - The Veil is a translucent barrier curtain standing on the campus edge.
 * Idempotent: safe to call again after the satellite toggle reloads the style.
 */

const OWN_PREFIXES = ['campus-', 'route-', 'veil-', 'tour-', 'places-', 'selected-', 'reclaimed-']
const OWN_LAYERS = new Set(['3d-buildings', 'building-outlines'])
const isOwn = (id: string) => OWN_LAYERS.has(id) || OWN_PREFIXES.some(p => id.startsWith(p))

export { mapAlive }

function paint(m: maplibregl.Map, id: string, prop: string, value: unknown) {
    try {
        if (!mapAlive(m) || !m.getLayer(id)) return
        m.setPaintProperty(id, prop, value)
    } catch { /* property not valid for this layer type / map gone */ }
}

/** Dusk grade for the base style: keep each feature's hue family, darken + tint violet. */
function gradeBase(m: maplibregl.Map) {
    for (const l of m.getStyle().layers || []) {
        if (isOwn(l.id)) continue
        const id = l.id.toLowerCase()
        const water = /water|ocean|river|lake|stream|canal/.test(id)
        const green = /park|grass|wood|forest|green|scrub|garden|meadow|landcover|golf|cemetery|pitch/.test(id)
        const road = /road|highway|street|transport|bridge|tunnel|path|track|aeroway/.test(id)
        switch (l.type) {
            case 'background':
                paint(m, l.id, 'background-color', '#2b2638')
                break
            case 'fill':
                paint(m, l.id, 'fill-pattern', undefined)
                paint(m, l.id, 'fill-color', water ? '#23578a' : green ? '#3f8a4f' : road ? '#3a3550' : '#312b40')
                paint(m, l.id, 'fill-outline-color', 'rgba(0,0,0,0)')
                break
            case 'line':
                if (water) paint(m, l.id, 'line-color', '#2b6699')
                else if (/rail/.test(id)) paint(m, l.id, 'line-color', '#4a4460')
                else if (/casing|outline/.test(id)) paint(m, l.id, 'line-color', '#1d1829')
                else if (road) paint(m, l.id, 'line-color', '#4a4466')
                else if (/boundary|admin/.test(id)) paint(m, l.id, 'line-color', '#5b3a8c')
                break
            case 'fill-extrusion':
                // The base style's own 3D buildings would double ours
                try { m.setLayoutProperty(l.id, 'visibility', 'none') } catch { /* ignore */ }
                break
            case 'symbol':
                paint(m, l.id, 'text-color', '#e9e3ff')
                paint(m, l.id, 'text-halo-color', '#17121f')
                paint(m, l.id, 'text-halo-width', 1.2)
                paint(m, l.id, 'icon-opacity', 0.8)
                break
            case 'raster':
                paint(m, l.id, 'raster-brightness-max', 0.72)
                paint(m, l.id, 'raster-saturation', -0.15)
                paint(m, l.id, 'raster-hue-rotate', 12)
                break
        }
    }
}

/** A thin polygon strip just outside the campus boundary, extruded into the barrier. */
function curtainRing(): GeoJSON.Feature {
    const n = CU_CAMPUS_BOUNDARY.length
    const cx = CU_CAMPUS_BOUNDARY.reduce((s, p) => s + p[0], 0) / n
    const cy = CU_CAMPUS_BOUNDARY.reduce((s, p) => s + p[1], 0) / n
    const outer = CU_CAMPUS_BOUNDARY.map(([x, y]) => [cx + (x - cx) * 1.009, cy + (y - cy) * 1.009] as [number, number])
    const inner = [...CU_CAMPUS_BOUNDARY].reverse()
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [outer, inner] } }
}

export function applyCursedStyle(m: maplibregl.Map, satellite: boolean) {
    try { gradeBase(m) } catch { /* style not ready */ }

    // Roads: real road surfaces, a faint cyan line of cursed energy down the middle
    paint(m, 'campus-roads-border', 'line-color', '#1d1829')
    paint(m, 'campus-roads-border', 'line-opacity', 0.85)
    paint(m, 'campus-roads-border', 'line-blur', 0)
    paint(m, 'campus-roads-fill', 'line-color', '#4a4466')
    paint(m, 'campus-paths', 'line-color', '#8f86b5')
    paint(m, 'campus-paths', 'line-opacity', 0.6)
    if (!satellite && !m.getLayer('veil-road-core')) {
        const src = m.getLayer('campus-roads-fill')?.source
        if (src) {
            try {
                m.addLayer({
                    id: 'veil-road-core', type: 'line', source: src, 'source-layer': 'transportation', minzoom: 15,
                    filter: ['!', ['in', ['get', 'class'], ['literal', ['path', 'footway', 'pedestrian', 'track']]]],
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: {
                        'line-color': '#5ff5ff',
                        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.4, 18, 1, 20, 1.8],
                        'line-opacity': 0.35,
                        'line-blur': 0.6,
                    },
                }, m.getLayer('3d-buildings') ? '3d-buildings' : undefined)
            } catch { /* source not ready */ }
        }
    }

    // Trees, grass and water stay recognisable
    paint(m, 'campus-parks', 'fill-color', '#4a9e58')
    paint(m, 'campus-parks', 'fill-opacity', 0.85)
    paint(m, 'campus-water', 'fill-color', '#2a6aa3')
    paint(m, 'campus-water', 'fill-opacity', 0.65)

    // Buildings: vermilion lacquer walls (colour is animated by startCursedPulse)
    paint(m, '3d-buildings', 'fill-extrusion-color', '#8f1d24')
    paint(m, '3d-buildings', 'fill-extrusion-vertical-gradient', true)
    paint(m, 'building-outlines', 'line-color', '#c9a24a')
    paint(m, 'building-outlines', 'line-width', 1.2)
    paint(m, 'building-outlines', 'line-opacity', 0.5)

    // Outside the barrier: ink black. The edge: blood-red glow.
    paint(m, 'campus-mask-layer', 'fill-color', '#0b0712')
    paint(m, 'campus-boundary-glow', 'line-color', '#ff1f4b')
    paint(m, 'campus-boundary-glow', 'line-width', 10)
    paint(m, 'campus-boundary-glow', 'line-opacity', 0.5)
    paint(m, 'campus-boundary-glow', 'line-blur', 6)
    paint(m, 'campus-boundary-line', 'line-color', '#ff5277')
    paint(m, 'campus-boundary-line', 'line-width', 2)

    // The Veil curtain on the campus edge
    if (!m.getSource('veil-curtain')) m.addSource('veil-curtain', { type: 'geojson', data: curtainRing() })
    if (!m.getLayer('veil-curtain')) {
        m.addLayer({
            id: 'veil-curtain', type: 'fill-extrusion', source: 'veil-curtain',
            paint: {
                'fill-extrusion-color': '#3a0f5c',
                'fill-extrusion-height': 140,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.32,
                'fill-extrusion-vertical-gradient': true,
            },
        }, ['selected-pulse', 'reclaimed-rings', 'places-layer'].find(id => m.getLayer(id)))
    }

    // Temples, trees, torii, banners, placards, seigaiha water
    applyJapanStyle(m)

    // Sunset sky: violet overhead, ember-red horizon
    const withSky = m as unknown as { setSky?: (s: Record<string, unknown>) => void }
    try {
        withSky.setSky?.({
            'sky-color': '#1a1030', 'horizon-color': '#b8434f', 'fog-color': '#4a2340',
            'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.4, 'atmosphere-blend': 0.7,
        })
    } catch { /* older style spec */ }
}

export function setVeilVisible(m: maplibregl.Map, visible: boolean) {
    try {
        if (mapAlive(m) && m.getLayer('veil-curtain')) m.setLayoutProperty('veil-curtain', 'visibility', visible ? 'visible' : 'none')
    } catch { /* map gone / style swapping */ }
}

/* ───────── Heartbeat: buildings bleed, the curtain breathes ───────── */

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
function mix(c1: [number, number, number], c2: [number, number, number], t: number) {
    return `rgb(${lerp(c1[0], c2[0], t)},${lerp(c1[1], c2[1], t)},${lerp(c1[2], c2[2], t)})`
}
const DARK: [number, number, number] = [112, 20, 28]
const BLEED: [number, number, number] = [222, 56, 50]

/** Double-thump heartbeat, 0..1, period ~1.6 s. */
function heartbeat(ms: number) {
    const t = (ms % 1600) / 1600
    const bump = (c: number, w: number) => Math.exp(-((t - c) ** 2) / w)
    return Math.min(1, bump(0.08, 0.0025) + 0.65 * bump(0.26, 0.003))
}

/** Animates the cursed pulse. Only uniform paint props change, so it's cheap. Returns stop(). */
export function startCursedPulse(m: maplibregl.Map, reducedMotion = false) {
    if (reducedMotion) {
        paint(m, '3d-buildings', 'fill-extrusion-color', mix(DARK, BLEED, 0.4))
        return () => {}
    }
    let raf = 0
    let last = 0
    const tick = (now: number) => {
        if (!mapAlive(m)) return // map removed: stop the loop
        raf = requestAnimationFrame(tick)
        if (now - last < 66) return // ~15 fps is plenty for a glow
        last = now
        const h = heartbeat(now)
        try {
            if (m.getLayer('3d-buildings')) m.setPaintProperty('3d-buildings', 'fill-extrusion-color', mix(DARK, BLEED, 0.25 + 0.75 * h))
            if (m.getLayer('building-outlines')) m.setPaintProperty('building-outlines', 'line-opacity', 0.3 + 0.6 * h)
            if (m.getLayer('veil-curtain')) m.setPaintProperty('veil-curtain', 'fill-extrusion-opacity', 0.24 + 0.14 * Math.sin(now / 1400) ** 2)
            if (m.getLayer('jp-lantern-glow')) m.setPaintProperty('jp-lantern-glow', 'circle-opacity', 0.42 + 0.14 * Math.sin(now / 170) * Math.sin(now / 53))
        } catch { /* style swapping */ }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
}

/* ───────── Route: glow + core + flowing cursed-energy dashes ───────── */

export function ensureRouteLayers(m: maplibregl.Map) {
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
    if (!m.getSource('route-main')) m.addSource('route-main', { type: 'geojson', data: empty })
    if (!m.getSource('route-walk')) m.addSource('route-walk', { type: 'geojson', data: empty })
    const round = { 'line-join': 'round', 'line-cap': 'round' } as const
    const add = (layer: maplibregl.LayerSpecification) => { if (!m.getLayer(layer.id)) m.addLayer(layer) }
    add({ id: 'route-walk-outline', type: 'line', source: 'route-walk', layout: round, paint: { 'line-color': '#ffffff', 'line-width': 0, 'line-opacity': 0 } })
    add({ id: 'route-walk-line', type: 'line', source: 'route-walk', layout: round, paint: { 'line-color': '#ff2bd6', 'line-width': 2.5, 'line-dasharray': [0.1, 2.5], 'line-opacity': 0.85 } })
    add({ id: 'route-main-glow', type: 'line', source: 'route-main', layout: round, paint: { 'line-color': '#00d5ff', 'line-width': 18, 'line-blur': 12, 'line-opacity': 0.5 } })
    add({ id: 'route-main-outline', type: 'line', source: 'route-main', layout: round, paint: { 'line-color': '#05030a', 'line-width': 8, 'line-opacity': 0.9 } })
    add({ id: 'route-main-line', type: 'line', source: 'route-main', layout: round, paint: { 'line-color': '#5ff5ff', 'line-width': 4.5, 'line-opacity': 1 } })
    add({ id: 'route-flow', type: 'line', source: 'route-main', layout: round, paint: { 'line-color': '#ffffff', 'line-width': 2.5, 'line-opacity': 0.95, 'line-dasharray': [0, 4, 3] } })
}

const DASH_SEQUENCE = [
    [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
    [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
]

/** Animates the dashes on `route-flow` so energy streams toward the destination. */
export function startRouteFlow(m: maplibregl.Map) {
    let step = 0
    const id = window.setInterval(() => {
        if (!mapAlive(m)) { window.clearInterval(id); return }
        try {
            if (!m.getLayer('route-flow')) return
            m.setPaintProperty('route-flow', 'line-dasharray', DASH_SEQUENCE[step])
        } catch { /* style swapping */ }
        step = (step + 1) % DASH_SEQUENCE.length
    }, 55)
    return () => window.clearInterval(id)
}

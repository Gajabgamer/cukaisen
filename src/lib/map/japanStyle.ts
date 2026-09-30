import type maplibregl from 'maplibre-gl'
import { offset, inCampus, pointInPolygon, metersBetween, type LngLat } from '@/lib/map/campusGeo'
import { TOUR_SPOTS } from '@/lib/tour360'
import { mapAlive } from '@/lib/map/mapAlive'

/**
 * Japanese dressing for the Cursed view — everything is plain MapLibre layers
 * (no 3D models): temple-layered buildings, roadside sakura/pine/lanterns,
 * torii gates, nobori banners, wooden placards and seigaiha water.
 */

export const JP = {
    vermilion: '#d9381e', sumi: '#1b1a1f', gold: '#c9a24a', washi: '#f3e7cf', stone: '#4a4452', roof: '#17131d',
    sakura: '#f4a7c0', sakuraLight: '#fbd3df', pine: '#1f4d33', pineMid: '#2a6340', pineTop: '#357a4d',
    trunk: '#4a2f27', lantern: '#ffb347', lanternStone: '#8b8594',
} as const

/** Kanji shown on each place's wooden placard. */
export function kanjiFor(category?: string | null) {
    const c = (category || '').toLowerCase()
    if (/hostel|dorm/.test(c)) return '寮'
    if (/food|canteen|cafe|mess|restaurant/.test(c)) return '食'
    if (/gate/.test(c)) return '門'
    if (/parking/.test(c)) return '車'
    if (/park|garden|fountain/.test(c)) return '園'
    if (/play|sport|ground|court|gym/.test(c)) return '武'
    if (/library/.test(c)) return '書'
    if (/medical|health|clinic|hospital/.test(c)) return '癒'
    if (/admin|office/.test(c)) return '府'
    if (/department|academic|class|lab/.test(c)) return '学'
    if (/building|block/.test(c)) return '館'
    return '所'
}

/* ───────── Pure geometry (unit-tested) ───────── */

export type PropFeature = GeoJSON.Feature<GeoJSON.Polygon, { b: number; h: number; c: string }>
const M = 111320

export function hash01(a: number, b: number) {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
    return s - Math.floor(s)
}

function square(c: LngLat, half: number): [number, number][] {
    const dLat = half / M
    const dLng = half / (M * Math.cos(c.lat * Math.PI / 180))
    return [[c.lng - dLng, c.lat - dLat], [c.lng + dLng, c.lat - dLat], [c.lng + dLng, c.lat + dLat], [c.lng - dLng, c.lat + dLat], [c.lng - dLng, c.lat - dLat]]
}

/** Rectangle centred on c, `length` along compass `axis`, `thick` across it. */
function rect(c: LngLat, axis: number, length: number, thick: number): [number, number][] {
    const a1 = offset(c, axis, length / 2)
    const a2 = offset(c, axis + 180, length / 2)
    const side = (p: LngLat, s: number) => offset(p, axis + 90, (s * thick) / 2)
    const ring = [side(a1, 1), side(a2, 1), side(a2, -1), side(a1, -1), side(a1, 1)]
    return ring.map(p => [p.lng, p.lat])
}

const feat = (ring: [number, number][], b: number, h: number, c: string): PropFeature =>
    ({ type: 'Feature', properties: { b, h, c }, geometry: { type: 'Polygon', coordinates: [ring] } })

export type TreeKind = 'sakura' | 'pine' | 'lantern'

export function buildTree(c: LngLat, kind: TreeKind, s = 1.5): PropFeature[] {
    if (kind === 'sakura') return [
        feat(square(c, 0.35 * s), 0, 2.6 * s, JP.trunk),
        feat(square(c, 2.4 * s), 2.6 * s, 4.6 * s, JP.sakura),
        feat(square(c, 1.6 * s), 4.6 * s, 5.8 * s, JP.sakuraLight),
    ]
    if (kind === 'pine') return [
        feat(square(c, 0.3 * s), 0, 2 * s, JP.trunk),
        feat(square(c, 2.6 * s), 2 * s, 3.4 * s, JP.pine),
        feat(square(c, 1.9 * s), 3.4 * s, 4.8 * s, JP.pineMid),
        feat(square(c, 1.1 * s), 4.8 * s, 6.4 * s, JP.pineTop),
    ]
    return [
        feat(square(c, 0.5 * s), 0, 0.6 * s, JP.lanternStone),
        feat(square(c, 0.22 * s), 0.6 * s, 1.6 * s, JP.lanternStone),
        feat(square(c, 0.45 * s), 1.6 * s, 2.3 * s, JP.lantern),
        feat(square(c, 0.62 * s), 2.3 * s, 2.6 * s, '#4a4550'),
    ]
}

/** A torii gate: two vermilion pillars, the nuki tie-beam and a black-capped kasagi lintel. */
export function buildTorii(c: LngLat, axis = 90, s = 1.4): PropFeature[] {
    const pillar = (side: number) => feat(square(offset(c, axis, side * 5.2 * s), 0.55 * s), 0, 11 * s, JP.vermilion)
    return [
        pillar(1), pillar(-1),
        feat(rect(c, axis, 12.4 * s, 0.7 * s), 8.2 * s, 9 * s, JP.vermilion),
        feat(rect(c, axis, 15 * s, 1.1 * s), 10.4 * s, 11.2 * s, JP.vermilion),
        feat(rect(c, axis, 16 * s, 1.3 * s), 11.2 * s, 12 * s, JP.sumi),
    ]
}

// The fountain gets its own arcane landmark instead of a torii
const TORII_SPOTS = ['Gate 1', 'Gate 2']
export const STATIC_PROPS: PropFeature[] = TOUR_SPOTS
    .filter(s => TORII_SPOTS.includes(s.name))
    .flatMap(s => buildTorii({ lng: s.lng, lat: s.lat }))

const BANNER_KANJI = ['呪', '祓', '帳', '結']
export const BANNERS: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: TOUR_SPOTS.flatMap((s, i) => [-1, 1].map(side => {
        const p = offset(s, 0, side * 11)
        return { type: 'Feature', properties: { img: `jp-nobori-${(i + (side > 0 ? 1 : 0)) % BANNER_KANJI.length}` }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } } as GeoJSON.Feature
    })),
}

const SKIP_ROADS = new Set(['path', 'footway', 'pedestrian', 'track', 'rail', 'transit', 'ferry', 'aerialway', 'steps'])
const SPACING_M = 55

/* ───────── Basketball court green ───────── */

function disc(c: LngLat, r: number, n = 28): [number, number][] {
    const ring: [number, number][] = []
    for (let i = 0; i <= n; i++) { const p = offset(c, (360 * i) / n, r); ring.push([p.lng, p.lat]) }
    return ring
}

/** Green court under the basketball-court 360° spot (round play-area discs were removed). */
export const COURT_FIELDS: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: TOUR_SPOTS.filter(s => /court/i.test(s.name)).map(s => ({
        type: 'Feature', properties: { kind: 'court' },
        geometry: { type: 'Polygon', coordinates: [rect({ lng: s.lng, lat: s.lat }, 90, 28, 15)] },
    })),
}

/* ───────── Arcane fountain (wizard landmark) ───────── */

export const FOUNTAIN: LngLat = { lng: 76.577665, lat: 30.769568 }

/**
 * Lawn inside the circular path around the fountain, traced from the real
 * road geometry: for each of 48 directions, the nearest road point 20–90 m
 * out; outliers/gaps smoothed; pulled in 3 m so it sits inside the path.
 */
export function fountainLawnFrom(roads: GeoJSON.Feature[], sectors = 48): GeoJSON.Feature | null {
    const KX = M * Math.cos(FOUNTAIN.lat * Math.PI / 180)
    const best = new Array<number>(sectors).fill(Infinity)
    for (const f of roads) {
        const g = f.geometry
        const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
        for (const l of lines) for (let i = 1; i < l.length; i++) {
            for (let s = 0; s <= 10; s++) {
                const x = (l[i - 1][0] + (l[i][0] - l[i - 1][0]) * s / 10 - FOUNTAIN.lng) * KX
                const y = (l[i - 1][1] + (l[i][1] - l[i - 1][1]) * s / 10 - FOUNTAIN.lat) * M
                const r = Math.hypot(x, y)
                if (r < 20 || r > 90) continue
                const a = Math.floor((((Math.atan2(x, y) * 180) / Math.PI + 360) % 360) / (360 / sectors))
                if (r < best[a]) best[a] = r
            }
        }
    }
    const found = best.filter(Number.isFinite)
    if (found.length < sectors * 0.6) return null // loop not loaded / not there
    const sorted = [...found].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const at = (i: number) => best[(i + sectors) % sectors]
    const radii = best.map((_, i) => {
        // median of a 5-sector window rejects single spurs (e.g. a side path cutting in)
        const win = [-2, -1, 0, 1, 2].map(k => at(i + k)).filter(Number.isFinite).sort((a, b) => a - b)
        const r = win.length ? win[Math.floor(win.length / 2)] : median
        return Math.max(15, Math.min(r, median * 1.35) - 3)
    })
    const ring: [number, number][] = radii.map((r, i) => {
        const p = offset(FOUNTAIN, (i + 0.5) * (360 / sectors), r)
        return [p.lng, p.lat]
    })
    ring.push(ring[0])
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}
const ringPoly = (c: LngLat, rOut: number, rIn: number, n = 40) => [disc(c, rOut, n), disc(c, rIn, n).reverse()]
const poly = (coords: [number, number][][], b: number, h: number, c: string): PropFeature =>
    ({ type: 'Feature', properties: { b, h, c }, geometry: { type: 'Polygon', coordinates: coords } })

/** Basin, rim, inner tier, pillar and upper bowl. */
export const FOUNTAIN_STATIC: PropFeature[] = [
    poly(ringPoly(FOUNTAIN, 10.8, 9.3), 0, 0.35, '#3d3848'),
    poly(ringPoly(FOUNTAIN, 9.3, 8.2), 0, 1.3, '#6b6478'),
    poly(ringPoly(FOUNTAIN, 9.35, 8.15), 1.3, 1.5, JP.gold),
    poly(ringPoly(FOUNTAIN, 3.4, 2.8), 0, 2.4, '#6b6478'),
    poly(ringPoly(FOUNTAIN, 3.45, 2.75), 2.4, 2.55, JP.gold),
    poly([disc(FOUNTAIN, 1.1, 18)], 0, 6, '#57506a'),
    poly([disc(FOUNTAIN, 2.6, 28)], 6, 6.5, JP.gold),
]

/** Glowing water: lower pool, inner pool, upper bowl (colour animated). */
export const FOUNTAIN_WATER: PropFeature[] = [
    poly([disc(FOUNTAIN, 8.2)], 0, 0.9, ''),
    poly([disc(FOUNTAIN, 2.8, 24)], 0, 2.1, ''),
    poly([disc(FOUNTAIN, 2.2, 24)], 6.5, 6.75, ''),
]

/** Floating crystal + six orbiting rune stones at time t (seconds). */
export function fountainDynamic(t: number): GeoJSON.FeatureCollection {
    const bob = Math.sin(t * 1.6) * 0.6
    const spin = (t * 40) % 360
    const feats: PropFeature[] = [
        poly([rect(FOUNTAIN, spin, 1.3, 1.3)], 7.4 + bob, 9.6 + bob, '#7ff9ff'),
        poly([rect(FOUNTAIN, spin + 45, 0.7, 0.7)], 9.6 + bob, 10.6 + bob, '#e6fdff'),
    ]
    const orbit = (t * 22) % 360
    for (let i = 0; i < 6; i++) {
        const a = orbit + i * 60
        const lift = 3 + Math.sin(t * 2 + i) * 0.7
        feats.push(poly([rect(offset(FOUNTAIN, a, 5.6), a, 0.8, 0.8)], lift, lift + 0.9, i % 2 ? '#b388ff' : '#7ff9ff'))
    }
    return { type: 'FeatureCollection', features: feats }
}

/** Ground magic circle: two rings + a rotating hexagram. */
export function fountainSigil(angle: number): GeoJSON.FeatureCollection {
    const line = (coords: [number, number][]): GeoJSON.Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
    const tri = (a0: number) => [0, 1, 2, 0].map(k => { const p = offset(FOUNTAIN, a0 + k * 120, 13.2); return [p.lng, p.lat] as [number, number] })
    return {
        type: 'FeatureCollection',
        features: [line(disc(FOUNTAIN, 13.2, 64)), line(disc(FOUNTAIN, 14.6, 64)), line(disc(FOUNTAIN, 11.4, 48)), line(tri(angle)), line(tri(angle + 60))],
    }
}

const hex = (a: [number, number, number], b: [number, number, number], t: number) =>
    `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`

/** Animates the fountain (crystal bob, orbiting runes, turning sigil, shimmering water). Returns stop(). */
export function startFountain(m: maplibregl.Map, reducedMotion = false) {
    const frame = (t: number) => {
        try {
            ;(m.getSource('jp-fountain-dyn') as maplibregl.GeoJSONSource | undefined)?.setData(fountainDynamic(t))
            ;(m.getSource('jp-fountain-sigil') as maplibregl.GeoJSONSource | undefined)?.setData(fountainSigil((t * 12) % 360))
            const w = (Math.sin(t * 1.3) + 1) / 2
            paint(m, 'jp-fountain-water', 'fill-extrusion-color', hex([47, 211, 255], [124, 77, 255], w))
            paint(m, 'jp-fountain-glow', 'circle-opacity', 0.28 + 0.2 * w)
            paint(m, 'jp-fountain-sigil-glow', 'line-opacity', 0.35 + 0.35 * (1 - w))
        } catch { /* style swapping */ }
    }
    if (reducedMotion) { frame(0); return () => {} }
    let raf = 0
    let last = 0
    const t0 = performance.now()
    const tick = (now: number) => {
        if (!mapAlive(m)) return // map removed: stop the loop
        raf = requestAnimationFrame(tick)
        if (now - last < 50) return // ~20 fps
        last = now
        frame((now - t0) / 1000)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
}

function addFountainLawn(m: maplibregl.Map) {
    const lawn = stores.get(m)?.lawn
    if (!m.getSource('jp-fountain-lawn')) m.addSource('jp-fountain-lawn', { type: 'geojson', data: lawn ?? { type: 'FeatureCollection', features: [] } })
    // Ground level: above base roads/landuse, below buildings and the fountain
    const ground = before(m, ['jp-fields', 'jp-stone', '3d-buildings', 'campus-mask-layer'])
    if (!m.getLayer('jp-fountain-lawn')) {
        m.addLayer({ id: 'jp-fountain-lawn', type: 'fill', source: 'jp-fountain-lawn', paint: { 'fill-color': '#9fd96a', 'fill-opacity': 0.92 } }, ground)
    }
    if (!m.getLayer('jp-fountain-lawn-edge')) {
        m.addLayer({
            id: 'jp-fountain-lawn-edge', type: 'line', source: 'jp-fountain-lawn',
            paint: { 'line-color': '#f2e46b', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 19, 4], 'line-blur': 1.5, 'line-opacity': 0.9 },
        }, ground)
    }
}

function addFountainLayers(m: maplibregl.Map, low: string | undefined) {
    const pt: GeoJSON.Feature = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [FOUNTAIN.lng, FOUNTAIN.lat] } }
    const src = (id: string, data: GeoJSON.GeoJSON) => { if (!m.getSource(id)) m.addSource(id, { type: 'geojson', data }) }
    src('jp-fountain-pt', pt)
    src('jp-fountain-sigil', fountainSigil(0))
    src('jp-fountain', { type: 'FeatureCollection', features: FOUNTAIN_STATIC })
    src('jp-fountain-water-src', { type: 'FeatureCollection', features: FOUNTAIN_WATER })
    src('jp-fountain-dyn', fountainDynamic(0))
    const add = (layer: maplibregl.LayerSpecification) => { if (!m.getLayer(layer.id)) m.addLayer(layer, low) }
    const ext = {
        'fill-extrusion-base': ['get', 'b'] as maplibregl.ExpressionSpecification,
        'fill-extrusion-height': ['get', 'h'] as maplibregl.ExpressionSpecification,
        'fill-extrusion-opacity': 1,
        'fill-extrusion-vertical-gradient': true,
    }
    const byColour = ['get', 'c'] as maplibregl.ExpressionSpecification
    add({
        id: 'jp-fountain-glow', type: 'circle', source: 'jp-fountain-pt', minzoom: 15,
        paint: {
            'circle-color': '#7c4dff', 'circle-opacity': 0.35, 'circle-blur': 0.9, 'circle-pitch-alignment': 'map',
            'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 15, 6, 18, 48, 20, 190],
        },
    })
    add({ id: 'jp-fountain-sigil-glow', type: 'line', source: 'jp-fountain-sigil', minzoom: 15, paint: { 'line-color': '#00f0ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 2, 19, 9], 'line-blur': 4, 'line-opacity': 0.5 } })
    add({ id: 'jp-fountain-sigil', type: 'line', source: 'jp-fountain-sigil', minzoom: 15, paint: { 'line-color': '#c9fbff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.5, 19, 2], 'line-opacity': 0.95 } })
    add({ id: 'jp-fountain', type: 'fill-extrusion', source: 'jp-fountain', minzoom: 15, paint: { 'fill-extrusion-color': byColour, ...ext } })
    add({ id: 'jp-fountain-water', type: 'fill-extrusion', source: 'jp-fountain-water-src', minzoom: 15, paint: { 'fill-extrusion-color': '#2fd3ff', ...ext } })
    add({ id: 'jp-fountain-dyn', type: 'fill-extrusion', source: 'jp-fountain-dyn', minzoom: 15, paint: { 'fill-extrusion-color': byColour, ...ext } })
}

type BuildingPoly = { bb: [number, number, number, number]; ring: [number, number][] }

function toPolys(buildings: GeoJSON.Feature[]): BuildingPoly[] {
    const out: BuildingPoly[] = []
    for (const b of buildings) {
        const g = b.geometry
        const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map(p => p[0]) : []
        for (const r of rings) {
            const ring = r as [number, number][]
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const [x, y] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
            out.push({ bb: [minX, minY, maxX, maxY], ring })
        }
    }
    return out
}

/**
 * Plants sakura / pines on both sides of every road and a stone lantern
 * now and then, skipping anything that would land inside a building or
 * outside campus. `seen` de-duplicates across calls (~6 m grid).
 */
export function sampleRoadside(roads: GeoJSON.Feature[], buildings: GeoJSON.Feature[], seen: Set<string>, limit: number) {
    const polys = toPolys(buildings)
    const inBuilding = (p: LngLat) => polys.some(({ bb, ring }) =>
        p.lng >= bb[0] && p.lng <= bb[2] && p.lat >= bb[1] && p.lat <= bb[3] && pointInPolygon(p.lng, p.lat, ring))
    const feats: PropFeature[] = []
    const lights: GeoJSON.Feature[] = []
    let planted = 0

    let flip = 1
    const plant = (p: LngLat, bearing: number) => {
        // One side only, alternating, so trees accent the road instead of fencing it
        flip = -flip
        for (const side of [flip]) {
            if (planted >= limit) return
            const h = hash01(Math.round(p.lat * 1e5) + side, Math.round(p.lng * 1e5))
            const q = offset(p, bearing + 90 * side, 9 + h * 3)
            // ~25 m de-dup grid keeps parallel roads from stacking trees together
            const key = `${Math.round((q.lat * M) / 25)}:${Math.round((q.lng * M * 0.86) / 25)}`
            // Keep the fountain lawn clear (the path loop is ~45–58 m out)
            if (seen.has(key) || !inCampus(q) || metersBetween(q, FOUNTAIN) < 62) continue
            const kind: TreeKind = h < 0.25 ? 'lantern' : h < 0.65 ? 'sakura' : 'pine'
            const r = kind === 'lantern' ? 1 : 3.5
            if (inBuilding(q) || [0, 90, 180, 270].some(a => inBuilding(offset(q, a, r)))) continue
            seen.add(key)
            planted++
            feats.push(...buildTree(q, kind))
            if (kind === 'lantern') lights.push({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [q.lng, q.lat] } })
        }
    }

    for (const f of roads) {
        if (planted >= limit) break
        const props = f.properties || {}
        if (SKIP_ROADS.has(props.class) || props.brunnel === 'tunnel') continue
        const g = f.geometry
        const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
        for (const line of lines) {
            let acc = SPACING_M / 2
            for (let i = 1; i < line.length; i++) {
                const a = { lng: line[i - 1][0], lat: line[i - 1][1] }
                const b = { lng: line[i][0], lat: line[i][1] }
                const dx = (b.lng - a.lng) * M * Math.cos(a.lat * Math.PI / 180)
                const dy = (b.lat - a.lat) * M
                const len = Math.hypot(dx, dy)
                if (len < 0.5) continue
                const bearing = (Math.atan2(dx, dy) * 180) / Math.PI
                while (acc <= len) {
                    const t = acc / len
                    plant({ lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t }, bearing)
                    acc += SPACING_M
                }
                acc -= len
            }
        }
    }
    return { feats, lights }
}

/* ───────── Map layers ───────── */

type Ctx2D = CanvasRenderingContext2D

function addCanvasImage(m: maplibregl.Map, id: string, w: number, h: number, draw: (ctx: Ctx2D) => void, opts: Record<string, unknown> = {}) {
    if (m.hasImage(id)) return
    const PR = 2
    const cv = document.createElement('canvas')
    cv.width = w * PR
    cv.height = h * PR
    const ctx = cv.getContext('2d')!
    ctx.scale(PR, PR)
    draw(ctx)
    const img = ctx.getImageData(0, 0, cv.width, cv.height)
    m.addImage(id, { width: cv.width, height: cv.height, data: new Uint8Array(img.data.buffer) }, { pixelRatio: PR, ...opts })
}

function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

function ensureImages(m: maplibregl.Map) {
    // Wooden placard, stretchable to fit any place name
    addCanvasImage(m, 'jp-plaque', 96, 56, ctx => {
        ctx.strokeStyle = JP.gold
        ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(22, 15); ctx.lineTo(34, 3); ctx.lineTo(62, 3); ctx.lineTo(74, 15); ctx.stroke()
        const g = ctx.createLinearGradient(0, 14, 0, 50)
        g.addColorStop(0, '#4a2c1c'); g.addColorStop(1, '#23140c')
        roundRect(ctx, 6, 14, 84, 36, 4)
        ctx.fillStyle = g; ctx.fill()
        ctx.strokeStyle = JP.gold; ctx.lineWidth = 2; ctx.stroke()
        roundRect(ctx, 10, 18, 76, 28, 2)
        ctx.strokeStyle = JP.vermilion; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = JP.gold
        for (const [x, y] of [[13, 21], [83, 21], [13, 43], [83, 43]]) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill() }
    }, { stretchX: [[44, 148]], stretchY: [[50, 80]], content: [28, 38, 164, 92] })

    // Nobori banners
    BANNER_KANJI.forEach((k, i) => addCanvasImage(m, `jp-nobori-${i}`, 26, 78, ctx => {
        ctx.fillStyle = JP.sumi; ctx.fillRect(2, 3, 2, 75)
        ctx.fillStyle = JP.gold; ctx.beginPath(); ctx.arc(3, 3, 2.2, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = i % 2 ? '#f3e7cf' : JP.vermilion; ctx.fillRect(6, 6, 18, 62)
        ctx.fillStyle = JP.sumi; ctx.fillRect(6, 6, 18, 7)
        ctx.fillStyle = JP.gold
        for (let x = 6; x < 24; x += 4) { ctx.beginPath(); ctx.moveTo(x, 68); ctx.lineTo(x + 2, 72); ctx.lineTo(x + 4, 68); ctx.fill() }
        ctx.fillStyle = i % 2 ? JP.vermilion : JP.washi
        ctx.beginPath(); ctx.arc(15, 38, 7.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = i % 2 ? JP.washi : JP.sumi
        ctx.font = 'bold 11px "Yu Mincho","MS Mincho","Noto Serif JP",serif'
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(k, 15, 38.5)
    }))

    // Seigaiha wave pattern for water
    addCanvasImage(m, 'jp-seigaiha', 32, 16, ctx => {
        ctx.fillStyle = '#1f4f80'; ctx.fillRect(0, 0, 32, 16)
        const scale = (x: number, y: number) => {
            for (const r of [8, 6, 4, 2]) {
                ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0)
                ctx.fillStyle = r === 8 ? '#1f4f80' : r % 4 === 0 ? '#23588c' : '#1f4f80'
                ctx.fill()
                ctx.strokeStyle = 'rgba(160,205,240,0.55)'; ctx.lineWidth = 0.7; ctx.stroke()
            }
        }
        for (const x of [0, 16, 32]) scale(x, 8)
        for (const x of [-8, 8, 24, 40]) scale(x, 16)
    })
}

const before = (m: maplibregl.Map, ids: string[]) => ids.find(id => m.getLayer(id))

function paint(m: maplibregl.Map, id: string, prop: string, value: unknown) {
    try {
        if (!mapAlive(m) || !m.getLayer(id)) return
        m.setPaintProperty(id, prop, value)
    } catch { /* not valid for this layer / map gone */ }
}

// Building height, mirroring the 3d-buildings layer
const H = ['max', 28, ['coalesce', ['get', 'render_height'], ['*', ['coalesce', ['get', 'building:levels'], 7], 4], 28]]
const zH = (k: number, add = 0) => ['interpolate', ['linear'], ['zoom'], 14, 0, 15, add ? ['+', ['*', k, H], add] : ['*', k, H]]

function templeBuildings(m: maplibregl.Map) {
    const bl = m.getLayer('3d-buildings')
    if (!bl) return
    const src = bl.source
    const sourceLayer = bl.sourceLayer || 'building'
    const filter = m.getFilter('3d-buildings')
    // The existing layer becomes the lacquered wall band (colour animated by the heartbeat)
    paint(m, '3d-buildings', 'fill-extrusion-base', zH(0.2))
    paint(m, '3d-buildings', 'fill-extrusion-height', zH(0.78))
    paint(m, '3d-buildings', 'fill-extrusion-opacity', 1)
    const at = before(m, ['building-outlines', 'campus-mask-layer', 'selected-pulse', 'places-layer'])
    const add = (id: string, b: unknown, h: unknown, color: string) => {
        if (m.getLayer(id)) return
        m.addLayer({
            id, type: 'fill-extrusion', source: src, 'source-layer': sourceLayer, minzoom: 14,
            ...(filter ? { filter } : {}),
            paint: { 'fill-extrusion-color': color, 'fill-extrusion-base': b, 'fill-extrusion-height': h, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true },
        } as maplibregl.LayerSpecification, at)
    }
    add('jp-stone', 0, zH(0.2), JP.stone)
    add('jp-trim', zH(0.78), zH(0.81), JP.gold)
    add('jp-roof', zH(0.81), zH(1, 2.5), JP.roof)
}

function seigaihaWater(m: maplibregl.Map) {
    for (const l of m.getStyle().layers || []) {
        if (l.type !== 'fill') continue
        if (l.id === 'campus-water' || (!l.id.startsWith('campus-') && /water|ocean|river|lake/.test(l.id.toLowerCase()))) {
            paint(m, l.id, 'fill-pattern', 'jp-seigaiha')
            paint(m, l.id, 'fill-opacity', 0.9)
        }
    }
}

export function applyJapanStyle(m: maplibregl.Map) {
    try { ensureImages(m) } catch (e) { console.error('jp images', e) }
    try { templeBuildings(m) } catch (e) { console.error('jp buildings', e) }
    try { seigaihaWater(m) } catch { /* no water layers */ }

    // Planted props survive style reloads (mode switches) via the per-map store
    const props = { type: 'FeatureCollection', features: [...STATIC_PROPS, ...(stores.get(m)?.feats ?? [])] } as GeoJSON.FeatureCollection
    if (!m.getSource('jp-props')) m.addSource('jp-props', { type: 'geojson', data: props })
    if (!m.getSource('jp-lanterns')) m.addSource('jp-lanterns', { type: 'geojson', data: { type: 'FeatureCollection', features: stores.get(m)?.lights ?? [] } })
    if (!m.getSource('jp-banners')) m.addSource('jp-banners', { type: 'geojson', data: BANNERS })

    const low = before(m, ['selected-pulse', 'reclaimed-rings', 'places-layer'])

    // Grass pitches under play/sports areas, drawn beneath buildings
    addFountainLayers(m, low)

    if (!m.getSource('jp-fields')) m.addSource('jp-fields', { type: 'geojson', data: COURT_FIELDS })
    addFountainLawn(m)
    const ground = before(m, ['jp-stone', '3d-buildings', 'campus-mask-layer'])
    if (!m.getLayer('jp-fields')) {
        m.addLayer({
            id: 'jp-fields', type: 'fill', source: 'jp-fields',
            paint: { 'fill-color': ['match', ['get', 'kind'], 'court', '#3f8f5a', '#4a9e58'], 'fill-opacity': 0.9 },
        }, ground)
    }
    if (!m.getLayer('jp-fields-line')) {
        m.addLayer({
            id: 'jp-fields-line', type: 'line', source: 'jp-fields',
            paint: { 'line-color': '#e9f5e1', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.6, 19, 2.4], 'line-opacity': 0.85 },
        }, ground)
    }
    if (!m.getLayer('jp-props')) {
        m.addLayer({
            id: 'jp-props', type: 'fill-extrusion', source: 'jp-props', minzoom: 15,
            paint: {
                'fill-extrusion-color': ['get', 'c'], 'fill-extrusion-base': ['get', 'b'], 'fill-extrusion-height': ['get', 'h'],
                'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true,
            },
        }, low)
    }
    if (!m.getLayer('jp-lantern-glow')) {
        m.addLayer({
            id: 'jp-lantern-glow', type: 'circle', source: 'jp-lanterns', minzoom: 15.5,
            paint: {
                'circle-color': JP.lantern, 'circle-opacity': 0.5, 'circle-blur': 1,
                'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 15.5, 3, 18, 12, 20, 34],
                'circle-pitch-alignment': 'map',
            },
        }, low)
    }
    if (!m.getLayer('jp-banners')) {
        m.addLayer({
            id: 'jp-banners', type: 'symbol', source: 'jp-banners', minzoom: 16,
            layout: {
                'icon-image': ['get', 'img'], 'icon-anchor': 'bottom', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
                'icon-size': ['interpolate', ['linear'], ['zoom'], 16, 0.55, 19, 1.05],
            },
        }, before(m, ['places-layer']))
    }
    if (!m.getLayer('jp-placards') && m.getSource('places-source')) {
        m.addLayer({
            id: 'jp-placards', type: 'symbol', source: 'places-source', minzoom: 16.8,
            filter: ['!=', ['get', 'minor'], true],
            layout: {
                'text-field': ['concat', ['coalesce', ['get', 'kanji'], '所'], '  ', ['upcase', ['get', 'name']]],
                'text-font': ['Noto Sans Bold'],
                'text-size': 11,
                'text-letter-spacing': 0.08,
                'text-anchor': 'bottom',
                'text-offset': ['interpolate', ['linear'], ['zoom'], 16.8, ['literal', [0, -4.3]], 20, ['literal', [0, -6.4]]],
                'icon-image': 'jp-plaque',
                'icon-text-fit': 'both',
                'icon-text-fit-padding': [5, 10, 5, 10],
                'text-max-width': 14,
            },
            paint: { 'text-color': JP.washi, 'text-halo-color': 'rgba(0,0,0,0.4)', 'text-halo-width': 0.6 },
        })
    }
}

/* ───────── Roadside planting (runs as tiles load) ───────── */

type Store = { seen: Set<string>; feats: PropFeature[]; lights: GeoJSON.Feature[]; lawn?: GeoJSON.Feature }
const stores = new WeakMap<maplibregl.Map, Store>()
const MAX_PLANTS = 600

function plantVisible(m: maplibregl.Map) {
    const bl = m.getLayer('3d-buildings')
    if (!bl || !m.getSource('jp-props') || m.getZoom() < 14.5) return
    let s = stores.get(m)
    if (!s) { s = { seen: new Set(), feats: [], lights: [] }; stores.set(m, s) }
    let roads: GeoJSON.Feature[], blds: GeoJSON.Feature[]
    try {
        roads = m.querySourceFeatures(bl.source, { sourceLayer: 'transportation' }) as unknown as GeoJSON.Feature[]
        blds = m.querySourceFeatures(bl.source, { sourceLayer: bl.sourceLayer || 'building' }) as unknown as GeoJSON.Feature[]
    } catch { return }
    // Trace the fountain lawn once its loop of paths has loaded
    if (!s.lawn) {
        const lawn = fountainLawnFrom(roads)
        if (lawn) {
            s.lawn = lawn
            ;(m.getSource('jp-fountain-lawn') as maplibregl.GeoJSONSource | undefined)?.setData(lawn)
        }
    }
    const room = MAX_PLANTS - s.seen.size
    if (room <= 0) return
    const { feats, lights } = sampleRoadside(roads, blds, s.seen, room)
    if (!feats.length) return
    s.feats.push(...feats)
    s.lights.push(...lights)
    ;(m.getSource('jp-props') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [...STATIC_PROPS, ...s.feats] })
    ;(m.getSource('jp-lanterns') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: s.lights })
}

/** Keeps planting trees as the user explores. Returns stop(). */
export function startJapanProps(m: maplibregl.Map) {
    let last = ''
    let timer = 0
    const run = () => {
        if (!mapAlive(m)) return
        const c = m.getCenter()
        const k = `${c.lng.toFixed(4)},${c.lat.toFixed(4)},${m.getZoom().toFixed(1)}`
        if (k === last) return
        last = k
        window.clearTimeout(timer)
        timer = window.setTimeout(() => { if (!mapAlive(m)) return; try { plantVisible(m) } catch (e) { console.error('jp planting', e) } }, 250)
    }
    m.on('idle', run)
    run()
    return () => { m.off('idle', run); window.clearTimeout(timer) }
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import {
    CU_CENTER, GATE_2_COORDS, CU_CAMPUS_BOUNDARY, OUTER_BOUNDS, CU_MAX_BOUNDS,
    isWithinCU, calculateBearing, metersBetween,
} from '@/lib/map/campusGeo'
import { applyCursedStyle, ensureRouteLayers, startRouteFlow, startCursedPulse, mapAlive } from '@/lib/map/cursedStyle'
import { kanjiFor, startJapanProps, startFountain } from '@/lib/map/japanStyle'

// Drifting sakura petals over the Cursed view (deterministic, no hydration churn)
const PETALS = Array.from({ length: 18 }, (_, i) => {
    const r = (n: number) => { const s = Math.sin(i * 91.7 + n * 13.3) * 43758.5453; return s - Math.floor(s) }
    return { x: r(1) * 100, delay: -r(2) * 14, dur: 9 + r(3) * 8, sway: 30 + r(4) * 60, size: 7 + r(5) * 7 }
})


const FORCED_BUILDING_HEIGHT = 28

// Radius around the view centre where minor pins and name placards show
const NEAR_RADIUS_M = 200
function nearbyRing(lng: number, lat: number, r: number): [number, number][] {
    const dLat = r / 111320, dLng = r / (111320 * Math.cos(lat * Math.PI / 180))
    const ring: [number, number][] = []
    for (let i = 0; i <= 32; i++) {
        const a = (i / 32) * Math.PI * 2
        ring.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat])
    }
    return ring
}

// ── Pin tiers ──
// Core campus places (blocks, libraries, gates, grounds, admin-named spots)
// are always shown. Everyday spots and anything scraped from Google/Mappls
// are "minor": they only appear when zoomed in (≥17.4).
const MINOR_CATEGORIES = new Set(['food', 'shop', 'atm & bank', 'medical'])
// Lower rank wins when minor pins collide
const MINOR_RANK: Record<string, number> = { food: 0, library: 1, 'atm & bank': 2, medical: 2, shop: 3, parking: 4, hostel: 4, building: 6 }
function isMinorPlace(p: { category?: { categoryName?: string } | null; description?: string | null }) {
    const cat = p.category?.categoryName?.toLowerCase() || ''
    const imported = /^(Data © Google|Imported from Mappls)/.test(p.description || '')
    return MINOR_CATEGORIES.has(cat) || (imported && cat !== 'library' && cat !== 'gate')
}

// ── View modes ──
export type MapMode = 'cursed' | 'normal' | 'satellite'
const MODE_KEY = 'veil-map-mode'
const MODES: { id: MapMode; icon: string; title: string; bg: string; glow: string }[] = [
    { id: 'cursed', icon: '呪', title: 'Cursed view — THE VEIL', bg: 'linear-gradient(135deg,#7a0f2e,#ff1f4b)', glow: '0 0 14px rgba(255,31,75,0.7)' },
    { id: 'normal', icon: '🗺️', title: 'Normal view — accurate map', bg: 'linear-gradient(135deg,#2563ff,#00d5ff)', glow: '0 0 14px rgba(0,213,255,0.6)' },
    { id: 'satellite', icon: '🛰️', title: 'Satellite view — real imagery', bg: 'linear-gradient(135deg,#14532d,#22c55e)', glow: '0 0 14px rgba(34,197,94,0.6)' },
]
function readMode(): MapMode {
    if (typeof window === 'undefined') return 'cursed'
    try {
        const v = localStorage.getItem(MODE_KEY)
        return v === 'normal' || v === 'satellite' ? v : 'cursed'
    } catch { return 'cursed' }
}
const SATELLITE_STYLE = {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: { 'esri-satellite': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Tiles © Esri' } },
    layers: [{ id: 'esri-satellite', type: 'raster', source: 'esri-satellite' }],
} as maplibregl.StyleSpecification
const styleFor = (mode: MapMode) => mode === 'satellite' ? SATELLITE_STYLE : 'https://tiles.openfreemap.org/styles/liberty'

const CATEGORY_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
    '#a855f7', '#eab308', '#22c55e', '#3b82f6', '#fb923c',
]

export interface Place {
    id: string
    name: string
    description?: string
    latitude?: number
    longitude?: number
    category?: {
        id: string
        categoryName: string
        icon?: string
    }
    block?: {
        id: string
        name: string
    }
    mainPhoto?: string
    photos?: { photoUrl: string }[]
    reviews?: { id: string; rating: number; comment: string; createdAt: string; user: { name: string, id: string } }[]
    approvalStatus: string
}

export interface Category {
    id: string
    categoryName: string
    icon?: string
    placeCount?: number
}

interface Props {
    places?: Place[]
    categories?: Category[]
    selectedCategoryIds?: string[]
    searchQuery?: string
    pinDropMode?: boolean
    flyToPlace?: Place | null
    navigateToPlace?: Place | null
    pinnedCoords?: { lat: number; lng: number } | null
    selectedPlace?: Place | null
    onMapClick?: (lat: number, lng: number) => void
    onPlaceClick?: (place: Place) => void
    onCancelNavigation?: () => void
    onCancelAdd?: () => void
    /** Fired after the camera settles (pan/zoom/fly). Used for 360° proximity reveal. */
    onViewChange?: (view: { lat: number; lng: number; zoom: number }) => void
    /** Fired every time custom layers are (re)built — initial load and after the satellite toggle. */
    onMapReady?: (map: maplibregl.Map) => void
    /** Place ids the user has reclaimed — drawn with a red 呪 seal. */
    reclaimedIds?: string[]
    /** Route start override (floating guide / demo). Falls back to GPS, then map centre. */
    navOrigin?: { lat: number; lng: number } | null
    /** Fired once a navigation route has been computed. */
    onRouteReady?: (coords: [number, number][], place: Place) => void
    /** Fired when the user reaches the navigation target (GPS, guide or simulated). */
    onArrive?: (place: Place) => void
    /** Floating guide state (button lives in the map controls). */
    guideActive?: boolean
    onToggleGuide?: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw a pin into the map's image registry using Canvas.
//
// WHY CANVAS INSTEAD OF HTML MARKERS?
// HTML markers are positioned as CSS overlays on top of the WebGL canvas.
// MapLibre projects their lat/lng → screen pixel using a 2D Mercator formula,
// which does NOT account for the 3D perspective offset introduced by the
// pitch angle. With pitch=55° and 28 m tall buildings, a building's visual
// face can be ~30-50 screen pixels higher than its ground coordinate, so
// HTML markers appear to "drift" relative to buildings when you drag.
//
// Symbol layers (type:'symbol') are rendered INSIDE the WebGL pipeline, so
// they share the exact same 3D view matrix as the building extrusions.
// They will NEVER drift, regardless of pitch, zoom, bearing, or drag.
// ─────────────────────────────────────────────────────────────────────────────
const REGISTERED_IMAGES = new Set<string>()
function ensurePinImage(
    m: maplibregl.Map,
    imageId: string,
    color: string,
    emoji: string,
    selected = false,
    sealed = false,
) {
    if (m.hasImage(imageId)) return

    // Talisman pin: canvas (0,0,48,64) at 2× pixel ratio (extra room for the glow)
    const W = 48, H = 64, PR = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * PR
    canvas.height = H * PR
    const ctx = canvas.getContext('2d')!
    ctx.scale(PR, PR)
    const cx = 24, cy = 22, r = 17
    const ring = sealed ? '#ff1f4b' : color

    // ── Neon glow halo ──
    ctx.save()
    ctx.shadowColor = ring
    ctx.shadowBlur = selected ? 16 : 10
    // Tail: a talisman strip hanging below the seal
    ctx.beginPath()
    ctx.moveTo(cx - 6, cy + 12)
    ctx.lineTo(cx + 6, cy + 12)
    ctx.lineTo(cx + 3, H - 2)
    ctx.lineTo(cx, H - 6)
    ctx.lineTo(cx - 3, H - 2)
    ctx.closePath()
    ctx.fillStyle = '#0b0716'
    ctx.fill()
    ctx.strokeStyle = ring
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Seal body
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = '#0b0716'
    ctx.fill()
    ctx.strokeStyle = ring
    ctx.lineWidth = selected ? 3.5 : 2.5
    ctx.stroke()
    ctx.restore()

    // ── Inner ritual ring ──
    ctx.beginPath()
    ctx.setLineDash([2, 2])
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2)
    ctx.strokeStyle = sealed ? 'rgba(255,31,75,0.7)' : 'rgba(255,255,255,0.28)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.setLineDash([])

    // ── Ink marks on the strip ──
    ctx.fillStyle = ring
    ctx.fillRect(cx - 1, cy + 17, 2, 4)
    ctx.fillRect(cx - 1, cy + 24, 2, 3)

    // ── Icon: category emoji, or the red 呪 seal once reclaimed ──
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (sealed) {
        ctx.font = 'bold 18px "Yu Mincho","MS Mincho","Noto Serif JP",serif'
        ctx.fillStyle = '#ff1f4b'
        ctx.shadowColor = '#ff1f4b'
        ctx.shadowBlur = 6
        ctx.fillText('呪', cx, cy + 1)
        ctx.shadowBlur = 0
    } else {
        ctx.font = `15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
        ctx.fillText(emoji, cx, cy + 1)
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    m.addImage(
        imageId,
        { width: canvas.width, height: canvas.height, data: new Uint8Array(imgData.data.buffer) },
        { pixelRatio: PR },
    )
    REGISTERED_IMAGES.add(imageId)
}

export default function MapLibreCampusMap({
    places = [],
    categories = [],
    selectedCategoryIds = [],
    searchQuery = '',
    pinDropMode = false,
    flyToPlace,
    navigateToPlace,
    pinnedCoords,
    selectedPlace,
    onMapClick,
    onPlaceClick,
    onCancelNavigation,
    onCancelAdd,
    onViewChange,
    onMapReady,
    reclaimedIds = [],
    navOrigin = null,
    onRouteReady,
    onArrive,
    guideActive = false,
    onToggleGuide,
}: Props) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const onViewChangeRef = useRef(onViewChange)
    const onMapReadyRef = useRef(onMapReady)
    const onRouteReadyRef = useRef(onRouteReady)
    const onArriveRef = useRef(onArrive)
    const navOriginRef = useRef(navOrigin)
    const navTargetRef = useRef<Place | null>(null)
    const arrivedRef = useRef(false)
    useEffect(() => {
        onViewChangeRef.current = onViewChange
        onMapReadyRef.current = onMapReady
        onRouteReadyRef.current = onRouteReady
        onArriveRef.current = onArrive
        navOriginRef.current = navOrigin
    }, [onViewChange, onMapReady, onRouteReady, onArrive, navOrigin])

    const fireArrive = useCallback(() => {
        const target = navTargetRef.current
        if (!target || arrivedRef.current) return
        arrivedRef.current = true
        onArriveRef.current?.(target)
    }, [])

    // Refs for values used inside MapLibre event handlers
    // (avoids stale closures without re-adding listeners constantly)
    const placesRef = useRef<Place[]>(places)
    const onPlaceClickRef = useRef<((p: Place) => void) | undefined>(onPlaceClick)
    placesRef.current = places
    onPlaceClickRef.current = onPlaceClick

    const pinnedMarkerRef = useRef<maplibregl.Marker | null>(null)
    const lineAnimRef = useRef<number | null>(null)
    const geolocateControlRef = useRef<maplibregl.GeolocateControl | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [mapMode, setMapMode] = useState<MapMode>(readMode)
    const modeRef = useRef<MapMode>(mapMode)
    const layersAdded = useRef(false)
    const userLocation = useRef<{ lat: number; lng: number } | null>(null)
    const [navStatus, setNavStatus] = useState<'idle' | 'locating' | 'routing' | 'walking' | 'error'>('idle')
    const [navStats, setNavStats] = useState<{ dist: number, time: number } | null>(null)
    const cachedRouteRef = useRef<{ coords: [number, number][], dist: number, time: number } | null>(null)

    // ── Draggable Status Bar State ──
    const [barPos, setBarPos] = useState({ top: 80, left: 16 })
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setBarPos({
                top: 80,
                left: window.innerWidth > 768 ? window.innerWidth - 340 : 16
            })
        }
    }, [])
    const isDraggingBar = useRef(false)
    const dragOffset = useRef({ x: 0, y: 0 })

    const handleBarMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDraggingBar.current = true
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        dragOffset.current = {
            x: clientX - barPos.left,
            y: clientY - barPos.top
        }
    }

    const handleGlobalMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDraggingBar.current) return
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
        
        setBarPos({
            top: Math.max(16, Math.min(window.innerHeight - 100, clientY - dragOffset.current.y)),
            left: Math.max(16, Math.min(window.innerWidth - 300, clientX - dragOffset.current.x))
        })
    }, [barPos])

    const handleGlobalMouseUp = useCallback(() => {
        isDraggingBar.current = false
    }, [])

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove)
        window.addEventListener('mouseup', handleGlobalMouseUp)
        window.addEventListener('touchmove', handleGlobalMouseMove)
        window.addEventListener('touchend', handleGlobalMouseUp)
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove)
            window.removeEventListener('mouseup', handleGlobalMouseUp)
            window.removeEventListener('touchmove', handleGlobalMouseMove)
            window.removeEventListener('touchend', handleGlobalMouseUp)
        }
    }, [handleGlobalMouseMove, handleGlobalMouseUp])

    const categoryColorMap = useRef<Map<string, string>>(new Map())
    const getCategoryColor = useCallback((catId: string) => {
        if (!categoryColorMap.current.has(catId)) {
            const idx = categoryColorMap.current.size % CATEGORY_COLORS.length
            categoryColorMap.current.set(catId, CATEGORY_COLORS[idx])
        }
        return categoryColorMap.current.get(catId)!
    }, [])

    // ── Setup map layers ────────────────────────────────────────────────────
    // satellite param passed explicitly so this function is stable (no closure over isSatellite)
    const setupCustomLayers = useCallback((m: maplibregl.Map, satellite: boolean) => {
        if (layersAdded.current) return
        layersAdded.current = true

        m.setMaxBounds(CU_MAX_BOUNDS)

        const style = m.getStyle()
        const sources = style.sources || {}
        const layers = style.layers || []

        let vectorSource = 'openmaptiles'
        for (const name of Object.keys(sources)) {
            if (name.includes('openmaptiles') || name.includes('maptiler') || name === 'composite') {
                vectorSource = name; break
            }
        }
        if (!sources[vectorSource]) {
            try {
                m.addSource('openmaptiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
                vectorSource = 'openmaptiles'
            } catch (e) { }
        }

        for (const layer of layers) {
            if (layer.id.includes('building') && layer.type === 'fill') {
                try { m.removeLayer(layer.id) } catch (e) { }
            }
        }

        // ── Roads / Parks / Water (street mode only) ──
        if (!satellite) {
            try {
                if (!m.getLayer('campus-roads-border')) {
                    m.addLayer({ id: 'campus-roads-border', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#94a3b8', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1.5, 14, 4, 16, 10, 18, 20, 20, 36], 'line-opacity': 0.7 } })
                    m.addLayer({ id: 'campus-roads-fill', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#e2e8f0', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 14, 3, 16, 8, 18, 16, 20, 30], 'line-opacity': 1 } })
                    m.addLayer({ id: 'campus-paths', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 14, filter: ['any', ['==', ['get', 'class'], 'path'], ['==', ['get', 'class'], 'footway'], ['==', ['get', 'class'], 'pedestrian']], paint: { 'line-color': '#cbd5e1', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 18, 3], 'line-dasharray': [2, 2], 'line-opacity': 0.8 } })
                }
            } catch (e) { }
            try { if (!m.getLayer('campus-parks')) m.addLayer({ id: 'campus-parks', source: vectorSource, 'source-layer': 'landuse', type: 'fill', filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'garden', 'meadow', 'recreation_ground', 'pitch', 'playground', 'stadium', 'track', 'sports_centre', 'village_green']]], paint: { 'fill-color': '#4ade80', 'fill-opacity': 0.25 } }) } catch (e) { }
            try { if (!m.getLayer('campus-water')) m.addLayer({ id: 'campus-water', source: vectorSource, 'source-layer': 'water', type: 'fill', paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.4 } }) } catch (e) { }
        }

        // ── 3D Buildings ──
        try {
            if (!m.getLayer('3d-buildings')) {
                m.addLayer({
                    id: '3d-buildings', source: vectorSource, 'source-layer': 'building',
                    type: 'fill-extrusion', minzoom: 14,
                    paint: {
                        'fill-extrusion-color': ['case', ['has', 'colour'], ['get', 'colour'], ['==', ['get', 'building'], 'university'], '#3b82f6', ['==', ['get', 'building'], 'college'], '#8b5cf6', ['==', ['get', 'building'], 'school'], '#22c55e', ['==', ['get', 'building'], 'hospital'], '#ef4444', ['==', ['get', 'building'], 'hotel'], '#f59e0b', ['==', ['get', 'building'], 'commercial'], '#06b6d4', ['==', ['get', 'building'], 'retail'], '#f97316', ['==', ['get', 'building'], 'residential'], '#64748b', '#6366f1'],
                        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['max', FORCED_BUILDING_HEIGHT, ['coalesce', ['get', 'render_height'], ['*', ['coalesce', ['get', 'building:levels'], 7], 4], ['get', 'height'], FORCED_BUILDING_HEIGHT]]],
                        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                        'fill-extrusion-opacity': satellite ? 0.75 : 0.9,
                    }
                })
            }
        } catch (e) { console.error('3D buildings error:', e) }
        try { if (!m.getLayer('building-outlines')) m.addLayer({ id: 'building-outlines', source: vectorSource, 'source-layer': 'building', type: 'line', minzoom: 15, paint: { 'line-color': '#a5b4fc', 'line-width': 1, 'line-opacity': 0.5 } }) } catch (e) { }

        // ── Campus MASK (to 'delete' external area completely) ──
        if (!m.getSource('campus-mask')) {
            m.addSource('campus-mask', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [OUTER_BOUNDS, CU_CAMPUS_BOUNDARY] } }
            })
        }
        if (!m.getLayer('campus-mask-layer')) {
            m.addLayer({ id: 'campus-mask-layer', type: 'fill', source: 'campus-mask', paint: { 'fill-color': '#0a0713', 'fill-opacity': 1 } })
        }

        // ── Campus boundary glow/line — cursed-purple accent (Cursed_Theme token values) ──
        if (!m.getSource('campus-boundary')) {
            m.addSource('campus-boundary', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: CU_CAMPUS_BOUNDARY } }
            })
        }
        if (!m.getLayer('campus-boundary-glow')) {
            m.addLayer({ id: 'campus-boundary-glow', type: 'line', source: 'campus-boundary', paint: { 'line-color': '#8b5cf6', 'line-width': 8, 'line-opacity': 0.4, 'line-blur': 4 } })
            m.addLayer({ id: 'campus-boundary-line', type: 'line', source: 'campus-boundary', paint: { 'line-color': '#a78bfa', 'line-width': 2.5, 'line-opacity': 0.95 } })
        }

        // ── Pulse ring under the selected pin ──
        if (!m.getSource('selected-pulse')) {
            m.addSource('selected-pulse', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }
        if (!m.getLayer('selected-pulse')) {
            m.addLayer({
                id: 'selected-pulse', type: 'circle', source: 'selected-pulse',
                paint: {
                    'circle-radius': 12, 'circle-color': '#00f0ff', 'circle-opacity': 0.2,
                    'circle-stroke-color': '#00f0ff', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.9,
                    'circle-pitch-alignment': 'map',
                },
            })
        }

        // ── GeoJSON source + Symbol layer for place pins ──
        if (!m.getSource('places-source')) {
            m.addSource('places-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
        }
        // Purified ground ring under every reclaimed place
        if (!m.getLayer('reclaimed-rings')) {
            m.addLayer({
                id: 'reclaimed-rings', type: 'circle', source: 'places-source',
                filter: ['==', ['get', 'sealed'], true],
                paint: {
                    'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 15, 8, 18, 40, 20, 150],
                    'circle-color': '#5ff5ff', 'circle-opacity': 0.12, 'circle-blur': 0.4,
                    'circle-stroke-color': '#5ff5ff', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.8,
                    'circle-pitch-alignment': 'map',
                },
            })
        }
        // Minor spots (scraped cafes, shops, ATMs, PGs) only appear when zoomed
        // in, and hide each other on collision so the map never clutters.
        if (!m.getLayer('places-minor')) {
            m.addLayer({
                id: 'places-minor', type: 'symbol', source: 'places-source', minzoom: 17.4,
                filter: ['==', ['get', 'minor'], true],
                layout: {
                    'icon-image': ['get', 'iconId'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': false,
                    'icon-padding': 2,
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 17.4, 0.45, 19, 0.65, 20, 0.8],
                    'symbol-sort-key': ['get', 'rank'],
                    'text-field': ['step', ['zoom'], '', 18.6, ['get', 'name']],
                    'text-size': 10.5,
                    'text-font': ['Noto Sans Regular'],
                    'text-anchor': 'top',
                    'text-offset': [0, 0.3],
                    'text-max-width': 8,
                    'text-optional': true,
                },
                paint: {
                    'text-color': '#f5f3ff', 'text-halo-color': '#1e1033', 'text-halo-width': 1.4,
                    'icon-opacity': ['interpolate', ['linear'], ['zoom'], 17.4, 0, 17.8, 1],
                    'text-opacity': ['interpolate', ['linear'], ['zoom'], 18.6, 0, 18.9, 1],
                },
            })
        }
        if (!m.getLayer('places-layer')) {
            m.addLayer({
                id: 'places-layer', type: 'symbol', source: 'places-source',
                filter: ['!=', ['get', 'minor'], true],
                layout: {
                    'icon-image': ['get', 'iconId'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.5, 17, 0.75, 20, 1.0],
                    'icon-padding': 0,
                },
            })
        }

        for (const layerId of ['places-layer', 'places-minor']) {
            m.on('click', layerId, (e) => {
                if (!e.features?.length) return
                const id = e.features[0].properties?.id
                const place = placesRef.current.find(p => p.id === id)
                if (!place) return
                onPlaceClickRef.current?.(place)
                m.flyTo({ center: [place.longitude!, place.latitude!], zoom: Math.max(m.getZoom(), 17.6), duration: 800, essential: true })
            })
            m.on('mouseenter', layerId, () => { m.getCanvas().style.cursor = 'pointer' })
            m.on('mouseleave', layerId, () => { if (!pinDropMode) m.getCanvas().style.cursor = '' })
        }

        if (modeRef.current === 'cursed') applyCursedStyle(m, satellite)
        setMapLoaded(true)
        onMapReadyRef.current?.(m)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: styleFor(modeRef.current),
            center: CU_CENTER,
            zoom: 16,
            minZoom: 15.2,
            maxZoom: 20,
            pitch: 55,
            bearing: 180,
            maxPitch: 85,
            dragRotate: true,
            attributionControl: false,
            maxBounds: [
                [76.5670, 30.7620],
                [76.5840, 30.7775]
            ],
        })
        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'bottom-right')

        const gc = new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 },
            trackUserLocation: true,
            showAccuracyCircle: true,
            showUserLocation: true
        })
        geolocateControlRef.current = gc
        map.current.addControl(gc, 'bottom-right')

        gc.on('geolocate', (e: any) => {
            let lat = e.coords.latitude;
            let lng = e.coords.longitude;
            if (!isWithinCU(lat, lng)) {
                lat = GATE_2_COORDS.lat;
                lng = GATE_2_COORDS.lng;
            }
            userLocation.current = { lat, lng }
            window.dispatchEvent(new CustomEvent('userLocationUpdate'))
            // Real-world arrival: within 20 m of the navigation target
            const t = navTargetRef.current
            if (t?.latitude && t?.longitude && metersBetween({ lat, lng }, { lat: t.latitude, lng: t.longitude }) < 20) fireArrive()
        })
        // Only label/show nearby spots: limit minor pins + placards to ~200 m
        // around the view centre, refreshed at most once per frame while moving.
        let nearRaf = 0
        const refreshNear = () => {
            nearRaf = 0
            const m = map.current
            if (!m) return
            const c = m.getCenter()
            const ring = nearbyRing(c.lng, c.lat, NEAR_RADIUS_M)
            const within = ['within', { type: 'Polygon', coordinates: [ring] }] as unknown as maplibregl.ExpressionSpecification
            try {
                if (m.getLayer('places-minor')) m.setFilter('places-minor', ['all', ['==', ['get', 'minor'], true], within] as maplibregl.FilterSpecification)
                if (m.getLayer('jp-placards')) m.setFilter('jp-placards', ['all', ['!=', ['get', 'minor'], true], within] as maplibregl.FilterSpecification)
            } catch { /* style swapping */ }
        }
        map.current.on('move', () => { if (!nearRaf) nearRaf = requestAnimationFrame(refreshNear) })
        map.current.on('idle', () => { if (!nearRaf) nearRaf = requestAnimationFrame(refreshNear) })
        map.current.on('moveend', () => {
            if (!map.current) return
            const c = map.current.getCenter()
            onViewChangeRef.current?.({ lat: c.lat, lng: c.lng, zoom: map.current.getZoom() })
        })
        map.current.on('styleimagemissing', (e) => {
            const data = new Uint8Array(4)
            map.current?.addImage(e.id, { width: 1, height: 1, data })
        })
        map.current.on('load', () => {
            if (!map.current) return
            // Lock minZoom to current zoom so user can't zoom out further
            const loadedZoom = map.current.getZoom()
            map.current.setMinZoom(loadedZoom)
            setupCustomLayers(map.current, modeRef.current === 'satellite')
        })
        return () => { if (map.current) { map.current.remove(); map.current = null } }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // View mode switch: Cursed / Normal / Satellite (full style reload each time)
    const switchMode = useCallback((next: MapMode) => {
        if (!map.current || next === modeRef.current) return
        modeRef.current = next
        setMapMode(next)
        try { localStorage.setItem(MODE_KEY, next) } catch { /* private mode */ }
        layersAdded.current = false
        setMapLoaded(false)
        REGISTERED_IMAGES.clear()
        const currentMinZoom = map.current.getMinZoom()
        map.current.setStyle(styleFor(next), { diff: false })
        const afterStyle = () => {
            if (!map.current) return
            map.current.setMinZoom(currentMinZoom)
            setupCustomLayers(map.current, next === 'satellite')
            // Re-draw route if we have cached data
            if (cachedRouteRef.current && map.current) {
                const { coords } = cachedRouteRef.current
                ensureRouteLayers(map.current);
                (map.current.getSource('route-main') as maplibregl.GeoJSONSource).setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice(1, -1) }, properties: {} });
                (map.current.getSource('route-walk') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [
                    { type: 'Feature', geometry: { type: 'LineString', coordinates: [coords[0], coords[1]] }, properties: {} },
                    { type: 'Feature', geometry: { type: 'LineString', coordinates: [coords[coords.length-2], coords[coords.length-1]] }, properties: {} }
                ]});
            }
        }
        map.current.once('styledata', () => {
            if (map.current?.isStyleLoaded()) afterStyle()
            else map.current?.once('idle', afterStyle)
        })
    }, [setupCustomLayers])

    // Map click for pin-drop mode
    useEffect(() => {
        if (!map.current) return
        const handleClick = (e: maplibregl.MapMouseEvent) => {
            if (pinDropMode && onMapClick) onMapClick(e.lngLat.lat, e.lngLat.lng)
        }
        map.current.on('click', handleClick)
        return () => { map.current?.off('click', handleClick) }
    }, [pinDropMode, onMapClick])

    // Cursor for pin-drop
    useEffect(() => {
        if (!map.current) return
        map.current.getCanvas().style.cursor = pinDropMode ? 'crosshair' : ''
    }, [pinDropMode])

    // ── Update places symbol layer ─────────────────────────────────────────
    // Runs whenever places / filter / selected changes.
    // Draws canvas pin images into the map registry, then updates the
    // GeoJSON FeatureCollection — no HTML DOM manipulation involved.
    useEffect(() => {
        if (!map.current || !mapLoaded) return
        const m = map.current
        if (!m.getSource('places-source')) return

        const visible = places.filter(p => {
            if (!p.latitude || !p.longitude) return false
            if (selectedCategoryIds.length > 0 && p.category) return selectedCategoryIds.includes(p.category.id)
            return true
        })

        // Register canvas images for each unique category (normal + selected variant)
        for (const place of visible) {
            const color = place.category ? getCategoryColor(place.category.id) : '#6366f1'
            const emoji = place.category?.icon || '📍'
            const catKey = place.category?.id || 'default'
            ensurePinImage(m, `pin-${catKey}`, color, emoji, false)
            ensurePinImage(m, `pin-${catKey}-sel`, color, emoji, true)
            ensurePinImage(m, `pin-${catKey}-seal`, color, emoji, false, true)
            ensurePinImage(m, `pin-${catKey}-sel-seal`, color, emoji, true, true)
        }

        const sealedSet = new Set(reclaimedIds)
        const filtering = selectedCategoryIds.length > 0
        // Several scraped spots share one Google pin; fan them out in a small
        // ring (~6 m) so each stays tappable instead of stacking.
        const stackCount = new Map<string, number>()
        const stackSeen = new Map<string, number>()
        for (const p of visible) { const k = `${p.latitude!.toFixed(5)},${p.longitude!.toFixed(5)}`; stackCount.set(k, (stackCount.get(k) || 0) + 1) }
        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: visible.map(p => {
                const k = `${p.latitude!.toFixed(5)},${p.longitude!.toFixed(5)}`
                const n = stackCount.get(k) || 1, i = stackSeen.get(k) || 0
                stackSeen.set(k, i + 1)
                const a = (i / n) * Math.PI * 2, r = n > 1 ? 0.000055 : 0
                const lng = p.longitude! + Math.cos(a) * r / Math.cos(p.latitude! * Math.PI / 180), lat = p.latitude! + Math.sin(a) * r
                const minor = !filtering && p.id !== selectedPlace?.id && isMinorPlace(p)
                return {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [lng, lat] },
                properties: {
                    id: p.id,
                    name: p.name,
                    minor,
                    rank: MINOR_RANK[p.category?.categoryName?.toLowerCase() || ''] ?? 5,
                    iconId: `pin-${p.category?.id || 'default'}${p.id === selectedPlace?.id ? '-sel' : ''}${sealedSet.has(p.id) ? '-seal' : ''}`,
                    sealed: sealedSet.has(p.id),
                    kanji: kanjiFor(p.category?.categoryName),
                },
            }}),
        }
            ; (m.getSource('places-source') as maplibregl.GeoJSONSource).setData(geojson)
    }, [places, selectedCategoryIds, mapLoaded, selectedPlace, getCategoryColor, reclaimedIds])

    // Fly to selected place
    useEffect(() => {
        if (!map.current || !flyToPlace?.latitude || !flyToPlace?.longitude) return
        map.current.flyTo({ center: [flyToPlace.longitude, flyToPlace.latitude], zoom: 18, pitch: 60, duration: 1200, essential: true })
    }, [flyToPlace])

    // Pin-drop temporary marker (stays as HTML — it's ephemeral, one at a time)
    useEffect(() => {
        if (!map.current || !mapLoaded) return
        if (pinnedCoords) {
            const makeEl = () => {
                const wrap = document.createElement('div')
                wrap.style.cssText = 'pointer-events:none;'
                const inner = document.createElement('div')
                inner.style.cssText = 'transform-origin:center bottom;animation:pinBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1);'
                inner.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="44" height="57">
                  <path d="M9,29 Q13,42 20,52 Q27,42 31,29 Z" fill="#6366f1"/>
                  <circle cx="20" cy="18" r="17" fill="#6366f1" stroke="white" stroke-width="3"/>
                  <circle cx="20" cy="18" r="11" fill="rgba(255,255,255,0.25)"/>
                  <circle cx="20" cy="18" r="17" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5"/>
                  <text x="20" y="23" text-anchor="middle" font-size="14" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">📍</text>
                </svg>`
                wrap.appendChild(inner)
                return wrap
            }
            if (!pinnedMarkerRef.current) {
                pinnedMarkerRef.current = new maplibregl.Marker({ element: makeEl(), anchor: 'bottom' })
                    .setLngLat([pinnedCoords.lng, pinnedCoords.lat])
                    .addTo(map.current!)
            } else {
                pinnedMarkerRef.current.setLngLat([pinnedCoords.lng, pinnedCoords.lat])
            }
        } else {
            pinnedMarkerRef.current?.remove()
            pinnedMarkerRef.current = null
        }
    }, [pinnedCoords, mapLoaded])

    // Search fly-to
    useEffect(() => {
        if (!map.current || !searchQuery) return
        const q = searchQuery.toLowerCase()
        const match = places.find(p => p.name.toLowerCase().includes(q) || p.category?.categoryName.toLowerCase().includes(q))
        if (match?.latitude && match?.longitude) map.current.flyTo({ center: [match.longitude, match.latitude], zoom: 18, pitch: 60, duration: 1200 })
    }, [searchQuery, places])

    // First-person walking was replaced by the floating guide (src/components/jjk/CursedGuide.tsx).

    // Cursed-energy dashes stream along any drawn route; buildings bleed on a heartbeat
    useEffect(() => {
        const m = map.current
        if (!m || !mapLoaded) return
        const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        const stopFlow = startRouteFlow(m)
        // Heartbeat only in Cursed view — Normal/Satellite keep true building colours
        const stopPulse = mapMode === 'cursed' ? startCursedPulse(m, !!reduced) : () => {}
        const stopPlanting = mapMode === 'cursed' ? startJapanProps(m) : () => {}
        const stopFountain = mapMode === 'cursed' ? startFountain(m, !!reduced) : () => {}
        return () => { stopFlow(); stopPulse(); stopPlanting(); stopFountain() }
    }, [mapLoaded, mapMode])

    // Pulsing ring under the selected pin
    useEffect(() => {
        const m = map.current
        if (!m || !mapLoaded || !m.getSource('selected-pulse')) return
        const src = m.getSource('selected-pulse') as maplibregl.GeoJSONSource
        if (!selectedPlace?.latitude || !selectedPlace?.longitude) {
            src.setData({ type: 'FeatureCollection', features: [] })
            return
        }
        src.setData({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [selectedPlace.longitude, selectedPlace.latitude] } })
        let raf = 0
        const t0 = performance.now()
        const tick = (now: number) => {
            if (!mapAlive(m)) return // map removed: stop the loop
            raf = requestAnimationFrame(tick)
            // rAF timestamps can precede t0 on the first frame → clamp to [0, 1)
            const p = Math.min(0.999, Math.max(0, ((now - t0) % 1400) / 1400))
            try {
                if (!m.getLayer('selected-pulse')) return
                m.setPaintProperty('selected-pulse', 'circle-radius', 10 + p * 34)
                m.setPaintProperty('selected-pulse', 'circle-stroke-opacity', 1 - p)
                m.setPaintProperty('selected-pulse', 'circle-opacity', 0.25 * (1 - p))
            } catch { /* style swapping */ }
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [selectedPlace, mapLoaded])

    const handleRemoveRoute = useCallback(() => {
        if (!map.current) return
        cachedRouteRef.current = null
        if (map.current.getSource('route-main')) {
            (map.current.getSource('route-main') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] })
        }
        if (map.current.getSource('route-walk')) {
            (map.current.getSource('route-walk') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] })
        }
    }, [])

    const stopWalker = useCallback(() => {
        if (lineAnimRef.current) { cancelAnimationFrame(lineAnimRef.current); lineAnimRef.current = null }
        // Turn off navigation tracking if active (only once the control is on the map)
        const gcState = geolocateControlRef.current?._watchState
        if (geolocateControlRef.current && gcState && gcState !== 'OFF') {
            geolocateControlRef.current.trigger() // Togging trigger when ON turns it OFF
        }
        setNavStatus('idle')
        setNavStats(null)
    }, [])

    const handleRecenter = useCallback(() => {
        if (!map.current || !userLocation.current) return
        map.current.flyTo({
            center: [userLocation.current.lng, userLocation.current.lat],
            zoom: 18,
            pitch: 60,
            duration: 1000
        })
    }, [])

    const drawRoute = useCallback(async (endLat: number, endLng: number, animate = false) => {
        const start = navOriginRef.current ?? userLocation.current
        if (!map.current || !start) return
        if (animate) setNavStatus('routing')
        try {
            // Public OSRM router; if it's unreachable (venue Wi-Fi), fall back to a
            // direct cursed-energy line so navigation + the guide still work.
            let data: { routes?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[] } = {}
            try {
                const ctrl = new AbortController()
                const timer = setTimeout(() => ctrl.abort(), 6000)
                const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${endLng},${endLat}?geometries=geojson`, { signal: ctrl.signal })
                clearTimeout(timer)
                if (res.ok) data = await res.json()
            } catch { /* offline → fallback below */ }
            if (!data.routes?.length) {
                const d = metersBetween(start, { lat: endLat, lng: endLng })
                data = { routes: [{ geometry: { coordinates: [[start.lng, start.lat], [endLng, endLat]] }, distance: d, duration: d / 1.3 }] }
            }
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0].geometry
                const routeDist = data.routes[0].distance
                const routeTime = data.routes[0].duration

                setNavStats({ dist: routeDist, time: routeTime })

                // OSRM snaps to the nearest mapped road, which can be ~100m away on a campus. 
                // We manually prepend the user's EXACT raw GPS coordinate, and append the EXACT 
                // building pin coordinate to the line so there is zero gap or misplacement shown.
                const coords: [number, number][] = [
                    [start.lng, start.lat],
                    ...route.coordinates,
                    [endLng, endLat]
                ]

                cachedRouteRef.current = { coords, dist: routeDist, time: routeTime }
                if (navTargetRef.current) onRouteReadyRef.current?.(coords, navTargetRef.current)

                if (animate) {
                    const lookAhead = Math.min(3, coords.length - 1);
                    const targetBearing = calculateBearing(coords[0][1], coords[0][0], coords[lookAhead][1], coords[lookAhead][0]);
                    map.current.flyTo({
                        center: coords[0],
                        bearing: targetBearing,
                        zoom: 17.5,
                        pitch: 65,
                        duration: 800,
                        essential: true
                    })
                } else {
                    map.current.flyTo({ center: coords[0], zoom: 17, pitch: 50, duration: 800, essential: true })
                }

                ensureRouteLayers(map.current)

                // 1. Animate line drawing
                const totalPoints = coords.length
                const routeMainSource = map.current.getSource('route-main') as maplibregl.GeoJSONSource
                const routeWalkSource = map.current.getSource('route-walk') as maplibregl.GeoJSONSource

                const drawDuration = 500
                const startDrawTime = performance.now()

                const animateLine = (now: number) => {
                    const progress = Math.max(0, Math.min((now - startDrawTime) / drawDuration, 1))
                    const currentFloatIndex = progress * (totalPoints - 1)
                    const currentIntIndex = Math.floor(currentFloatIndex)

                    const currentCoords = coords.slice(0, currentIntIndex + 1)
                    if (currentIntIndex < totalPoints - 1) {
                        const ratio = currentFloatIndex - currentIntIndex
                        const p1 = coords[currentIntIndex]
                        const p2 = coords[currentIntIndex + 1]
                        currentCoords.push([
                            p1[0] + (p2[0] - p1[0]) * ratio,
                            p1[1] + (p2[1] - p1[1]) * ratio
                        ])
                    }

                    const rdStart = 1;
                    const rdEnd = totalPoints - 2;

                    const w1 = currentCoords.slice(0, 2);
                    const rd = currentCoords.length > rdStart ? currentCoords.slice(rdStart, Math.min(currentCoords.length, rdEnd + 1)) : [];
                    const w2 = currentCoords.length > rdEnd ? currentCoords.slice(rdEnd) : [];

                    const walkFeatures: any[] = []
                    if (w1.length >= 2) walkFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: w1 } })
                    if (w2.length >= 2) walkFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: w2 } })

                    routeWalkSource.setData({ type: 'FeatureCollection', features: walkFeatures })
                    routeMainSource.setData({ type: 'FeatureCollection', features: rd.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: rd } }] : [] })

                    if (progress < 1) {
                        lineAnimRef.current = requestAnimationFrame(animateLine)
                    } else {
                        // 2. Start Real GPS Tracking using MapLibre's built-in 'perfect' blue dot
                        setNavStatus('walking')

                        // Trigger MapLibre's native GeolocateControl which perfectly 
                        // handles the blue dot, accuracy circle, and camera tracking!
                        // Skipped when the route starts from the guide/demo origin, otherwise
                        // GPS camera-tracking would fight the guide for the camera.
                        if (!navOriginRef.current && geolocateControlRef.current && geolocateControlRef.current._watchState === 'OFF') {
                            geolocateControlRef.current.trigger()
                        }
                    }
                }
                lineAnimRef.current = requestAnimationFrame(animateLine)
            }
        } catch (err) { console.error('Routing error', err); if (animate) setNavStatus('error') }
    }, [stopWalker])

    // Clear route when both place and navigateToPlace are cleared
    useEffect(() => {
        if (!selectedPlace && !navigateToPlace) {
            handleRemoveRoute()
            stopWalker()
        }
    }, [selectedPlace, navigateToPlace, handleRemoveRoute, stopWalker])

    useEffect(() => {
        navTargetRef.current = navigateToPlace ?? null
        arrivedRef.current = false
        if (!navigateToPlace?.latitude || !navigateToPlace?.longitude) return
        setNavStatus('locating')
        const go = () => drawRoute(navigateToPlace.latitude!, navigateToPlace.longitude!, true)
        if (navOriginRef.current || userLocation.current) { go(); return }
        // No GPS fix (indoors / denied): start from the map centre if it's on campus, else Gate 2
        const fallback = () => {
            const c = map.current?.getCenter()
            userLocation.current = c && isWithinCU(c.lat, c.lng) ? { lat: c.lat, lng: c.lng } : { ...GATE_2_COORDS }
            go()
        }
        navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;
            if (!isWithinCU(lat, lng)) {
                lat = GATE_2_COORDS.lat;
                lng = GATE_2_COORDS.lng;
            }
            userLocation.current = { lat, lng };
            go()
        }, fallback, { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 })
    }, [navigateToPlace, drawRoute])

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />

            {mapMode === 'cursed' && (
                <div className="sakura-layer pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
                    {PETALS.map((p, i) => (
                        <span key={i} className="sakura-petal" style={{
                            left: `${p.x}%`, width: p.size, height: p.size * 0.7,
                            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
                            ['--sway' as string]: `${p.sway}px`,
                        } as React.CSSProperties} />
                    ))}
                </div>
            )}

            {/* Draggable Navigation/Add-Place status overlay */}
            {(navStatus !== 'idle' || pinDropMode) && (
                <div 
                    className="absolute z-50 pointer-events-auto select-none"
                    style={{ 
                        top: barPos.top, 
                        left: barPos.left,
                        cursor: isDraggingBar.current ? 'grabbing' : 'grab',
                        transition: isDraggingBar.current ? 'none' : 'all 0.1s ease-out'
                    }}
                    onMouseDown={handleBarMouseDown}
                    onTouchStart={handleBarMouseDown}
                >
                    {pinDropMode && navStatus === 'idle' && (
                         <div className="cn-glass px-5 py-3 flex items-center gap-4 min-w-[280px]" style={{ color: 'var(--cn-text-1)' }}>
                             <div className="w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse flex-shrink-0" style={{ background: 'var(--cn-accent-purple)', boxShadow: 'var(--cn-shadow-glow-purple)' }}>
                                 <span className="text-xl">📍</span>
                             </div>
                             <div className="flex-1">
                                 <p className="font-bold text-sm leading-tight" style={{ color: 'var(--cn-text-1)' }}>Adding New Place</p>
                                 <p className="text-[11px] mt-0.5" style={{ color: 'var(--cn-text-3)' }}>Click anywhere on campus map</p>
                             </div>
                             <button 
                                 onClick={(e) => { e.stopPropagation(); onCancelAdd?.(); }}
                                 className="ml-2 text-[11px] font-bold px-4 py-2 rounded-xl transition-all"
                                 style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)', border: '1px solid var(--cn-border)' }}
                             >
                                 Cancel
                             </button>
                         </div>
                    )}

                    {navStatus !== 'idle' && (
                        <div className="cn-glass px-4 py-3 flex items-center justify-between gap-4 min-w-[280px]" style={{ color: 'var(--cn-text-1)' }}>
                            {/* Drag handle visual */}
                            <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-1 opacity-20">
                                <div className="w-1 h-0.5 rounded-full" style={{ background: 'var(--cn-text-1)' }} />
                                <div className="w-1 h-0.5 rounded-full" style={{ background: 'var(--cn-text-1)' }} />
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    {navStatus === 'walking' && <div className="absolute -inset-1.5 rounded-full animate-ping" style={{ background: 'rgba(56,189,248,0.2)' }} />}
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center relative z-10" style={{ background: 'var(--cn-accent-gojo)', boxShadow: 'var(--cn-shadow-glow-gojo)' }}>
                                        <span className="text-xl">🏁</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--cn-accent-gojo)' }} />
                                        <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--cn-accent-gojo)' }}>
                                            {navStatus === 'walking' ? 'Traversing' : 'Tracing path'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold truncate max-w-[120px] tracking-tight" style={{ color: 'var(--cn-text-1)' }}>{navigateToPlace?.name || 'Goal'}</span>
                                        {navStats && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-black" style={{ color: 'var(--cn-text-1)' }}>{Math.max(1, Math.round(navStats.time / 60))}m</span>
                                                <span className="w-0.5 h-0.5 rounded-full" style={{ background: 'var(--cn-border)' }} />
                                                <span className="text-xs font-bold" style={{ color: 'var(--cn-accent-gojo)', opacity: 0.9 }}>{Math.round(navStats.dist)}m</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRecenter(); }}
                                    className="p-2 rounded-xl transition-all"
                                    style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-2)', border: '1px solid var(--cn-border)' }}
                                    title="Recenter"
                                >
                                    🎯
                                </button>
                                {navStatus === 'walking' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fireArrive() }}
                                        className="text-[10px] font-black px-3 py-2 rounded-xl transition-all"
                                        style={{ background: 'rgba(0,213,255,0.15)', color: '#5ff5ff', border: '1px solid rgba(0,213,255,0.4)' }}
                                        title="Mark as arrived (demo / no GPS)"
                                    >
                                        ARRIVED
                                    </button>
                                )}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveRoute();
                                        stopWalker();
                                        setNavStatus('idle');
                                        onCancelNavigation?.();
                                    }}
                                    className="text-[10px] font-black px-3 py-2 rounded-xl transition-all"
                                    style={{ background: 'rgba(220,38,38,0.2)', color: 'var(--cn-accent-sukuna)', border: '1px solid rgba(220,38,38,0.3)' }}
                                >
                                    EXIT
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {navStatus === 'error' && (
                        <div className="px-5 py-3 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(127,29,29,0.95)', boxShadow: 'var(--cn-shadow-glass)', border: '1px solid rgba(220,38,38,0.3)', color: 'var(--cn-text-1)' }}>
                            <span className="text-xl">⚠️</span>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--cn-accent-sukuna)' }}>GPS Error</span>
                                <span className="text-xs" style={{ color: 'var(--cn-text-2)' }}>Please enable location access</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Map Controls */}
            {!pinDropMode && (
                <div className="absolute top-20 right-4 md:top-4 md:right-[4.5rem] z-10 flex flex-col md:flex-row gap-2">
                    <div className="cn-glass flex flex-col md:flex-row gap-2 p-1.5">
                        <div data-tour="modes" role="radiogroup" aria-label="Map view" className="flex flex-col md:flex-row gap-1">
                            {MODES.map(md => {
                                const on = mapMode === md.id
                                return (
                                    <button
                                        key={md.id}
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => switchMode(md.id)}
                                        className="w-11 h-11 rounded-2xl text-sm transition-all flex items-center justify-center"
                                        style={on
                                            ? { background: md.bg, color: '#fff', boxShadow: md.glow }
                                            : { background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                        title={md.title}
                                    >
                                        <span className={md.id === 'cursed' ? 'jjk-font text-lg' : ''}>{md.icon}</span>
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            data-tour="guide"
                            onClick={() => onToggleGuide?.()}
                            className="w-11 h-11 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
                            style={guideActive
                                ? { background: 'linear-gradient(135deg,#2563ff,#00d5ff)', color: '#fff', boxShadow: '0 0 16px rgba(0,213,255,0.7)' }
                                : { background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                            title={guideActive ? 'Dismiss guide (Space)' : 'Summon floating guide (Space)'}
                            aria-pressed={guideActive}
                        >
                            <span>{guideActive ? '✕' : '🧿'}</span>
                        </button>
                    </div>
                </div>
            )}


            {/* Map Styles including custom ping keyframe */}
            <style>{`
                @keyframes pinBounceIn {
                    0%   { transform: translateY(-24px) scale(0.7); opacity: 0; }
                    60%  { transform: translateY(4px) scale(1.08); opacity: 1; }
                    80%  { transform: translateY(-2px) scale(0.97); }
                    100% { transform: translateY(0) scale(1); }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    )
}

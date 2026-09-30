import type maplibregl from 'maplibre-gl'
import type { TourSpot } from '@/lib/tour360'
import { mapAlive } from '@/lib/map/mapAlive'

/** Glowing 👁 markers where the 360° panoramas were shot. */

const bound = new WeakSet<maplibregl.Map>()

function ensureEyeImage(m: maplibregl.Map) {
    if (m.hasImage('tour-eye')) return
    const S = 44, PR = 2
    const cv = document.createElement('canvas')
    cv.width = S * PR
    cv.height = S * PR
    const ctx = cv.getContext('2d')!
    ctx.scale(PR, PR)
    const c = S / 2
    ctx.shadowColor = '#00f0ff'
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(c, c, 15, 0, Math.PI * 2)
    ctx.fillStyle = '#05030a'
    ctx.fill()
    ctx.strokeStyle = '#00f0ff'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.shadowBlur = 0
    // Six Eyes: almond outline + iris
    ctx.beginPath()
    ctx.moveTo(c - 10, c)
    ctx.quadraticCurveTo(c, c - 9, c + 10, c)
    ctx.quadraticCurveTo(c, c + 9, c - 10, c)
    ctx.strokeStyle = '#e6fdff'
    ctx.lineWidth = 1.6
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(c, c, 3.6, 0, Math.PI * 2)
    ctx.fillStyle = '#00f0ff'
    ctx.fill()
    const img = ctx.getImageData(0, 0, cv.width, cv.height)
    m.addImage('tour-eye', { width: cv.width, height: cv.height, data: new Uint8Array(img.data.buffer) }, { pixelRatio: PR })
}

export function ensureTourLayers(m: maplibregl.Map, spots: TourSpot[], onClick: (sceneId: string) => void) {
    ensureEyeImage(m)
    const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: spots.map(s => ({ type: 'Feature', properties: { sceneId: s.sceneId, name: s.name }, geometry: { type: 'Point', coordinates: [s.lng, s.lat] } })),
    }
    if (!m.getSource('tour-spots')) m.addSource('tour-spots', { type: 'geojson', data })
    else (m.getSource('tour-spots') as maplibregl.GeoJSONSource).setData(data)

    if (!m.getLayer('tour-spots-glow')) {
        m.addLayer({
            id: 'tour-spots-glow', type: 'circle', source: 'tour-spots', minzoom: 17,
            paint: {
                'circle-translate': [22, -7],
                'circle-translate-anchor': 'viewport',
                'circle-radius': 16, 'circle-color': '#00f0ff', 'circle-opacity': 0.18, 'circle-blur': 0.6,
                'circle-stroke-color': '#00f0ff', 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.6,
                'circle-pitch-alignment': 'map',
            },
        })
    }
    if (!m.getLayer('tour-spots-icon')) {
        m.addLayer({
            id: 'tour-spots-icon', type: 'symbol', source: 'tour-spots', minzoom: 17,
            layout: {
                'icon-image': 'tour-eye', 'icon-allow-overlap': true, 'icon-ignore-placement': true,
                // Screen-pixel offset so the 👁 sits beside a place pin at the same spot, not on top of it
                'icon-offset': [30, -10],
                'icon-size': ['interpolate', ['linear'], ['zoom'], 17, 0.7, 20, 0.95],
            },
        })
    }

    if (!bound.has(m)) {
        bound.add(m)
        m.on('click', 'tour-spots-icon', (e) => {
            const id = e.features?.[0]?.properties?.sceneId
            if (typeof id === 'string') onClick(id)
        })
        m.on('mouseenter', 'tour-spots-icon', () => { m.getCanvas().style.cursor = 'pointer' })
        m.on('mouseleave', 'tour-spots-icon', () => { m.getCanvas().style.cursor = '' })
    }
}

/** Breathing glow on the 360° markers. Returns a stop function. */
export function startTourPulse(m: maplibregl.Map) {
    let raf = 0
    const t0 = performance.now()
    let last = 0
    const tick = (now: number) => {
        if (!mapAlive(m)) return // map removed (HMR / remount): stop
        raf = requestAnimationFrame(tick)
        if (now - last <= 50) return
        last = now
        const p = (Math.sin((now - t0) / 380) + 1) / 2
        try {
            if (!m.getLayer('tour-spots-glow')) return
            m.setPaintProperty('tour-spots-glow', 'circle-radius', 13 + p * 10)
            m.setPaintProperty('tour-spots-glow', 'circle-stroke-opacity', 0.35 + p * 0.5)
        } catch { /* style swapping */ }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
}

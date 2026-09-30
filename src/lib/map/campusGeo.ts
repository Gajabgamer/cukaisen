/**
 * Campus geometry + small geo helpers shared by the map, the Veil fog,
 * the floating guide and the demo tour. No maplibre import here so it can be
 * used anywhere (and unit-tested) without loading the map library.
 */

export type LngLat = { lng: number; lat: number }

export const CU_CENTER: [number, number] = [76.5766, 30.7699]
export const GATE_2_COORDS = { lat: 30.772587, lng: 76.576408 }
export const CU_MAX_BOUNDS: [[number, number], [number, number]] = [[76.5670, 30.7620], [76.5840, 30.7775]]

export function isWithinCU(lat: number, lng: number) {
    return lat >= 30.7620 && lat <= 30.7775 && lng >= 76.5670 && lng <= 76.5840
}

// ~57-point polygon tracing the CU Chandigarh campus perimeter ([lng, lat])
export const CU_CAMPUS_BOUNDARY: [number, number][] = [
    [76.5687, 30.7718], [76.5690, 30.7730], [76.5693, 30.7742], [76.5698, 30.7751], [76.5705, 30.7757],
    [76.5714, 30.7761], [76.5724, 30.7763], [76.5735, 30.7764], [76.5747, 30.7763], [76.5760, 30.7762],
    [76.5772, 30.7762], [76.5783, 30.7761], [76.5793, 30.7759], [76.5801, 30.7756], [76.5808, 30.7752],
    [76.5814, 30.7747], [76.5819, 30.7741], [76.5822, 30.7734], [76.5824, 30.7726], [76.5824, 30.7718],
    [76.5823, 30.7710], [76.5821, 30.7702], [76.5819, 30.7695], [76.5817, 30.7688], [76.5816, 30.7681],
    [76.5816, 30.7674], [76.5817, 30.7667], [76.5818, 30.7660], [76.5817, 30.7653], [76.5814, 30.7647],
    [76.5810, 30.7642], [76.5804, 30.7638], [76.5797, 30.7635], [76.5789, 30.7633], [76.5780, 30.7632],
    [76.5771, 30.7631], [76.5762, 30.7631], [76.5753, 30.7631], [76.5744, 30.7631], [76.5735, 30.7631],
    [76.5726, 30.7632], [76.5717, 30.7633], [76.5709, 30.7635], [76.5702, 30.7638], [76.5696, 30.7642],
    [76.5691, 30.7647], [76.5688, 30.7653], [76.5686, 30.7660], [76.5685, 30.7667], [76.5685, 30.7674],
    [76.5685, 30.7681], [76.5685, 30.7688], [76.5685, 30.7695], [76.5685, 30.7702], [76.5685, 30.7710],
    [76.5686, 30.7718], [76.5687, 30.7718],
]

export const OUTER_BOUNDS: [number, number][] = [
    [76.40, 30.90], [76.80, 30.90], [76.80, 30.60], [76.40, 30.60], [76.40, 30.90],
]

/** Ray-casting point-in-polygon on [lng, lat] rings. */
export function pointInPolygon(lng: number, lat: number, ring: [number, number][] = CU_CAMPUS_BOUNDARY) {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i]
        const [xj, yj] = ring[j]
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

export const inCampus = (p: LngLat) => pointInPolygon(p.lng, p.lat)

const M_PER_DEG_LAT = 111320

/** Fast equirectangular distance in metres (accurate at campus scale). */
export function metersBetween(a: LngLat, b: LngLat) {
    const mx = (b.lng - a.lng) * M_PER_DEG_LAT * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180)
    const my = (b.lat - a.lat) * M_PER_DEG_LAT
    return Math.hypot(mx, my)
}

/** Move `meters` from `p` along compass `bearingDeg` (0 = north). */
export function offset(p: LngLat, bearingDeg: number, meters: number): LngLat {
    const b = bearingDeg * Math.PI / 180
    return {
        lat: p.lat + (Math.cos(b) * meters) / M_PER_DEG_LAT,
        lng: p.lng + (Math.sin(b) * meters) / (M_PER_DEG_LAT * Math.cos(p.lat * Math.PI / 180)),
    }
}

export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = Math.PI / 180
    const dLng = (lng2 - lng1) * toRad
    const y = Math.sin(dLng) * Math.cos(lat2 * toRad)
    const x = Math.cos(lat1 * toRad) * Math.sin(lat2 * toRad) - Math.sin(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.cos(dLng)
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

/** Shortest signed angle from a to b in degrees, in (-180, 180]. */
export function angleDelta(a: number, b: number) {
    let d = ((b - a) % 360 + 540) % 360 - 180
    if (d === -180) d = 180
    return d
}

/** Cumulative-distance helper for walking along a polyline of [lng, lat]. */
export function buildPath(coords: [number, number][]) {
    const cum: number[] = [0]
    for (let i = 1; i < coords.length; i++) {
        cum.push(cum[i - 1] + metersBetween({ lng: coords[i - 1][0], lat: coords[i - 1][1] }, { lng: coords[i][0], lat: coords[i][1] }))
    }
    const total = cum[cum.length - 1] || 0
    const at = (s: number): LngLat => {
        if (coords.length === 0) return { lng: 0, lat: 0 }
        const d = Math.max(0, Math.min(total, s))
        let i = 1
        while (i < cum.length - 1 && cum[i] < d) i++
        const seg = cum[i] - cum[i - 1] || 1
        const t = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg))
        const [x1, y1] = coords[Math.max(0, i - 1)]
        const [x2, y2] = coords[Math.min(coords.length - 1, i)]
        return { lng: x1 + (x2 - x1) * t, lat: y1 + (y2 - y1) * t }
    }
    return { total, at }
}

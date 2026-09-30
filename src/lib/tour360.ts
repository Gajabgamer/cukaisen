/**
 * 360° campus tour config (images from cutour360.zip → public/tour360/).
 *
 * The images are partial panoramas (~4:1 strips, not 2:1 spheres), so each
 * scene carries its vertical angle of view (vaov) so the viewer never shows
 * black bands above/below the photo.
 */

export interface TourScene {
    id: string
    image: string
    /** Vertical angle of view in degrees (360 * height / width). */
    vaov: number
    /** Initial camera direction, from the original tour config where set. */
    yaw?: number
    pitch?: number
}

const DIMS: Record<string, [number, number]> = {
    scene_1: [2144, 556],
    scene_2: [2128, 520],
    scene_3: [2128, 540],
    scene_4: [2164, 532],
    scene_5: [2120, 508],
    scene_6: [2132, 548],
    scene_7: [2160, 516],
    scene_8: [2132, 568],
    scene_9: [2120, 568],
}

const START_VIEW: Record<string, { yaw: number; pitch: number }> = {
    scene_2: { yaw: -103.37, pitch: -2.05 },
}

export const TOUR_SCENES: Record<string, TourScene> = Object.fromEntries(
    Object.entries(DIMS).map(([id, [w, h]]) => [
        id,
        { id, image: `/tour360/${id}.jpg`, vaov: Math.round((360 * h / w) * 100) / 100, ...START_VIEW[id] },
    ])
)

/**
 * WHERE EACH 360° PHOTO WAS SHOT. Each scene has its own map position and
 * label, independent of place records. Rename labels freely.
 * Coords for named spots are taken from the matching place in the DB.
 */
export interface TourSpot { sceneId: string; name: string; lat: number; lng: number }

export const TOUR_SPOTS: TourSpot[] = [
    { sceneId: 'scene_1', name: 'Campus Point 01', lat: 30.770563, lng: 76.576318 },
    { sceneId: 'scene_2', name: 'Front of B2', lat: 30.769006, lng: 76.576083 },   // B2 place coords
    { sceneId: 'scene_3', name: 'Front of DSW', lat: 30.768534, lng: 76.575326 },
    { sceneId: 'scene_4', name: 'Campus Point 04', lat: 30.768920, lng: 76.576418 },
    { sceneId: 'scene_5', name: 'Basketball Court', lat: 30.767924, lng: 76.575729 },
    { sceneId: 'scene_6', name: 'A1 Roundabout', lat: 30.771644, lng: 76.578510 },  // A1 place coords
    { sceneId: 'scene_7', name: 'Fountain', lat: 30.769515, lng: 76.577404 },       // Fountain place coords
    { sceneId: 'scene_8', name: 'Gate 1', lat: 30.771688, lng: 76.579644 },         // "GATE -1" place coords
    { sceneId: 'scene_9', name: 'Gate 2', lat: 30.770764, lng: 76.576290 },         // Gate 2 place coords
]

export interface TourHit { spot: TourSpot; scene: TourScene; d: number }

/** Nearest 360° spot to a point, or null if none within maxMeters. */
export function nearestTourSpot(pt: { lat: number; lng: number }, maxMeters = Infinity): TourHit | null {
    let best: TourHit | null = null
    for (const spot of TOUR_SPOTS) {
        const d = distanceMeters(pt, spot)
        if (d <= maxMeters && (!best || d < best.d)) best = { spot, scene: TOUR_SCENES[spot.sceneId], d }
    }
    return best
}

/** 360° view for a place panel: the spot within 45 m of the place, if any. */
export function tourForPlace(place: { latitude?: number | null; longitude?: number | null }): TourHit | null {
    if (place.latitude == null || place.longitude == null) return null
    return nearestTourSpot({ lat: place.latitude, lng: place.longitude }, 45)
}

/** Portal pops when the map centre settles within this distance of a place... */
export const TRIGGER_RADIUS_M = 60
/** ...and only re-arms once you've moved this far away (prevents flicker). */
export const RELEASE_RADIUS_M = 110
/** Don't pop while zoomed out looking at the whole campus. */
export const MIN_TRIGGER_ZOOM = 17

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
    const R = 6371000
    const toRad = (d: number) => (d * Math.PI) / 180
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(h))
}

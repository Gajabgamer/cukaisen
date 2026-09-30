import { describe, it, expect } from 'vitest'
import {
    buildTree, buildTorii, kanjiFor, sampleRoadside, STATIC_PROPS, BANNERS,
    COURT_FIELDS, FOUNTAIN, FOUNTAIN_STATIC, FOUNTAIN_WATER, fountainDynamic, fountainSigil, fountainLawnFrom, type PropFeature,
} from './japanStyle'
import { metersBetween } from './campusGeo'

describe('fountain lawn', () => {
    const loop = (r: number, gapFrom = 999, gapTo = 999) => {
        const coords: [number, number][] = []
        for (let a = 0; a <= 360; a += 5) {
            if (a > gapFrom && a < gapTo) continue
            const p = offset(FOUNTAIN, a, r)
            coords.push([p.lng, p.lat])
        }
        return { type: 'Feature', properties: { class: 'path' }, geometry: { type: 'LineString', coordinates: coords } } as GeoJSON.Feature
    }
    it('traces just inside a circular path', () => {
        const lawn = fountainLawnFrom([loop(50)])!
        expect(lawn).not.toBeNull()
        const ring = (lawn.geometry as GeoJSON.Polygon).coordinates[0]
        for (const [lng, lat] of ring) {
            const d = metersBetween({ lng, lat }, FOUNTAIN)
            expect(d).toBeGreaterThan(44)
            expect(d).toBeLessThan(49)
        }
    })
    it('returns null when the loop has not loaded', () => {
        expect(fountainLawnFrom([])).toBeNull()
        expect(fountainLawnFrom([loop(50, 0, 250)])).toBeNull()
    })
})
import { offset, CU_CENTER } from './campusGeo'

const c = { lng: CU_CENTER[0], lat: CU_CENTER[1] }

describe('japan props geometry', () => {
    it('trees, lanterns and torii stack as closed rings with base < height', () => {
        const all = [...buildTree(c, 'sakura'), ...buildTree(c, 'pine'), ...buildTree(c, 'lantern'), ...buildTorii(c)]
        for (const f of all) {
            const ring = f.geometry.coordinates[0]
            expect(ring[0]).toEqual(ring[ring.length - 1])
            expect(f.properties.b).toBeLessThan(f.properties.h)
        }
        // each tree tier sits on the previous one
        const pine = buildTree(c, 'pine')
        for (let i = 1; i < pine.length; i++) expect(pine[i].properties.b).toBeCloseTo(pine[i - 1].properties.h)
    })

    it('static torii and banners exist for the gates / 360° spots', () => {
        expect(STATIC_PROPS.length).toBe(2 * 5)
        expect(BANNERS.features.length).toBe(18)
    })

    it('only the basketball court gets a green field (no round discs)', () => {
        expect(COURT_FIELDS.features.map(f => f.properties?.kind)).toEqual(['court'])
    })

    it('fountain: closed rings, runes orbit and the crystal bobs over time', () => {
        for (const f of [...FOUNTAIN_STATIC, ...FOUNTAIN_WATER]) {
            for (const ring of f.geometry.coordinates) expect(ring[0]).toEqual(ring[ring.length - 1])
            expect(f.properties.b).toBeLessThan(f.properties.h)
        }
        const a = fountainDynamic(0).features as PropFeature[]
        const b = fountainDynamic(1).features as PropFeature[]
        expect(a.length).toBe(8) // crystal + tip + 6 runes
        expect(b[2].geometry.coordinates[0][0]).not.toEqual(a[2].geometry.coordinates[0][0])
        expect(b[0].properties.b).not.toBeCloseTo(a[0].properties.b)
        expect(fountainSigil(30).features.length).toBe(5)
    })

    it('kanjiFor maps known categories and has a fallback', () => {
        expect(kanjiFor('Hostel')).toBe('寮')
        expect(kanjiFor('parking')).toBe('車')
        expect(kanjiFor('park')).toBe('園')
        expect(kanjiFor(undefined)).toBe('所')
    })

    it('plants along a road, never inside a building, and de-duplicates', () => {
        const a = offset(c, 270, 150), b = offset(c, 90, 150)
        const road = { type: 'Feature', properties: { class: 'minor' }, geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [b.lng, b.lat]] } } as GeoJSON.Feature
        // A building covering the north side of the road's middle stretch
        const n1 = offset(offset(c, 0, 4), 270, 40), n2 = offset(offset(c, 0, 30), 90, 40)
        const bld = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[n1.lng, n1.lat], [n2.lng, n1.lat], [n2.lng, n2.lat], [n1.lng, n2.lat], [n1.lng, n1.lat]]] } } as GeoJSON.Feature
        const seen = new Set<string>()
        const first = sampleRoadside([road], [bld], seen, 1000)
        // Sparse: ~1 plant per 55 m on a 300 m road
        expect(first.feats.length).toBeGreaterThanOrEqual(6)
        expect(first.feats.length).toBeLessThan(40)
        const north = first.feats.filter(f => {
            const [x, y] = f.geometry.coordinates[0][0]
            return y > n1.lat && y < n2.lat && x > n1.lng && x < n2.lng
        })
        expect(north.length).toBe(0)
        const again = sampleRoadside([road], [bld], seen, 1000)
        expect(again.feats.length).toBe(0)
        const footway = { ...road, properties: { class: 'footway' } } as GeoJSON.Feature
        expect(sampleRoadside([footway], [], new Set(), 1000).feats.length).toBe(0)
    })
})

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
    metersBetween, offset, angleDelta, buildPath, pointInPolygon, calculateBearing, CU_CENTER, GATE_2_COORDS,
} from './campusGeo'

const campus = { lng: CU_CENTER[0], lat: CU_CENTER[1] }

describe('campus geo helpers', () => {
    it('offset + metersBetween round-trip at campus scale', () => {
        fc.assert(fc.property(fc.double({ min: 0, max: 359.9, noNaN: true }), fc.double({ min: 1, max: 800, noNaN: true }), (b, m) => {
            const p = offset(campus, b, m)
            expect(Math.abs(metersBetween(campus, p) - m)).toBeLessThan(m * 0.01 + 0.05)
        }))
    })

    it('offset heads the right way (bearing of the result matches)', () => {
        fc.assert(fc.property(fc.double({ min: 0, max: 359.9, noNaN: true }), (b) => {
            const p = offset(campus, b, 200)
            expect(Math.abs(angleDelta(b, calculateBearing(campus.lat, campus.lng, p.lat, p.lng)))).toBeLessThan(0.5)
        }))
    })

    it('angleDelta is the shortest signed turn', () => {
        expect(angleDelta(350, 10)).toBeCloseTo(20)
        expect(angleDelta(10, 350)).toBeCloseTo(-20)
        fc.assert(fc.property(fc.double({ min: -720, max: 720, noNaN: true }), fc.double({ min: -720, max: 720, noNaN: true }), (a, b) => {
            const d = angleDelta(a, b)
            expect(d).toBeGreaterThan(-180.0001)
            expect(d).toBeLessThanOrEqual(180.0001)
        }))
    })

    it('buildPath walks endpoints and stays on the polyline', () => {
        const coords: [number, number][] = [[76.5760, 30.7700], [76.5770, 30.7700], [76.5770, 30.7710]]
        const path = buildPath(coords)
        expect(path.total).toBeGreaterThan(180)
        expect(path.at(0)).toEqual({ lng: 76.5760, lat: 30.7700 })
        const end = path.at(path.total + 50)
        expect(end.lng).toBeCloseTo(76.5770, 6)
        expect(end.lat).toBeCloseTo(30.7710, 6)
    })

    it('campus centre and Gate 2 are inside the campus polygon; far points are not', () => {
        expect(pointInPolygon(campus.lng, campus.lat)).toBe(true)
        expect(pointInPolygon(GATE_2_COORDS.lng, GATE_2_COORDS.lat)).toBe(true)
        expect(pointInPolygon(76.60, 30.80)).toBe(false)
    })
})


import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { think, composeReply, landmarksAlong, shortName, walkEstimate, type BrainPlace } from './guideBrain'
import { GUIDE_LIST, GUIDES } from './guides'

const P = (id: string, name: string, cat: string, lat: number, lng: number): BrainPlace => ({ id, name, cat, lat, lng })
const PLACES: BrainPlace[] = [
    P('lib', 'Central library', 'library', 30.77017, 76.57559),
    P('a2', 'Block - A2', 'department', 30.7668, 76.5742),
    P('b1', 'Academic Block B1', 'department', 30.7690, 76.5752),
    P('d6', 'Academic Block - D6 Library', 'library', 30.77149, 76.56920),
    P('cafe', 'The Corner Cafe', 'food', 30.76914, 76.57631),
    P('dhaba', 'Himachali Dhaba', 'food', 30.76879, 76.57545),
    P('tj', "TJ's Food Court", 'food', 30.76994, 76.57709),
    P('atm', 'SBI ATM', 'atm & bank', 30.76767, 76.57535),
    P('g1', 'Gate 1', 'gate', 30.7652, 76.5760),
    P('pharm', 'Pharmacy Block', 'medical', 30.76904, 76.57587),
]
const ORIGIN = { lat: 30.7685, lng: 76.5757 }

describe('guide brain intents', () => {
    it.each([
        ['take me to the library', 'navigate', 'lib'],
        ['where is block a2', 'navigate', 'a2'],
        ['B1 kaha hai', 'navigate', 'b1'],
        ["take me to TJ's food court", 'navigate', 'tj'],
        ['gate 1 le chalo', 'navigate', 'g1'],
        ['main gate', 'navigate', 'g1'],
    ])('"%s" → %s %s', (q, intent, id) => {
        const a = think(q, PLACES, ORIGIN)
        expect(a.intent).toBe(intent)
        expect(a.place?.id).toBe(id)
        expect(a.dist).toBeGreaterThan(0)
    })

    it('nearest cafe prefers real cafes over dhabas', () => {
        const a = think('nearest cafe', PLACES, ORIGIN)
        expect(a.intent).toBe('nearest')
        expect(a.list?.[0].id).toBe('cafe')
    })

    it('Hinglish category questions', () => {
        expect(think('ATM kidhar hai', PLACES, ORIGIN).list?.[0].id).toBe('atm')
        expect(think('dawa kaha milegi', PLACES, ORIGIN).list?.[0].id).toBe('pharm')
    })

    it('greets and admits unknown places instead of inventing', () => {
        expect(think('hi', PLACES, ORIGIN).intent).toBe('hello')
        expect(think('hogwarts great hall', PLACES, ORIGIN).intent).toBe('notFound')
    })
})

describe('landmarks along a route', () => {
    it('lists places near the path in walking order, excluding the destination', () => {
        const path: [number, number][] = [[76.5757, 30.7672], [76.5757, 30.7700]]
        const way = landmarksAlong(path, [
            P('far', 'Far Away Hall', 'department', 30.7690, 76.5790),
            P('n2', 'Second Stop', 'department', 30.7692, 76.5758),
            P('n1', 'First Stop', 'gate', 30.7680, 76.5756),
            P('dest', 'Destination', 'library', 30.7699, 76.5757),
        ], { excludeId: 'dest' })
        expect(way.map(w => w.id)).toEqual(['n1', 'n2'])
    })

    it('never returns places farther than the radius (property)', () => {
        fc.assert(fc.property(
            fc.array(fc.record({ dLat: fc.double({ min: -0.004, max: 0.004, noNaN: true }), dLng: fc.double({ min: -0.004, max: 0.004, noNaN: true }) }), { maxLength: 30 }),
            pts => {
                const path: [number, number][] = [[76.5757, 30.7672], [76.5757, 30.7700]]
                const places = pts.map((p, i) => P(`p${i}`, `Place ${i}`, 'department', 30.7686 + p.dLat, 76.5757 + p.dLng))
                const way = landmarksAlong(path, places, { radius: 35 })
                const kx = 111320 * Math.cos(30.7686 * Math.PI / 180)
                return way.length <= 4 && way.every(w => Math.abs((w.lng - 76.5757) * kx) <= 35.5)
            }))
    })
})

describe('guide voices', () => {
    it('every guide has a full set of lines and an intro', () => {
        for (const g of GUIDE_LIST) {
            expect(g.intro.length).toBeGreaterThanOrEqual(2)
            for (const v of Object.values(g.t)) expect(v.length).toBeGreaterThan(5)
        }
    })
    it('replies only contain facts from the answer, never template holes', () => {
        const qs = ['take me to the library', 'nearest cafe', 'tell me about the pharmacy block', 'xyz unknown', 'hello']
        for (const g of GUIDE_LIST) for (const q of qs) {
            const r = composeReply(g, think(q, PLACES, ORIGIN))
            expect(r).not.toMatch(/\{\w+\}|undefined|NaN/)
        }
        expect(composeReply(GUIDES.sukuna, think('take me to the library', PLACES, ORIGIN))).toContain('Central library')
    })
})

describe('helpers', () => {
    it('shortName trims Google suffixes', () => {
        expect(shortName('HDFC Bank, Chandigarh University Campus')).toBe('HDFC Bank')
        expect(shortName('Block-1 Computer Science Engg.')).toBe('Block-1 Computer Science Engg')
        expect(shortName('Alpha Hospital - Eye | Gynae | Dental')).toBe('Alpha Hospital - Eye')
    })
    it('walk estimate is monotonic and positive', () => {
        fc.assert(fc.property(fc.double({ min: 0, max: 3000, noNaN: true }), fc.double({ min: 0, max: 3000, noNaN: true }), (a, b) => {
            const [x, y] = [walkEstimate(Math.min(a, b)), walkEstimate(Math.max(a, b))]
            return x.dist <= y.dist && x.min <= y.min && x.min >= 1
        }))
    })
})

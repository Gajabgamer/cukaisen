/**
 * Guide brain — deterministic campus reasoning shared by /api/chat and the
 * map. Understands English + Hinglish ("ATM kidhar hai", "library le chalo"),
 * resolves real DB places, finds nearest-by-category, and lists landmarks
 * the student will pass along a route. The LLM (optional) only adds voice;
 * every fact comes from here, so the guide never invents places.
 */
import { fill, type Guide } from './guides'

export interface BrainPlace { id: string; name: string; lat: number; lng: number; cat: string; description?: string | null }
export interface Hit { id: string; name: string; cat: string; lat: number; lng: number; dist: number }
export type Intent = 'hello' | 'navigate' | 'nearest' | 'info' | 'notFound'
export interface Answer {
    intent: Intent
    query: string
    category?: string
    place?: Hit
    list?: Hit[]
    way?: Hit[]
    dist?: number
    min?: number
    nearby?: Hit[]
}
export type LngLat = [number, number]

const M = 111320
export function meters(aLat: number, aLng: number, bLat: number, bLng: number) {
    const kx = M * Math.cos(((aLat + bLat) / 2) * Math.PI / 180)
    return Math.hypot((bLng - aLng) * kx, (bLat - aLat) * M)
}
/** Straight-line → realistic walking distance/time on campus paths. */
export function walkEstimate(straight: number) {
    const dist = Math.round((straight * 1.25) / 10) * 10
    return { dist: Math.max(dist, 10), min: Math.max(1, Math.round(dist / 75)) }
}

export function norm(s: string) {
    return s.toLowerCase().replace(/&/g, ' and ').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
/** "Academic Block - B5 | Law" → "Academic Block - B5" */
export function shortName(name: string) {
    let n = name.split(/\s[|•]\s|\s\|/)[0].trim()
        .replace(/\s*[,\-–]\s*(chandigarh university|cu campus|gharuan|mohali|kharar|punjab)\b.*$/i, '')
        .replace(/[.\s-]+$/, '')
        .trim() || name.trim()
    if (n.length > 34) n = n.split(/\s[-–(]\s?/)[0].trim()
    return n.length > 38 ? n.slice(0, 36).trim() + '…' : n
}

// Words that carry intent but never identify a place
const STOP = new Set(('take me to the a an please pls plz bro bhai yaar go goto navigate route show way how do i reach get where is are ' +
    'kaha kahan kidhar kidr hai h he le chalo chalo jana jaana ka ki ke ko mujhe muje find locate can you tell about what whats ' +
    'nearest near nearby closest my paas pass nazdik najdik around here from of in at on for any some best good direction directions ' +
    'guide lead want need milega milegi milta milti hoga hogi kaise kese jau jaun jaye ek wala wali open and there one lets let us ' +
    'hey hi hello yo sensei sir mam please give list all tak se mein me i m im am wanna gonna should could would').split(/\s+/))

// Query words → DB category (lowercase)
const CAT_WORDS: Record<string, string> = {}
const addCat = (cat: string, words: string) => words.split(/\s+/).forEach(w => { CAT_WORDS[w] = cat })
addCat('food', 'cafe cafes café coffee chai tea food foods eat eating canteen canteens hungry bhook bhukh khana khaana pizza burger burgers juice snack snacks restaurant restaurants mess dhaba maggi biryani dosa momos rolls icecream ice cream shake waffle bakery cake sandwich paratha parantha samosa kulcha lunch dinner breakfast nashta')
addCat('atm & bank', 'atm atms cash paisa paise money bank banks')
addCat('medical', 'pharmacy chemist medicine medicines dawa dawai doctor medical hospital sick dispensary clinic ill fever')
addCat('shop', 'stationery stationary stationer xerox photocopy print printout printing prints printer shop shops store stores notebook notebooks pen pens mart grocery kiryana salon haircut mobile recharge')
addCat('library', 'library libraries lib books book study padhai')
addCat('hostel', 'hostel hostels pg room rooms accommodation')
addCat('parking', 'parking bike car scooty vehicle')
addCat('playground', 'sports sport gym ground grounds basketball court cricket football volleyball badminton playground workout')
addCat('gate', 'gate gates entrance exit')
addCat('department', 'block blocks department dept class classes lecture lab labs academic')

// Words that are "just the category" (can't identify a single place alone)
const GENERIC = new Set(['cafe', 'cafes', 'food', 'foods', 'shop', 'shops', 'store', 'stores', 'block', 'blocks', 'hostel', 'hostels', 'library', 'libraries', 'lib',
    'atm', 'atms', 'bank', 'parking', 'gate', 'gates', 'canteen', 'canteens', 'restaurant', 'restaurants', 'department', 'dept', 'pharmacy', 'medical', 'ground',
    'gym', 'court', 'eat', 'hungry', 'bhook', 'khana', 'cash', 'paisa', 'money', 'medicine', 'dawa', 'study', 'sports', 'room', 'pg', 'academic', 'snack', 'snacks'])

const ALIASES: [RegExp, string][] = [
    [/\bmain gate\b/, 'gate 1'], [/\btakshila\b/, 'c2'], [/\bfountain\b/, 'fountain point'], [/\bcentral lib\b/, 'central library'],
    [/\badmission(s)? (office|block)\b/, 'admission cell'], [/\bgate (no|number|num) ?(\d)\b/, 'gate $2'],
]

const NEAR_RE = /\b(nearest|near|nearby|closest|close|paas|pass|nazdik|najdik|around|hungry|bhook|bhukh)\b/
const INFO_RE = /\b(tell me about|what is|whats|info|about|kya hai|details)\b/
const NAV_RE = /\b(take me|le chalo|chalo|go to|goto|navigate|route|reach|jana|jaana|lead|guide me|how to get|kaise jau|kaise jaun|directions?)\b/
const HELLO_RE = /^(hi+|hello|hey+|yo|namaste|sup|hola|kya haal|help|what can you do|kya kar sakte)\b/

function blockCode(q: string): string | null {
    const m = q.match(/\b(dd|[a-d])\s?-?\s?(\d{1,2}[a-z]?)\b/)
    return m ? `${m[1]}${m[2]}` : null
}

interface Scored { p: BrainPlace; s: number }
function scorePlaces(qTokens: string[], code: string | null, places: BrainPlace[]): Scored[] {
    const qStr = qTokens.join(' ')
    const qC = qStr.replace(/ /g, '')
    const specific = qTokens.filter(t => !GENERIC.has(t))
    const out: Scored[] = []
    for (const p of places) {
        const n = norm(p.name)
        const nT = n.split(' ')
        const nC = n.replace(/ /g, '')
        let s = 0
        if (code) {
            if (nT.includes(code)) s = 92 + (p.cat === 'department' ? 4 : 0) + (/^(academic )?block\b/.test(n) ? 2 : 0) - nT.length * 0.3
        } else if (qTokens.length) {
            if (nC === qC) s = 100
            else if (qC.length >= 3 && specific.length && (` ${n} `).includes(` ${qStr} `)) s = 86 - Math.min(10, nT.length - qTokens.length)
            else if (nC.length >= 4 && qC.includes(nC)) s = 76
            else {
                let hit = 0, strong = 0
                for (const t of qTokens) {
                    const ok = /^\d+$/.test(t) ? nT.includes(t) : t.length >= 3 && nT.some(w => w.startsWith(t) || (w.length >= 4 && t.startsWith(w)))
                    if (ok) { hit++; if (!GENERIC.has(t)) strong++ }
                }
                if (strong) s = (hit / qTokens.length) * 72 - Math.max(0, nT.length - hit) * 0.8
            }
        }
        if (s > 0) out.push({ p, s })
    }
    return out.sort((a, b) => b.s - a.s)
}

function toHit(p: BrainPlace, oLat: number, oLng: number): Hit {
    return { id: p.id, name: shortName(p.name), cat: p.cat, lat: p.lat, lng: p.lng, dist: Math.round(meters(oLat, oLng, p.lat, p.lng)) }
}

/** Nearest places of a category (optionally narrowed by a keyword in the name). */
// Sub-kinds inside a category: "cafe" should prefer actual cafes over dhabas
const HINTS: Record<string, RegExp> = {
    cafe: /caf|coffee|nescafe/, cafes: /caf|coffee|nescafe/, coffee: /caf|coffee|nescafe/,
    print: /print|xerox|copy|stationer/, printout: /print|xerox|copy|stationer/, printing: /print|xerox|copy|stationer/,
    xerox: /print|xerox|copy|stationer/, photocopy: /print|xerox|copy|stationer/,
    stationery: /station/, stationary: /station/, atm: /atm/, pharmacy: /pharm|chemist|medic/, dawa: /pharm|chemist|medic/,
    juice: /juice|shake/, icecream: /ice ?cream|amul/, gym: /gym|fitness/, basketball: /basketball/,
}

export function nearest(places: BrainPlace[], cat: string, origin: { lat: number; lng: number }, keywords: string[] = [], limit = 3): Hit[] {
    let pool = places.filter(p => p.cat === cat)
    const kw = keywords.filter(k => k.length >= 3 && !GENERIC.has(k) && !HINTS[k])
    if (kw.length) {
        const narrowed = places.filter(p => kw.some(k => norm(p.name).split(' ').some(w => w.startsWith(k))))
        if (narrowed.length) pool = narrowed
    }
    const hint = keywords.map(k => HINTS[k]).find(Boolean)
    if (hint) {
        const narrowed = pool.filter(p => hint.test(norm(p.name)))
        if (narrowed.length) pool = narrowed
    }
    const seen = new Set<string>()
    return pool
        .map(p => toHit(p, origin.lat, origin.lng))
        .sort((a, b) => a.dist - b.dist)
        .filter(h => { const k = norm(h.name); if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, limit)
}

const LANDMARK_RANK: Record<string, number> = { gate: 0, library: 0, department: 1, park: 1, playground: 1, building: 2, hostel: 3, food: 3, 'atm & bank': 4, medical: 4, shop: 5, parking: 6 }

/**
 * Places the student will pass along a path (route polyline or a straight
 * origin→destination line). Favours landmarks (blocks, gates, library,
 * fountain) over tiny shops, keeps them in walking order.
 */
export function landmarksAlong(path: LngLat[], places: BrainPlace[], opts: { excludeId?: string; radius?: number; limit?: number } = {}): Hit[] {
    const radius = opts.radius ?? 35, limit = opts.limit ?? 4
    if (path.length < 2) return []
    const lat0 = path[0][1], kx = M * Math.cos(lat0 * Math.PI / 180)
    const pts = path.map(([lng, lat]) => [(lng - path[0][0]) * kx, (lat - lat0) * M])
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    const total = cum[cum.length - 1]
    if (total < 30) return []
    const cands: { h: Hit; along: number; rank: number }[] = []
    for (const p of places) {
        if (p.id === opts.excludeId) continue
        const x = (p.lng - path[0][0]) * kx, y = (p.lat - lat0) * M
        let best = Infinity, along = 0
        for (let i = 1; i < pts.length; i++) {
            const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
            const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1
            const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2))
            const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
            if (d < best) { best = d; along = cum[i - 1] + t * Math.sqrt(L2) }
        }
        if (best > radius || along < 25 || along > total - 25) continue
        const rank = (LANDMARK_RANK[p.cat] ?? 5) + best / radius
        cands.push({ h: { id: p.id, name: shortName(p.name), cat: p.cat, lat: p.lat, lng: p.lng, dist: Math.round(along) }, along, rank })
    }
    cands.sort((a, b) => a.rank - b.rank)
    const picked: typeof cands = []
    const names = new Set<string>()
    for (const c of cands) {
        const k = norm(c.h.name).slice(0, 10)
        if (names.has(k) || picked.some(q => Math.abs(q.along - c.along) < 18)) continue
        names.add(k); picked.push(c)
        if (picked.length >= limit) break
    }
    return picked.sort((a, b) => a.along - b.along).map(c => c.h)
}

/** Understand a message and answer it from real campus data. */
export function think(message: string, places: BrainPlace[], origin: { lat: number; lng: number }): Answer {
    let q = norm(message)
    for (const [re, to] of ALIASES) q = q.replace(re, to)
    const words = q.split(' ').filter(Boolean)
    const code = blockCode(q)
    const qTokens = words.filter(w => !STOP.has(w))
    const query = qTokens.join(' ')
    const category = words.map(w => CAT_WORDS[w]).find(Boolean) || (/\bice cream\b/.test(q) ? 'food' : undefined)
    const wantsNear = NEAR_RE.test(q)
    const wantsInfo = INFO_RE.test(q) && !NAV_RE.test(q)
    const wantsNav = NAV_RE.test(q)

    if (!query && !category && !code) return { intent: 'hello', query }
    if (HELLO_RE.test(q) && qTokens.length <= 1 && !category && !code) return { intent: 'hello', query }

    const scored = scorePlaces(code ? [] : qTokens, code, places)
    const top = scored[0]
    const onlyGeneric = !code && qTokens.every(t => GENERIC.has(t) || CAT_WORDS[t])

    const go = (p: BrainPlace, list?: Hit[]): Answer => {
        const place = toHit(p, origin.lat, origin.lng)
        const est = walkEstimate(place.dist)
        const way = landmarksAlong([[origin.lng, origin.lat], [p.lng, p.lat]], places, { excludeId: p.id, radius: 45, limit: 3 })
        return { intent: 'navigate', query, category, place, list, way, ...est }
    }
    const info = (p: BrainPlace): Answer => {
        const place = toHit(p, origin.lat, origin.lng)
        const nearby = places
            .filter(o => o.id !== p.id && meters(p.lat, p.lng, o.lat, o.lng) < 90)
            .map(o => ({ ...toHit(o, p.lat, p.lng) }))
            .sort((a, b) => (LANDMARK_RANK[a.cat] ?? 5) - (LANDMARK_RANK[b.cat] ?? 5) || a.dist - b.dist)
            .filter((h, i, arr) => arr.findIndex(x => norm(x.name) === norm(h.name)) === i)
            .slice(0, 2)
        return { intent: 'info', query, category, place, nearby, ...walkEstimate(place.dist) }
    }

    // "nearest cafe", "pizza near me", "ATM kidhar hai" (category-only)
    if (category && (wantsNear || onlyGeneric || (!top || top.s < 70))) {
        const list = nearest(places, category, origin, qTokens)
        if (!list.length) return { intent: 'notFound', query: query || category, category }
        const first = places.find(p => p.id === list[0].id)!
        if (wantsNav && !wantsNear) return go(first, list)
        return { intent: 'nearest', query, category, list }
    }
    if (top && (top.s >= 70 || (code && top.s > 0))) return wantsInfo ? info(top.p) : go(top.p)
    if (top && top.s >= 50) return wantsInfo ? info(top.p) : go(top.p)
    return { intent: 'notFound', query: query || message.trim().slice(0, 40) }
}

const CAT_LABEL: Record<string, string> = {
    food: 'food', 'atm & bank': 'ATM & bank', medical: 'medical', shop: 'shop', library: 'library', hostel: 'hostel',
    parking: 'parking', playground: 'sports', gate: 'gate', department: 'academic', park: 'park', building: 'campus',
}
export const catLabel = (c: string) => CAT_LABEL[c] || c

export function joinNames(names: string[]) {
    if (names.length <= 1) return names[0] || ''
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Offline, in-character reply built only from the answer's facts. */
export function composeReply(g: Guide, a: Answer): string {
    switch (a.intent) {
        case 'hello': return g.t.hello
        case 'notFound': return fill(g.t.notFound, { query: a.query })
        case 'nearest': return fill(g.t.near, { list: joinNames((a.list || []).map(h => `${h.name} (${walkEstimate(h.dist).dist} m)`)) })
        case 'info': {
            const near = a.nearby?.length ? `Right next to ${joinNames(a.nearby.map(h => h.name))}. ` : ''
            return fill(g.t.info, { place: a.place!.name, cat: catLabel(a.place!.cat), near })
        }
        case 'navigate': {
            const nav = fill(g.t.nav, { dest: a.place!.name, dist: a.dist, min: a.min })
            const way = a.way?.length ? fill(g.t.way, { way: joinNames(a.way.map(h => h.name)) }) : g.t.noWay
            return `${nav} ${way}`
        }
    }
}

/** Plain-text facts for the LLM (it must only use these). */
export function factsFor(a: Answer): string {
    const L: string[] = [`INTENT: ${a.intent}`]
    if (a.query) L.push(`USER ASKED FOR: ${a.query}`)
    if (a.place) L.push(`DESTINATION: ${a.place.name} (${catLabel(a.place.cat)})`)
    if (a.dist) L.push(`WALK: about ${a.dist} metres, ${a.min} minutes`)
    if (a.way?.length) L.push(`YOU WILL PASS (in order): ${a.way.map(h => h.name).join(' → ')}`)
    if (a.intent === 'navigate' && !a.way?.length) L.push('ON THE WAY: nothing notable, fairly straight path')
    if (a.list?.length) L.push(`NEAREST OPTIONS: ${a.list.map(h => `${h.name} (${walkEstimate(h.dist).dist} m)`).join('; ')}`)
    if (a.nearby?.length) L.push(`NEXT TO IT: ${a.nearby.map(h => h.name).join(', ')}`)
    if (a.intent === 'notFound') L.push('RESULT: no matching campus place found')
    if (a.intent === 'hello') L.push('RESULT: greeting; offer help finding places, routes, nearest food/ATM/library')
    if (a.intent === 'navigate') L.push('The map is now drawing the route and the student can summon the floating guide.')
    return L.join('\n')
}

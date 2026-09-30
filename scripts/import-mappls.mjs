/**
 * One-off importer: finds campus POIs via Mappls search, triangulates their
 * coordinates from distances returned for several reference points, keeps
 * those inside the campus boundary, and (with --write) saves them as APPROVED
 * places. Usage:  node scripts/import-mappls.mjs          (dry run → mappls-import.json)
 *                 node scripts/import-mappls.mjs --write  (insert into DB)
 */
import 'dotenv/config'
import fs from 'node:fs'
import pg from 'pg'

const K = process.env.MAPPLS_API_KEY
if (!K) { console.error('MAPPLS_API_KEY missing'); process.exit(1) }
const WRITE = process.argv.includes('--write')
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Campus boundary from the app's own geometry file
const geoSrc = fs.readFileSync(new URL('../src/lib/map/campusGeo.ts', import.meta.url), 'utf8')
const BOUNDARY = JSON.parse(geoSrc.match(/CU_CAMPUS_BOUNDARY[^=]*=\s*(\[[\s\S]*?\n\])/)[1].replace(/,\s*\]/g, ']'))
const inPoly = (lng, lat) => {
    let inside = false
    for (let i = 0, j = BOUNDARY.length - 1; i < BOUNDARY.length; j = i++) {
        const [xi, yi] = BOUNDARY[i], [xj, yj] = BOUNDARY[j]
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

// keyword → app category name
const SEARCHES = [
    ['cafe', 'food'], ['restaurant', 'food'], ['food', 'food'], ['canteen', 'food'], ['bakery', 'food'],
    ['juice', 'food'], ['ice cream', 'food'], ['fast food', 'food'], ['mess', 'food'], ['tea', 'food'],
    ['library', 'Library'], ['atm', 'ATM & Bank'], ['bank', 'ATM & Bank'],
    ['pharmacy', 'Medical'], ['medical', 'Medical'], ['hospital', 'Medical'], ['clinic', 'Medical'],
    ['stationery', 'Shop'], ['photocopy', 'Shop'], ['book store', 'Shop'], ['general store', 'Shop'], ['salon', 'Shop'],
    ['gym', 'Playground'], ['sports', 'Playground'], ['stadium', 'Playground'],
    ['parking', 'parking'], ['auditorium', 'building'], ['post office', 'building'],
]

const CENTER = [30.7699, 76.5766]
const REFS = [[30.7745, 76.5715], [30.7745, 76.5820], [30.7640, 76.5715], [30.7640, 76.5820]]
const M = 111320, KX = M * Math.cos(CENTER[0] * Math.PI / 180)

async function api(path, params) {
    const qs = new URLSearchParams({ ...params, access_token: K })
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const r = await fetch(`https://search.mappls.com/search/places/${path}/json?${qs}`, { signal: AbortSignal.timeout(15000) })
            if (r.status === 429) { await sleep(1500); continue }
            if (!r.ok) return null
            return await r.json()
        } catch { await sleep(500) }
    }
    return null
}

// 1) Discover
const found = new Map()
for (const [kw, cat] of SEARCHES) {
    for (let page = 1; page <= 5; page++) {
        const j = await api('nearby', { keywords: kw, refLocation: CENTER.join(','), radius: '1400', page: String(page) })
        await sleep(120)
        const list = j?.suggestedLocations || []
        for (const s of list) {
            if (s.distance > 1400 || found.has(s.eLoc)) continue
            found.set(s.eLoc, { eLoc: s.eLoc, name: s.placeName.trim(), address: s.placeAddress, category: cat, d: [[...CENTER, s.distance]] })
        }
        if (!j || page >= (j.pageInfo?.totalPages || 1)) break
    }
    process.stdout.write(`${kw}… ${found.size}\r`)
}
console.log(`\ndiscovered ${found.size} POIs within 1.4 km`)

// 2) Distances from other reference points (autosuggest of the exact name)
for (const p of found.values()) {
    for (const ref of REFS) {
        const j = await api('autosuggest', { query: p.name, location: ref.join(',') })
        await sleep(100)
        const hit = (j?.suggestedLocations || []).find(s => s.eLoc === p.eLoc && Number.isFinite(s.distance))
        if (hit) p.d.push([...ref, hit.distance])
    }
}

// 3) Trilaterate (Gauss–Newton, local metres)
function solve(d) {
    const P = d.map(([la, lo, r]) => [(lo - CENTER[1]) * KX, (la - CENTER[0]) * M, r])
    let x = 0, y = 0
    for (let it = 0; it < 80; it++) {
        let a = 0, b = 0, c = 0, g1 = 0, g2 = 0
        for (const [px, py, r] of P) {
            const dx = x - px, dy = y - py, dd = Math.hypot(dx, dy) || 1e-6, res = dd - r
            const jx = dx / dd, jy = dy / dd
            a += jx * jx; b += jx * jy; c += jy * jy; g1 += jx * res; g2 += jy * res
        }
        const det = a * c - b * b
        if (Math.abs(det) < 1e-9) break
        x -= (c * g1 - b * g2) / det; y -= (a * g2 - b * g1) / det
    }
    const rms = Math.sqrt(P.reduce((s, [px, py, r]) => s + (Math.hypot(x - px, y - py) - r) ** 2, 0) / P.length)
    return { lat: CENTER[0] + y / M, lng: CENTER[1] + x / KX, rms }
}

const results = []
for (const p of found.values()) {
    if (p.d.length < 3) continue
    const s = solve(p.d)
    if (s.rms > 20 || !inPoly(s.lng, s.lat)) continue
    results.push({ name: p.name.replace(/,?\s*Chandigarh University$/i, '').trim() || p.name, category: p.category, lat: +s.lat.toFixed(6), lng: +s.lng.toFixed(6), rms: +s.rms.toFixed(1), eLoc: p.eLoc, refs: p.d.length })
}
results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
fs.writeFileSync('mappls-import.json', JSON.stringify(results, null, 2))
console.log(`${results.length} inside campus (triangulated) → mappls-import.json`)
for (const r of results) console.log(`  ${r.category.padEnd(11)} ${r.name}  (${r.lat}, ${r.lng}) ±${r.rms}m`)

if (!WRITE) process.exit(0)

// 4) Save
const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
const { rows: admins } = await db.query(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1`)
if (!admins.length) throw new Error('No admin user to own imported places')
const owner = admins[0].id
const { rows: existing } = await db.query(`SELECT name, latitude, longitude FROM places`)
const near = (a, b) => Math.hypot((a.lng - b.longitude) * KX, (a.lat - b.latitude) * M)
let added = 0, skipped = 0
for (const r of results) {
    const dup = existing.some(e => e.name.trim().toLowerCase() === r.name.toLowerCase() || (e.latitude != null && near(r, e) < 8 && e.name.toLowerCase().slice(0, 5) === r.name.toLowerCase().slice(0, 5)))
    if (dup) { skipped++; continue }
    let { rows: cat } = await db.query(`SELECT id FROM place_categories WHERE lower("categoryName") = lower($1) LIMIT 1`, [r.category])
    if (!cat.length) ({ rows: cat } = await db.query(`INSERT INTO place_categories (id, "categoryName", "updatedAt") VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`, [r.category]))
    const { rows: p } = await db.query(
        `INSERT INTO places (id, name, description, "categoryId", latitude, longitude, "createdById", "approvalStatus", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'APPROVED', NOW()) RETURNING id`,
        [r.name, `Imported from Mappls (${r.eLoc})`, cat[0].id, r.lat, r.lng, owner])
    await db.query(`INSERT INTO approvals (id, "placeId", "adminId", status, "reviewedAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'APPROVED', NOW(), NOW()) ON CONFLICT ("placeId") DO NOTHING`, [p[0].id, owner])
    existing.push({ name: r.name, latitude: r.lat, longitude: r.lng })
    added++
}
console.log(`saved ${added}, skipped ${skipped} duplicates`)
await db.end()

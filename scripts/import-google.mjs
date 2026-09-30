/**
 * One-off importer using Google Places API (New): searches the campus area by
 * place type and by keyword, keeps results inside the campus boundary, and
 * (with --write) saves them as APPROVED places, skipping duplicates.
 *
 *   node scripts/import-google.mjs          dry run → google-import.json
 *   node scripts/import-google.mjs --write  insert into the DB
 *
 * Needs GOOGLE_MAPS_API_KEY in .env.local with "Places API (New)" enabled.
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })
import pg from 'pg'

const KEY = process.env.GOOGLE_MAPS_API_KEY
if (!KEY) { console.error('GOOGLE_MAPS_API_KEY missing in .env.local'); process.exit(1) }
const WRITE = process.argv.includes('--write')
const sleep = ms => new Promise(r => setTimeout(r, ms))

const geoSrc = fs.readFileSync(new URL('../src/lib/map/campusGeo.ts', import.meta.url), 'utf8')
const BOUNDARY = JSON.parse(geoSrc.match(/CU_CAMPUS_BOUNDARY[^=]*=\s*(\[[\s\S]*?\n\])/)[1].replace(/,\s*\]/g, ']'))
const inCampus = (lng, lat) => {
    let inside = false
    for (let i = 0, j = BOUNDARY.length - 1; i < BOUNDARY.length; j = i++) {
        const [xi, yi] = BOUNDARY[i], [xj, yj] = BOUNDARY[j]
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
}

// Google primary type → app category
function categoryFor(types = []) {
    const t = new Set(types)
    const has = (...k) => k.some(x => t.has(x))
    if (has('library')) return 'Library'
    if (has('atm', 'bank')) return 'ATM & Bank'
    if (has('pharmacy', 'drugstore', 'hospital', 'doctor', 'medical_clinic', 'dentist')) return 'Medical'
    if (has('parking')) return 'parking'
    if (has('gym', 'fitness_center', 'stadium', 'sports_complex', 'athletic_field', 'playground', 'swimming_pool')) return 'Playground'
    if (has('lodging', 'dormitory')) return 'Hostel'
    if (has('restaurant', 'cafe', 'coffee_shop', 'bakery', 'meal_takeaway', 'fast_food_restaurant', 'food', 'ice_cream_shop', 'juice_shop', 'food_court', 'tea_house')) return 'food'
    if (has('store', 'book_store', 'supermarket', 'convenience_store', 'clothing_store', 'hair_salon', 'beauty_salon', 'shopping_mall')) return 'Shop'
    if (has('university', 'school', 'secondary_school')) return 'department'
    if (has('park')) return 'park'
    return 'building'
}

const FIELDS = 'places.id,places.displayName,places.location,places.types,places.primaryType,places.formattedAddress'
async function call(path, body) {
    for (let a = 0; a < 3; a++) {
        const r = await fetch(`https://places.googleapis.com/v1/places:${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELDS + (path === 'searchText' ? ',nextPageToken' : '') },
            body: JSON.stringify(body),
        })
        if (r.status === 429) { await sleep(2000); continue }
        const j = await r.json()
        if (!r.ok) { console.error(`\n${path} ${r.status}:`, j.error?.message); if (r.status === 403 || r.status === 400) process.exit(1); return {} }
        return j
    }
    return {}
}

const found = new Map()
const add = p => { if (p?.id && !found.has(p.id)) found.set(p.id, p) }

// 1) Nearby search on a grid of circles covering campus (max 20 results per call)
const TYPE_GROUPS = [
    ['restaurant', 'cafe', 'coffee_shop', 'bakery', 'meal_takeaway', 'fast_food_restaurant'],
    ['atm', 'bank', 'pharmacy', 'hospital', 'doctor', 'library'],
    ['parking', 'gym', 'stadium', 'sports_complex', 'book_store', 'convenience_store'],
    ['store', 'supermarket', 'hair_salon', 'lodging', 'university', 'park'],
]
const GRID = []
for (let lat = 30.7640; lat <= 30.7760; lat += 0.0030) for (let lng = 76.5690; lng <= 76.5830; lng += 0.0035) GRID.push([lat, lng])
for (const [i, [lat, lng]] of GRID.entries()) {
    for (const includedTypes of TYPE_GROUPS) {
        const j = await call('searchNearby', { includedTypes, maxResultCount: 20, locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: 260 } } })
        ;(j.places || []).forEach(add)
        await sleep(80)
    }
    process.stdout.write(`grid ${i + 1}/${GRID.length} → ${found.size}\r`)
}

// 2) Text search for campus-specific things nearby search misses
const QUERIES = ['canteen Chandigarh University', 'mess Chandigarh University', 'library Chandigarh University', 'stationery Chandigarh University',
    'photocopy Chandigarh University', 'hostel Chandigarh University', 'block Chandigarh University Gharuan', 'food court Chandigarh University',
    'juice Chandigarh University', 'auditorium Chandigarh University']
for (const textQuery of QUERIES) {
    let pageToken
    for (let page = 0; page < 3; page++) {
        const j = await call('searchText', { textQuery, pageSize: 20, pageToken, locationRestriction: { rectangle: { low: { latitude: 30.7620, longitude: 76.5670 }, high: { latitude: 30.7775, longitude: 76.5840 } } } })
        ;(j.places || []).forEach(add)
        pageToken = j.nextPageToken
        if (!pageToken) break
        await sleep(1500)
    }
}
console.log(`\nfound ${found.size} places in the search area`)

const results = [...found.values()]
    .filter(p => p.location && inCampus(p.location.longitude, p.location.latitude))
    .map(p => ({
        name: (p.displayName?.text || '').replace(/,?\s*Chandigarh University.*$/i, '').trim() || p.displayName?.text,
        category: categoryFor(p.types),
        lat: +p.location.latitude.toFixed(6), lng: +p.location.longitude.toFixed(6),
        googleId: p.id, type: p.primaryType || '',
    }))
    .filter(r => r.name && !/^chandigarh university$/i.test(r.name))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
fs.writeFileSync('google-import.json', JSON.stringify(results, null, 2))
const byCat = results.reduce((m, r) => (m[r.category] = (m[r.category] || 0) + 1, m), {})
console.log(`${results.length} inside campus → google-import.json`, byCat)

if (!WRITE) process.exit(0)

const M = 111320, KX = M * Math.cos(30.77 * Math.PI / 180)
const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
await db.connect()
const { rows: admins } = await db.query(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY "createdAt" LIMIT 1`)
const owner = admins[0]?.id
if (!owner) throw new Error('No admin user to own imported places')
const { rows: existing } = await db.query(`SELECT name, latitude, longitude, description FROM places`)
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
let added = 0, skipped = 0
for (const r of results) {
    const dup = existing.some(e =>
        (e.description || '').includes(r.googleId) ||
        (e.latitude != null && Math.hypot((r.lng - e.longitude) * KX, (r.lat - e.latitude) * M) < 35 &&
            (norm(e.name).includes(norm(r.name).slice(0, 6)) || norm(r.name).includes(norm(e.name).slice(0, 6)))))
    if (dup) { skipped++; continue }
    let { rows: cat } = await db.query(`SELECT id FROM place_categories WHERE lower("categoryName") = lower($1) LIMIT 1`, [r.category])
    if (!cat.length) ({ rows: cat } = await db.query(`INSERT INTO place_categories (id, "categoryName", "updatedAt") VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`, [r.category]))
    const { rows: p } = await db.query(
        `INSERT INTO places (id, name, description, "categoryId", latitude, longitude, "createdById", "approvalStatus", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'APPROVED', NOW()) RETURNING id`,
        [r.name, `Data © Google (${r.googleId})`, cat[0].id, r.lat, r.lng, owner])
    await db.query(`INSERT INTO approvals (id, "placeId", "adminId", status, "reviewedAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, 'APPROVED', NOW(), NOW()) ON CONFLICT ("placeId") DO NOTHING`, [p[0].id, owner])
    existing.push({ name: r.name, latitude: r.lat, longitude: r.lng, description: r.googleId })
    added++
}
console.log(`saved ${added}, skipped ${skipped} duplicates (incl. ones already imported from Mappls)`)
await db.end()

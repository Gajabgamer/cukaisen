/**
 * One-off importer via Apify's Google Maps scraper (compass/crawler-google-places).
 * Searches only inside the Chandigarh University campus polygon, then
 * (with --write) saves results as APPROVED places, skipping duplicates.
 *
 *   node scripts/import-apify.mjs          dry run → google-import.json
 *   node scripts/import-apify.mjs --write  insert into the DB
 *
 * Needs APIFY_TOKEN in .env.local.
 */
import dotenv from 'dotenv'
import fs from 'node:fs'
dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ path: '.env', quiet: true })
import pg from 'pg'

const TOKEN = process.env.APIFY_TOKEN
if (!TOKEN) { console.error('APIFY_TOKEN missing in .env.local'); process.exit(1) }
const WRITE = process.argv.includes('--write')
const REUSE = process.argv.includes('--reuse') // skip scraping, reuse google-import-raw.json
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

// Google Maps category text → app category
function categoryFor(cats = []) {
    const s = cats.join(' | ').toLowerCase()
    const has = (...k) => k.some(x => s.includes(x))
    if (has('library')) return 'Library'
    if (has('atm', 'bank')) return 'ATM & Bank'
    if (has('pharmacy', 'chemist', 'hospital', 'clinic', 'doctor', 'dentist', 'medical')) return 'Medical'
    if (has('parking')) return 'parking'
    if (has('restaurant', 'cafe', 'café', 'coffee', 'bakery', 'food', 'canteen', 'juice', 'tea', 'snack', 'ice cream', 'pizza', 'dhaba', 'mess')) return 'food'
    if (has('gym', 'fitness', 'stadium', 'sports', 'playground', 'swimming', 'basketball', 'ground')) return 'Playground'
    if (has('hostel', 'dormitory', 'lodging', 'guest house', 'hotel', ' pg')) return 'Hostel'
    if (has('store', 'shop', 'stationery', 'supermarket', 'salon', 'photocopy', 'print', 'market')) return 'Shop'
    if (has('university', 'college', 'school', 'department', 'institute', 'education', 'auditorium')) return 'department'
    if (has('park', 'garden')) return 'park'
    return 'building'
}

let raw
if (REUSE && fs.existsSync('google-import-raw.json')) {
    raw = JSON.parse(fs.readFileSync('google-import-raw.json', 'utf8'))
} else {
    const input = {
        searchStringsArray: ['restaurant', 'cafe', 'food', 'canteen', 'mess', 'library', 'atm', 'bank', 'pharmacy', 'hospital',
            'stationery', 'photocopy', 'shop', 'hostel', 'gym', 'sports', 'parking', 'auditorium', 'block', 'juice', 'bakery', 'salon'],
        customGeolocation: { type: 'Polygon', coordinates: [BOUNDARY] },
        maxCrawledPlacesPerSearch: 60,
        language: 'en',
        skipClosedPlaces: false,
        scrapePlaceDetailPage: false,
    }
    const start = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${TOKEN}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    })
    const sj = await start.json()
    if (!start.ok) { console.error('Apify start failed:', start.status, sj.error?.message || sj); process.exit(1) }
    const runId = sj.data.id, datasetId = sj.data.defaultDatasetId
    console.log(`run ${runId} started`)
    let status = sj.data.status
    while (!['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
        await sleep(10000)
        const r = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${TOKEN}`)).json()
        status = r.data.status
        process.stdout.write(`status ${status}          \r`)
    }
    console.log(`\nrun ${status}`)
    raw = await (await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${TOKEN}`)).json()
    fs.writeFileSync('google-import-raw.json', JSON.stringify(raw, null, 2))
}
console.log(`scraped ${raw.length} items`)

const seen = new Set()
const results = raw
    .filter(p => p.location?.lat && p.location?.lng && inCampus(p.location.lng, p.location.lat))
    .filter(p => { const id = p.placeId || p.title; if (seen.has(id)) return false; seen.add(id); return true })
    .map(p => ({
        name: (p.title || '').replace(/,?\s*Chandigarh University.*$/i, '').trim() || p.title,
        category: categoryFor([' ' + p.title, p.categoryName, ...(p.categories || [])].filter(Boolean)),
        lat: +p.location.lat.toFixed(6), lng: +p.location.lng.toFixed(6),
        googleId: p.placeId || '', type: p.categoryName || '',
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
        (r.googleId && (e.description || '').includes(r.googleId)) ||
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
console.log(`saved ${added}, skipped ${skipped} duplicates`)
await db.end()

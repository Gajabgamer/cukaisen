import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin, getCurrentUser } from '@/lib/auth'
import { isValidCoordinates } from '@/utils/validators'

// POST /api/admin/places - Admin "name this block": create or move an APPROVED place.
// Body: { name, description?, category, latitude, longitude }
// Same name (case-insensitive) → the existing place is moved/updated, not duplicated.
export async function POST(req: NextRequest) {
    const user = await getCurrentUser()
    if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const body = await req.json().catch(() => ({}))
        const name = typeof body.name === 'string' ? body.name.trim() : ''
        const description = typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null
        const category = typeof body.category === 'string' ? body.category.trim() : ''
        const latitude = Number(body.latitude), longitude = Number(body.longitude)
        if (!name || name.length > 80 || !category || category.length > 40) {
            return NextResponse.json({ error: 'Name and category are required' }, { status: 400 })
        }
        if (!isValidCoordinates(latitude, longitude)) {
            return NextResponse.json({ error: 'Valid coordinates are required' }, { status: 400 })
        }

        // Find or create the category
        let { rows: cats } = await pool.query(
            `SELECT id FROM place_categories WHERE lower("categoryName") = lower($1) LIMIT 1`, [category])
        if (!cats.length) {
            ;({ rows: cats } = await pool.query(
                `INSERT INTO place_categories (id, "categoryName", "updatedAt") VALUES (gen_random_uuid(), $1, NOW())
                 ON CONFLICT ("categoryName") DO UPDATE SET "updatedAt" = NOW() RETURNING id`, [category]))
        }
        const categoryId = cats[0].id

        const { rows: existing } = await pool.query(
            `SELECT id FROM places WHERE lower(name) = lower($1) ORDER BY "createdAt" LIMIT 1`, [name])
        if (existing.length) {
            const { rows } = await pool.query(
                `UPDATE places SET latitude = $2, longitude = $3, "categoryId" = $4,
                        description = COALESCE($5, description), "approvalStatus" = 'APPROVED', "updatedAt" = NOW()
                  WHERE id = $1 RETURNING *`,
                [existing[0].id, latitude, longitude, categoryId, description])
            return NextResponse.json({ place: rows[0], updated: true })
        }

        const { rows } = await pool.query(
            `INSERT INTO places (id, name, description, "categoryId", latitude, longitude, "createdById", "approvalStatus", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'APPROVED', NOW()) RETURNING *`,
            [name, description, categoryId, latitude, longitude, user.id])
        await pool.query(
            `INSERT INTO approvals (id, "placeId", "adminId", status, "reviewedAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, 'APPROVED', NOW(), NOW()) ON CONFLICT ("placeId") DO NOTHING`,
            [rows[0].id, user.id])
        return NextResponse.json({ place: rows[0], updated: false }, { status: 201 })
    } catch (e) {
        console.error('Admin name block error:', e)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// GET /api/admin/places - All places (any status) for admin management
export async function GET() {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { rows } = await pool.query(`
            SELECT p.*, 
                to_jsonb(pc.*) as category,
                to_jsonb(b.*) as block,
                jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) as "createdBy"
            FROM places p
            LEFT JOIN place_categories pc ON p."categoryId" = pc.id
            LEFT JOIN blocks b ON p."blockId" = b.id
            LEFT JOIN users u ON p."createdById" = u.id
            ORDER BY p."createdAt" DESC
        `)
        return NextResponse.json({ places: rows })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE /api/admin/places - Delete a place
export async function DELETE(req: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { placeId } = await req.json()
        await pool.query(`DELETE FROM places WHERE id = $1`, [placeId])
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PATCH /api/admin/places - Update approval status directly
export async function PATCH(req: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { placeId, approvalStatus } = await req.json()
        const { rows } = await pool.query(
            `UPDATE places SET "approvalStatus" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
            [approvalStatus, placeId]
        )
        return NextResponse.json({ place: rows[0] })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}


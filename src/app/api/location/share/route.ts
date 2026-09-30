import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'
import { isValidCoordinates } from '@/utils/validators'
import { LIVE_LOCATION_CONFIG } from '@/utils/constants'

const SQUAD_RE = /^[A-Z0-9]{4,8}$/

// POST /api/location/share
//   start:  { latitude, longitude, squadCode, durationMinutes }  → new share with a fresh expiry
//   update: { latitude, longitude, squadCode, update: true }     → move the pin, keep the expiry
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

        const body = await request.json().catch(() => ({}))
        const latitude = Number(body.latitude)
        const longitude = Number(body.longitude)
        const squadCode = typeof body.squadCode === 'string' ? body.squadCode.toUpperCase() : ''

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !isValidCoordinates(latitude, longitude)) {
            return NextResponse.json({ error: 'Valid latitude and longitude are required' }, { status: 400 })
        }
        if (!SQUAD_RE.test(squadCode)) {
            return NextResponse.json({ error: 'A valid squad code is required' }, { status: 400 })
        }

        if (body.update) {
            const { rows } = await pool.query(
                `UPDATE live_locations
                    SET latitude = $2, longitude = $3, "updatedAt" = NOW()
                  WHERE "userId" = $1 AND "squadCode" = $4 AND "expiresAt" > NOW()
                  RETURNING "expiresAt"`,
                [user.id, latitude, longitude, squadCode]
            )
            if (!rows.length) return NextResponse.json({ error: 'Share expired' }, { status: 410 })
            return NextResponse.json({ expiresAt: rows[0].expiresAt })
        }

        const duration = Math.max(1, Math.min(
            Number(body.durationMinutes) || LIVE_LOCATION_CONFIG.defaultDurationMinutes,
            LIVE_LOCATION_CONFIG.maxDurationMinutes
        ))
        const expiresAt = new Date(Date.now() + duration * 60 * 1000)

        // Single statement (atomic): one live share per user
        const { rows } = await pool.query(
            `WITH gone AS (DELETE FROM live_locations WHERE "userId" = $1)
             INSERT INTO live_locations (id, "userId", latitude, longitude, "expiresAt", "squadCode", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
             RETURNING "expiresAt"`,
            [user.id, latitude, longitude, expiresAt.toISOString(), squadCode]
        )
        return NextResponse.json({ message: 'Location shared', expiresAt: rows[0].expiresAt })
    } catch (error) {
        console.error('Error sharing location:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// DELETE - Stop sharing location
export async function DELETE() {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        await pool.query(`DELETE FROM live_locations WHERE "userId" = $1`, [user.id])
        return NextResponse.json({ message: 'Location sharing stopped' })
    } catch (error) {
        console.error('Error stopping location share:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export const runtime = 'edge'

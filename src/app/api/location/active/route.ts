import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'

const SQUAD_RE = /^[A-Z0-9]{4,8}$/

// GET /api/location/active?squad=CODE
// Returns live locations for ONE squad, and only if the caller is actively
// sharing in that squad themselves (mutual sharing — no silent watchers).
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

        const squad = (request.nextUrl.searchParams.get('squad') || '').toUpperCase()
        if (!SQUAD_RE.test(squad)) return NextResponse.json({ error: 'A valid squad code is required' }, { status: 400 })

        const { rows } = await pool.query(
            `SELECT ll."userId" AS "userId", u.name AS name, ll.latitude, ll.longitude,
                    ll."expiresAt" AS "expiresAt", ll."updatedAt" AS "updatedAt"
               FROM live_locations ll
               JOIN users u ON ll."userId" = u.id
              WHERE ll."squadCode" = $1 AND ll."expiresAt" > NOW()
                AND EXISTS (SELECT 1 FROM live_locations me
                             WHERE me."userId" = $2 AND me."squadCode" = $1 AND me."expiresAt" > NOW())
              ORDER BY u.name`,
            [squad, user.id]
        )
        return NextResponse.json({ me: user.id, locations: rows })
    } catch (error) {
        console.error('Error fetching active locations:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// Node runtime: a shared Neon Pool hangs across Edge invocations
export const runtime = 'nodejs'

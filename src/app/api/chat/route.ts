import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getGuide } from '@/lib/guides'
import { think, composeReply, factsFor, type BrainPlace } from '@/lib/guideBrain'
import { CU_CENTER } from '@/lib/map/campusGeo'

/**
 * POST /api/chat — in-character campus guide.
 * Body: { message, guideId, origin?: {lat,lng}, history?: {role,content}[] }
 * Facts (places, distances, landmarks on the way) always come from the DB via
 * guideBrain. If GROQ_API_KEY is set, Groq rewrites the reply in the guide's
 * voice using only those facts; otherwise a scripted in-character line is used.
 */

let cache: { at: number; places: BrainPlace[] } | null = null
async function loadPlaces(): Promise<BrainPlace[]> {
    if (cache && Date.now() - cache.at < 60_000) return cache.places
    const { rows } = await pool.query(
        `SELECT p.id, p.name, p.latitude, p.longitude, lower(pc."categoryName") AS cat
           FROM places p LEFT JOIN place_categories pc ON p."categoryId" = pc.id
          WHERE p."approvalStatus" = 'APPROVED' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL`)
    const places = rows.map((r: { id: string; name: string; latitude: number; longitude: number; cat: string | null }) => ({
        id: r.id, name: r.name, lat: Number(r.latitude), lng: Number(r.longitude), cat: r.cat || 'building',
    }))
    cache = { at: Date.now(), places }
    return places
}

const MAX_MSG = 300
type Turn = { role: 'user' | 'assistant'; content: string }

async function groqVoice(persona: string, name: string, facts: string, fallback: string, message: string, history: Turn[]): Promise<string | null> {
    const key = process.env.GROQ_API_KEY
    if (!key) return null
    const system = `${persona}

You are ${name}, acting as a campus navigation guide inside "THE VEIL", a Jujutsu Kaisen themed map of Chandigarh University.
STRICT RULES:
- Use ONLY the facts in CAMPUS DATA. Never invent places, distances, times, opening hours or directions.
- Mention every place listed under "YOU WILL PASS" in order, if present.
- Stay fully in character, 2-4 short sentences, no markdown, no lists, no emojis spam.
- If the user writes Hinglish, you may reply with light Hinglish.
- Stay on campus navigation; politely deflect anything unrelated, in character.`
    try {
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 8000)
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: ctrl.signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                temperature: 0.7,
                max_tokens: 220,
                messages: [
                    { role: 'system', content: system },
                    ...history.slice(-4),
                    { role: 'user', content: message },
                    { role: 'system', content: `CAMPUS DATA:\n${facts}\n\nReference line (same facts, you may restyle): ${fallback}` },
                ],
            }),
        })
        clearTimeout(timer)
        if (!r.ok) return null
        const j = await r.json()
        let text: string = j.choices?.[0]?.message?.content?.trim() || ''
        text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        return text || null
    } catch {
        return null
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MSG) : ''
        if (!message) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
        const guide = getGuide(body.guideId)
        const o = body.origin
        const origin = o && Number.isFinite(o.lat) && Number.isFinite(o.lng) && Math.abs(o.lat - CU_CENTER[1]) < 0.05 && Math.abs(o.lng - CU_CENTER[0]) < 0.05
            ? { lat: Number(o.lat), lng: Number(o.lng) }
            : { lat: CU_CENTER[1], lng: CU_CENTER[0] }
        const history: Turn[] = Array.isArray(body.history)
            ? body.history
                .filter((t: Turn) => (t?.role === 'user' || t?.role === 'assistant') && typeof t.content === 'string')
                .slice(-4).map((t: Turn) => ({ role: t.role, content: t.content.slice(0, MAX_MSG) }))
            : []

        const places = await loadPlaces()
        const answer = think(message, places, origin)
        const scripted = composeReply(guide, answer)
        const voiced = await groqVoice(guide.persona, guide.name, factsFor(answer), scripted, message, history)

        return NextResponse.json({
            reply: voiced || scripted,
            ai: !!voiced,
            intent: answer.intent,
            place: answer.place ?? null,
            list: answer.list ?? [],
            way: answer.way ?? [],
            dist: answer.dist ?? null,
            min: answer.min ?? null,
        })
    } catch (e) {
        console.error('chat error', e)
        return NextResponse.json({ error: 'The guide lost focus. Try again.' }, { status: 500 })
    }
}

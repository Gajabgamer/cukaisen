'use client'

import { useState } from 'react'
import Link from 'next/link'
import GlitchText from '@/components/shared/GlitchText'
import CursedArtifactSlot from '@/components/shared/CursedArtifactSlot'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

const STAGES = [
    { label: 'Sense', microcopy: 'Sense the cursed territories around you.', icon: '👁️' },
    { label: 'Traverse', microcopy: "Traverse the path — the veil won't hold forever.", icon: '🥾' },
    { label: 'Reclaim', microcopy: 'Reclaim this territory for the campus.', icon: '🔮' },
] as const

const FIELD_NOTES = [
    {
        caption: 'We discovered new students couldn\'t find the health center during orientation week → therefore we built real-time category search.',
    },
    {
        caption: 'We discovered campus parking fills up fastest near the exam halls → therefore we built live parking availability.',
    },
] as const

const TEAM = [
    { name: 'Campus Nav Team', role: 'Full Stack Development', emoji: '🧑‍💻', description: 'Building a smarter way to navigate Chandigarh University campus.' },
    { name: 'UI/UX Design', role: 'User Experience', emoji: '🎨', description: 'Crafting beautiful, intuitive interfaces for every student.' },
    { name: 'Maps & Data', role: 'GIS & Location', emoji: '🗺️', description: 'Integrating real-time geolocation and 3D campus mapping.' },
]

const TECH_STACK = [
    { name: 'Next.js 15', emoji: '▲', desc: 'React framework' },
    { name: 'MapLibre GL', emoji: '🗺️', desc: '3D WebGL maps' },
    { name: 'PostgreSQL', emoji: '🐘', desc: 'Database on Neon' },
    { name: 'Prisma ORM', emoji: '💎', desc: 'Type-safe DB access' },
    { name: 'OSRM Routing', emoji: '🧭', desc: 'Walking navigation' },
    { name: 'TypeScript', emoji: '🔷', desc: 'Fully typed code' },
]

const FEATURES = [
    { icon: '🏗️', label: 'Real 3D Map' }, { icon: '🧭', label: 'Live Navigation' },
    { icon: '📍', label: 'Community Places' }, { icon: '📸', label: 'Photo Reviews' },
    { icon: '🔍', label: 'Instant Search' }, { icon: '📱', label: 'Mobile Ready' },
]

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!']

export default function AboutPage() {
    const [form, setForm] = useState({ name: '', email: '', message: '', rating: 5 })
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim() || !form.message.trim()) { setError('Name and message are required.'); return }
        setSubmitting(true); setError('')
        try {
            const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
            if (!res.ok) { const d = await res.json(); setError(d.error || 'Something went wrong.') }
            else setSubmitted(true)
        } catch { setError('Network error. Please try again.') }
        finally { setSubmitting(false) }
    }

    const s = {
        bg: 'var(--cn-bg)',
        surface: 'var(--cn-surface)',
        surface2: 'var(--cn-surface-2)',
        border: 'var(--cn-border)',
        text1: 'var(--cn-text-1)',
        text2: 'var(--cn-text-2)',
        text3: 'var(--cn-text-3)',
        navBg: 'var(--cn-nav-bg)',
        navBorder: 'var(--cn-nav-border)',
    }

    const inputStyle: React.CSSProperties = {
        background: s.surface2, border: `1px solid ${s.border}`, color: s.text1,
        width: '100%', padding: '12px 16px', borderRadius: 12, outline: 'none',
        fontSize: 14, transition: 'border 0.2s'
    }

    return (
        <div style={{ minHeight: '100vh', background: s.bg, color: s.text1, transition: 'background 0.3s, color 0.3s' }}>

            {/* ── STICKY NAV ── */}
            <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ background: s.navBg, borderBottom: `1px solid ${s.navBorder}` }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base overflow-hidden bg-white" style={{ boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                            <img src="/logo.png" alt="De-tect Logo" className="w-full h-full object-cover" />
                        </div>
                        <div className="hidden sm:block">
                            <p className="font-bold text-sm leading-none" style={{ color: s.text1 }}>De-tect</p>
                            <p className="text-[10px]" style={{ color: '#6366f1' }}>About & Feedback</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link href="/map" className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-white transition-all hover:opacity-90"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            🗺️ <span>Map</span>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO — "THE VEIL" lore hero with CursedArtifactSlot backdrop ── */}
            <section className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden">
                <div className="absolute inset-0">
                    <CursedArtifactSlot variant="hero" alt="THE VEIL — cursed campus backdrop" />
                </div>
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, rgba(10,7,19,0.35), var(--cn-bg))' }}
                    aria-hidden="true"
                />
                <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center py-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: s.surface2, border: `1px solid ${s.border}`, color: s.text2 }}>
                        ✨ Jujutsu Tech — Kyoto Annex
                    </div>
                    <GlitchText as="h1" className="cn-display text-4xl sm:text-6xl tracking-widest">
                        THE VEIL
                    </GlitchText>
                    <p className="max-w-xl text-sm sm:text-base" style={{ color: s.text2 }}>
                        A cursed mist swept the campus, scrambling every ward and severing the old navigation grid.
                        This is the fieldwork behind restoring it — one territory at a time.
                    </p>
                    <button
                        onClick={() => {
                            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
                            if (isStandalone) {
                                alert("You are already using the De-tect app! 🎉");
                                return;
                            }

                            // @ts-ignore
                            const promptEvent = window.deferredPWAInstallPrompt;
                            if (promptEvent) {
                                promptEvent.prompt();
                                promptEvent.userChoice.then(() => {
                                    // @ts-ignore
                                    window.deferredPWAInstallPrompt = null;
                                });
                            } else {
                                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                                if (isIOS) {
                                    alert("To install on iOS: Tap the Share button (square with arrow) at the bottom, then select 'Add to Home Screen'.");
                                } else {
                                    alert("Install prompt not available. Please use your browser's menu (usually 3 dots at top right) and select 'Install app' or 'Add to Home screen'. If it's already installed, you can open it from your app drawer!");
                                }
                            }
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'var(--cn-accent-purple)', color: '#fff', boxShadow: 'var(--cn-shadow-glow-purple)' }}
                    >
                        <span>📱</span> Download App
                    </button>
                </div>
            </section>

            {/* ── THE INCIDENT ── */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
                <div className="rounded-2xl p-6 sm:p-8" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                    <h2 className="cn-display text-xl sm:text-2xl font-bold mb-4" style={{ color: s.text1 }}>The Incident</h2>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: s.text2 }}>
                        THE VEIL is the cursed mist event that swept Jujutsu Tech&mdash;Kyoto Annex, scrambling every
                        ward and severing the old navigation grid overnight. Buildings that once had clear routes
                        became uncharted territory. Wards that guided students to the cafeteria, the library, the
                        parking gates &mdash; all gone dark at once.
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: s.text2 }}>
                        Restoring navigation isn&apos;t a UI feature here &mdash; it&apos;s fieldwork. Every place you
                        find, every route you walk, is a small act of reclaiming the campus from the mist.
                    </p>
                </div>
            </section>

            {/* ── YOUR ROLE: SENSE → TRAVERSE → RECLAIM ── */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
                <h2 className="cn-display text-xl sm:text-2xl font-bold mb-4 text-center" style={{ color: s.text1 }}>Your Role</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                    {STAGES.map(stage => (
                        <div key={stage.label} className="rounded-2xl flex flex-col items-center gap-2 px-5 py-6 text-center" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                            <span className="text-2xl" aria-hidden="true">{stage.icon}</span>
                            <h3 className="cn-display text-base font-semibold tracking-wide" style={{ color: '#8b5cf6' }}>{stage.label}</h3>
                            <p className="text-xs" style={{ color: s.text3 }}>{stage.microcopy}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── MEET YOUR SENSEI ── */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
                <div className="rounded-2xl p-6 sm:p-8 mb-10" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>🕶️</div>
                        <h2 className="cn-display text-lg sm:text-xl font-bold" style={{ color: s.text1 }}>Meet Your Sensei</h2>
                    </div>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: s.text2 }}>
                        A Special Grade sorcerer, post-Shibuya, technique sealed. Still sharp-tongued and effortlessly
                        confident &mdash; but operating without the power that once defined him, relying on
                        experience and dry wit instead. Referred to only as &quot;the Sensei.&quot;
                    </p>
                    <p className="text-sm italic" style={{ color: s.text3 }} data-testid="about-onboarding-mentor-line">
                        &ldquo;{pickMentorLine('onboarding')}&rdquo;
                    </p>
                </div>
            </section>

            {/* ── FIELD NOTES (Cursed Artifact Mandate gallery) ── */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
                <h2 className="cn-display text-xl sm:text-2xl font-bold mb-4 text-center" style={{ color: s.text1 }}>Field Notes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {FIELD_NOTES.map((note, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                            <div className="relative h-40">
                                <CursedArtifactSlot
                                    variant="gallery"
                                    alt={`Field note ${i + 1}`}
                                    caption={note.caption}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                {/* PITCH COPY TEMPLATE — fill before demo day:
                    "We discovered <real observation about the campus> →
                     therefore we built <specific CampusPath feature>." */}
            </section>

            {/* ── MAIN TWO-COLUMN ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

                    {/* ── LEFT ── */}
                    <div className="flex flex-col gap-6">

                        {/* Mission */}
                        <div className="rounded-2xl p-5 sm:p-7" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>🎯</div>
                                <h2 className="text-base sm:text-lg font-bold" style={{ color: s.text1 }}>Our Mission</h2>
                            </div>
                            <p className="text-sm leading-relaxed mb-5" style={{ color: s.text2 }}>
                                We built De-tect to solve a real problem — newcomers and even seasoned students often struggle to find specific labs, cafeterias and offices across the vast CU campus. With 3D buildings, turn-by-turn walking navigation and a community-driven places database, every campus journey is stress-free.
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {FEATURES.map(f => (
                                    <div key={f.label} className="flex flex-col items-center gap-1.5 rounded-xl py-3 text-center" style={{ background: s.surface2, border: `1px solid ${s.border}` }}>
                                        <span className="text-xl">{f.icon}</span>
                                        <span className="text-[10px] sm:text-xs font-medium" style={{ color: s.text2 }}>{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Team */}
                        <div className="rounded-2xl p-5 sm:p-7" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                            <h2 className="text-base sm:text-lg font-bold mb-4" style={{ color: s.text1 }}>👥 Meet the Team</h2>
                            <div className="flex flex-col gap-3">
                                {TEAM.map(m => (
                                    <div key={m.name} className="flex items-start gap-4 p-4 rounded-xl transition-all hover:scale-[1.01]" style={{ background: s.surface2, border: `1px solid ${s.border}` }}>
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>{m.emoji}</div>
                                        <div>
                                            <p className="font-bold text-sm" style={{ color: s.text1 }}>{m.name}</p>
                                            <p className="text-xs mb-1" style={{ color: '#6366f1' }}>{m.role}</p>
                                            <p className="text-xs leading-relaxed" style={{ color: s.text3 }}>{m.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="rounded-2xl p-5 sm:p-7" style={{ background: s.surface, border: `1px solid ${s.border}` }}>
                            <h2 className="text-base sm:text-lg font-bold mb-4" style={{ color: s.text1 }}>⚙️ Tech Stack</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {TECH_STACK.map(t => (
                                    <div key={t.name} className="flex items-start gap-2.5 p-3.5 rounded-xl" style={{ background: s.surface2, border: `1px solid ${s.border}` }}>
                                        <span className="text-lg flex-shrink-0">{t.emoji}</span>
                                        <div>
                                            <p className="font-semibold text-xs" style={{ color: s.text1 }}>{t.name}</p>
                                            <p className="text-[10px] mt-0.5" style={{ color: s.text3 }}>{t.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Feedback Form (sticky on desktop) ── */}
                    <div className="lg:sticky lg:top-20">
                        <div id="feedback" className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${s.border}`, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
                            {/* Header */}
                            <div className="px-5 sm:px-8 py-5" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">💬</div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Share Your Feedback</h2>
                                        <p className="text-white/70 text-xs mt-0.5">Help us improve De-tect for everyone</p>
                                    </div>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="p-5 sm:p-8" style={{ background: s.surface }}>
                                {submitted ? (
                                    <div className="py-12 text-center">
                                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}>
                                            <span className="text-3xl">🎉</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2" style={{ color: s.text1 }}>Thank you!</h3>
                                        <p className="text-sm" style={{ color: s.text3 }}>Your feedback has been received!</p>
                                        <button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', message: '', rating: 5 }) }}
                                            className="mt-5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90"
                                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                            Submit Another
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {error && (
                                            <div className="flex items-center gap-2 rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                                                ⚠️ {error}
                                            </div>
                                        )}

                                        {/* Star Rating */}
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: s.text3 }}>Your Rating</label>
                                            <div className="flex items-center gap-2">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button key={star} type="button" onClick={() => setForm(f => ({ ...f, rating: star }))}
                                                        className={`text-2xl transition-all ${form.rating >= star ? 'scale-110' : 'opacity-30 hover:opacity-60'}`}>⭐</button>
                                                ))}
                                                <span className="ml-1 text-xs" style={{ color: s.text3 }}>{RATING_LABELS[form.rating]}</span>
                                            </div>
                                        </div>

                                        {/* Name + Email */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: s.text3 }}>Name *</label>
                                                <input style={inputStyle} type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: s.text3 }}>Email <span style={{ color: s.text3, fontWeight: 400 }}>(optional)</span></label>
                                                <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: s.text3 }}>Message *</label>
                                            <textarea style={{ ...inputStyle, resize: 'none' } as React.CSSProperties} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what you think — bugs, ideas, praise..." rows={4} />
                                        </div>

                                        <button type="submit" disabled={submitting || !form.name.trim() || !form.message.trim()}
                                            className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 hover:opacity-90 active:scale-[0.99]"
                                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                                            {submitting
                                                ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Sending...</span>
                                                : 'Send Feedback →'}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                        {/* Footer under form */}
                        <div className="mt-6 text-center">
                            <p className="text-xs" style={{ color: s.text3 }}>Made with ❤️ for Chandigarh University</p>
                            <Link href="/map" className="inline-block mt-2 text-xs font-semibold transition-colors hover:opacity-80" style={{ color: '#6366f1' }}>← Back to Campus Map</Link>
                        </div>

                        {/* ── CREDITS / NON-CANON DISCLAIMER ── */}
                        <div className="mt-8 text-center px-4">
                            <p className="text-[10px] leading-relaxed" style={{ color: s.text3, opacity: 0.6 }}>
                                &quot;THE VEIL&quot; theme is an original, non-commercial fan-work reskin created for a hackathon
                                submission. It is inspired by Jujutsu Kaisen but does not use any copyrighted character
                                names, artwork, video, or audio assets. All lore, copy, and visual effects on this page are
                                original works built for NexaSoul BuildSprint 2026.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from '@/lib/auth-client'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

export default function SetupAdminPage() {
    const { data: session, isPending } = useSession()
    const user = session?.user

    const [targetEmail, setTargetEmail] = useState('')
    const [role, setRole] = useState<'ADMIN' | 'USER'>('ADMIN')
    const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setResult(null)
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/set-role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetEmail, role }),
            })
            const data = await res.json()
            setResult({ ok: res.ok, message: data.message || data.error || 'Unknown response' })
        } catch {
            setResult({ ok: false, message: 'Network error' })
        } finally {
            setIsLoading(false)
        }
    }

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
                <div className="text-center">
                    <p className="text-white/60 mb-4">You must be signed in.</p>
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors font-semibold">
                        Sign In →
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)' }} />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12), transparent)' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        🛡️
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Setup</h1>
                    <p className="text-white/40 mt-1 text-sm">Manage user roles</p>
                </div>

                <div className="cn-glass p-8">

                    <p className="mb-5 text-sm italic" style={{ color: 'var(--cn-text-3)' }} data-testid="auth-setup-admin-mentor-line">
                        {pickMentorLine('authLogin')}
                    </p>

                    {/* Current user banner */}
                    <div className="mb-6 p-3 rounded-2xl flex items-center gap-3"
                        style={{ background: 'var(--cn-accent-purple-glow)', border: '1px solid var(--cn-border)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-accent-purple)' }}>
                            {user.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <p className="text-xs font-semibold" style={{ color: 'var(--cn-text-2)' }}>{user.name}</p>
                            <p className="text-xs" style={{ color: 'var(--cn-text-3)' }}>{user.email}</p>
                        </div>
                    </div>

                    {result && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl p-4 text-sm"
                            style={result.ok
                                ? { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--cn-status-approved)' }
                                : { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--cn-accent-sukuna)' }}>
                            <span className="mt-0.5">{result.ok ? '✅' : '⚠️'}</span>
                            {result.message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>
                                User Email
                            </label>
                            <input
                                type="email"
                                value={targetEmail}
                                onChange={e => setTargetEmail(e.target.value)}
                                required
                                placeholder={user.email ?? 'user@campus.edu'}
                                className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                                style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cn-accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--cn-accent-purple-glow)' }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cn-border)'; e.currentTarget.style.boxShadow = 'none' }}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>
                                Role
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['ADMIN', 'USER'] as const).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className="py-3 rounded-2xl border text-sm font-semibold transition-all"
                                        style={role === r
                                            ? { background: 'var(--cn-accent-purple-glow)', borderColor: 'var(--cn-accent-purple)', color: 'var(--cn-text-1)' }
                                            : { background: 'var(--cn-surface-2)', borderColor: 'var(--cn-border)', color: 'var(--cn-text-3)' }
                                        }
                                    >
                                        {r === 'ADMIN' ? '🛡️ Admin' : '👤 User'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
                            style={{ background: 'var(--cn-accent-purple)', boxShadow: 'var(--cn-shadow-glow-purple)' }}
                        >
                            {isLoading ? 'Applying...' : `Set as ${role} →`}
                        </button>
                    </form>

                    <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--cn-border-soft)' }}>
                        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--cn-text-3)' }}>
                            <span>💡</span>
                            <p>If no admin exists yet, you can promote yourself. Afterwards only admins can change roles.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    <Link href="/map" className="text-xs transition-colors" style={{ color: 'var(--cn-text-3)' }}>
                        ← Back to Map
                    </Link>
                </div>
            </div>
        </div>
    )
}

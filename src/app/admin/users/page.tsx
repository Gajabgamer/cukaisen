'use client'

import { useState, useEffect } from 'react'

interface User { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; createdAt: string }

export default function UsersAdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/users')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to manage users.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setUsers(d.users || []))
            .catch(() => setError('Failed to load users.'))
            .finally(() => setLoading(false))
    }, [])

    const changeRole = async (userId: string, role: 'USER' | 'ADMIN') => {
        if (!confirm(`Change this user's role to ${role}?`)) return
        setProcessing(userId)
        const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
        const data = await res.json()
        if (res.ok) setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
        setProcessing(null)
    }

    const filtered = users.filter(u =>
        !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="cn-display text-2xl font-bold" style={{ color: 'var(--cn-text-1)' }}>Users</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cn-text-3)' }}>{users.length} registered accounts</p>
                </div>
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                className="w-full mb-5 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)', color: 'var(--cn-text-1)' }} />

            {error ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cn-accent-sukuna)' }}>Access Denied</h3>
                    <p style={{ color: 'var(--cn-accent-sukuna)', opacity: 0.7 }}>{error}</p>
                </div>
            ) : loading ? (
                <div className="space-y-2">{Array(5).fill(null).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--cn-surface-2)' }} />)}</div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--cn-border)' }}>
                    {filtered.map((user, i) => (
                        <div key={user.id} className="flex items-center gap-4 px-5 py-4 transition-all hover:brightness-110"
                            style={{ background: 'var(--cn-surface)', borderBottom: i < filtered.length - 1 ? '1px solid var(--cn-border-soft)' : 'none' }}>
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                style={{ background: user.role === 'ADMIN' ? 'var(--cn-accent-admin)' : 'var(--cn-accent-purple)' }}>
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--cn-text-1)' }}>{user.name}</p>
                                    {user.role === 'ADMIN' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--cn-accent-admin)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                            ADMIN
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--cn-text-3)' }}>{user.email}</p>
                            </div>
                            <p className="text-xs flex-shrink-0 hidden sm:block" style={{ color: 'var(--cn-text-3)', opacity: 0.7 }}>{new Date(user.createdAt).toLocaleDateString()}</p>
                            <div className="flex gap-2 flex-shrink-0">
                                {user.role !== 'ADMIN' ? (
                                    <button onClick={() => changeRole(user.id, 'ADMIN')} disabled={processing === user.id}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--cn-accent-admin)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                        {processing === user.id ? '...' : '👑 Make Admin'}
                                    </button>
                                ) : (
                                    <button onClick={() => changeRole(user.id, 'USER')} disabled={processing === user.id}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                                        style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-3)' }}>
                                        {processing === user.id ? '...' : 'Demote'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

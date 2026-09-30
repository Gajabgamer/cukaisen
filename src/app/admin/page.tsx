'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
    approvedPlaces: number
    pendingPlaces: number
    categories: number
    users: number
}

const StatCard = ({ icon, label, value, color, href }: { icon: string, label: string, value: number | string, color: string, href: string }) => (
    <Link href={href} className="cn-glass block p-6 transition-all hover:scale-[1.02] active:scale-[0.98] group">
        <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: color + '20' }}>{icon}</div>
            <svg className="w-4 h-4 transition-colors" style={{ color: 'var(--cn-text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
        <p className="text-3xl font-bold mb-1" style={{ color: 'var(--cn-text-1)' }}>{value}</p>
        <p className="text-sm" style={{ color: 'var(--cn-text-3)' }}>{label}</p>
    </Link>
)

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to view the admin dashboard.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setStats(d))
            .catch(e => setError('Failed to load dashboard stats.'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="cn-display text-3xl font-bold" style={{ color: 'var(--cn-text-1)' }}>Admin Dashboard</h1>
                <p className="mt-1" style={{ color: 'var(--cn-text-3)' }}>CUKAISEN — Chandigarh University</p>
            </div>

            {/* Stats grid */}
            {error ? (
                <div className="text-center py-20 rounded-3xl mb-8" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cn-accent-sukuna)' }}>Access Denied</h3>
                    <p style={{ color: 'var(--cn-accent-sukuna)', opacity: 0.7 }}>{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {loading ? (
                        Array(4).fill(null).map((_, i) => (
                            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--cn-surface-2)' }} />
                        ))
                    ) : <>
                        <StatCard icon="📍" label="Approved Places" value={stats?.approvedPlaces ?? 0} color="var(--cn-status-approved)" href="/admin/places" />
                        <StatCard icon="⏳" label="Pending Review" value={stats?.pendingPlaces ?? 0} color="var(--cn-status-pending)" href="/admin/approvals" />
                        <StatCard icon="🏷️" label="Categories" value={stats?.categories ?? 0} color="var(--cn-accent-purple)" href="/admin/categories" />
                        <StatCard icon="👥" label="Users" value={stats?.users ?? 0} color="var(--cn-accent-gojo)" href="/admin/users" />
                    </>}
                </div>
            )}

            {/* Quick actions */}
            <div className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--cn-text-3)' }}>Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { href: '/admin/approvals', label: 'Review Pending Places', icon: '✅', desc: 'Approve or reject submissions' },
                        { href: '/admin/categories', label: 'Manage Categories', icon: '🏷️', desc: 'Add or remove place categories' },
                        { href: '/admin/users', label: 'Manage Users', icon: '👥', desc: 'Change roles, view accounts' },
                    ].map(a => (
                        <Link key={a.href} href={a.href}
                            className="cn-glass flex items-start gap-4 p-4 transition-all hover:brightness-110 group">
                            <span className="text-2xl mt-0.5">{a.icon}</span>
                            <div>
                                <p className="text-sm font-bold transition-colors" style={{ color: 'var(--cn-text-1)' }}>{a.label}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--cn-text-3)' }}>{a.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Links to other pages */}
            <div className="flex gap-3">
                <Link href="/map"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--cn-accent-purple-glow)', border: '1px solid var(--cn-accent-purple)', color: 'var(--cn-text-1)' }}>
                    🗺️ View Map
                </Link>
                <Link href="/admin/manage-parking"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)', color: 'var(--cn-text-2)' }}>
                    🅿️ Parking Management
                </Link>
            </div>
        </div>
    )
}

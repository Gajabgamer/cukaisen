'use client'

import { useState, useEffect } from 'react'

interface Place {
    id: string; name: string; description?: string
    approvalStatus: string; createdAt: string
    latitude?: number; longitude?: number
    category?: { categoryName: string; icon?: string }
    block?: { name: string }
    createdBy: { name: string; email: string }
}

const STATUS = { APPROVED: { label: 'Approved', color: 'var(--cn-status-approved)', bg: 'rgba(52,211,153,0.12)' }, PENDING: { label: 'Pending', color: 'var(--cn-status-pending)', bg: 'rgba(251,191,36,0.12)' }, REJECTED: { label: 'Rejected', color: 'var(--cn-status-rejected)', bg: 'rgba(220,38,38,0.12)' } }

export default function PlacesAdminPage() {
    const [places, setPlaces] = useState<Place[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<string | null>(null)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/places')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to manage places.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setPlaces(d.places || []))
            .catch(() => setError('Failed to load places.'))
            .finally(() => setLoading(false))
    }, [])

    const changeStatus = async (placeId: string, approvalStatus: string) => {
        setProcessing(placeId)
        await fetch('/api/admin/places', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId, approvalStatus }) })
        setPlaces(p => p.map(x => x.id === placeId ? { ...x, approvalStatus } : x))
        setProcessing(null)
    }

    const deletePlace = async (placeId: string) => {
        if (!confirm('Delete this place permanently?')) return
        setProcessing(placeId)
        await fetch('/api/admin/places', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId }) })
        setPlaces(p => p.filter(x => x.id !== placeId))
        setProcessing(null)
    }

    const filtered = places.filter(p => {
        if (filter !== 'ALL' && p.approvalStatus !== filter) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="cn-display text-2xl font-bold" style={{ color: 'var(--cn-text-1)' }}>All Places</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cn-text-3)' }}>{places.length} total places</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search places..."
                    className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)', color: 'var(--cn-text-1)' }} />
                {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: filter === s ? 'var(--cn-accent-purple)' : 'var(--cn-surface-2)',
                            color: filter === s ? '#fff' : 'var(--cn-text-3)',
                            border: `1px solid ${filter === s ? 'var(--cn-accent-purple)' : 'var(--cn-border)'}`,
                        }}>
                        {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

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
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center" style={{ color: 'var(--cn-text-3)' }}>No places found</div>
                    ) : filtered.map((place, i) => {
                        const st = STATUS[place.approvalStatus as keyof typeof STATUS] || STATUS.PENDING
                        return (
                            <div key={place.id} className="flex items-center gap-4 px-5 py-4 transition-all hover:brightness-110"
                                style={{ background: 'var(--cn-surface)', borderBottom: i < filtered.length - 1 ? '1px solid var(--cn-border-soft)' : 'none' }}>
                                <span className="text-xl">{place.category?.icon || '📍'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--cn-text-1)' }}>{place.name}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--cn-text-3)' }}>{place.category?.categoryName} • {place.createdBy.name} • {new Date(place.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                    style={{ background: st.bg, color: st.color }}>
                                    {st.label}
                                </span>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    {place.approvalStatus !== 'APPROVED' && (
                                        <button onClick={() => changeStatus(place.id, 'APPROVED')} disabled={processing === place.id}
                                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
                                            style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', color: 'var(--cn-status-approved)' }}>
                                            Approve
                                        </button>
                                    )}
                                    {place.approvalStatus !== 'REJECTED' && (
                                        <button onClick={() => changeStatus(place.id, 'REJECTED')} disabled={processing === place.id}
                                            className="px-2.5 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50"
                                            style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--cn-accent-sukuna)' }}>
                                            Reject
                                        </button>
                                    )}
                                    <button onClick={() => deletePlace(place.id)} disabled={processing === place.id}
                                        className="px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                                        style={{ background: 'var(--cn-surface-2)', color: 'var(--cn-text-3)' }}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

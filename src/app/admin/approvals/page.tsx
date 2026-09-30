'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

interface Place {
    id: string; name: string; description?: string
    latitude?: number; longitude?: number; approvalStatus: string
    category?: { categoryName: string; icon?: string }
    block?: { name: string }
    createdBy: { name: string; email: string }
    createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'var(--cn-status-pending)', APPROVED: 'var(--cn-status-approved)', REJECTED: 'var(--cn-status-rejected)'
}

export default function ApprovalsPage() {
    const router = useRouter()
    const [places, setPlaces] = useState<Place[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selected, setSelected] = useState<Place | null>(null)
    const [lastAction, setLastAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/approvals')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to view pending approvals.');
                    return null;
                }
                return r.json()
            })
            .then(d => d && setPlaces(d.places || []))
            .catch(e => setError('Failed to load approvals.'))
            .finally(() => setLoading(false))
    }, [router])

    const act = async (placeId: string, action: 'approve' | 'reject') => {
        setProcessingId(placeId)
        await fetch(`/api/admin/approvals/${placeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        })
        setPlaces(p => p.filter(x => x.id !== placeId))
        setSelected(null)
        setProcessingId(null)
        setLastAction({ id: placeId, action })
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="cn-display text-2xl font-bold" style={{ color: 'var(--cn-text-1)' }}>Pending Approvals</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cn-text-3)' }}>Review and approve user-submitted places</p>
                </div>
                <span className="px-4 py-2 rounded-full text-sm font-bold" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--cn-status-pending)', border: '1px solid rgba(251,191,36,0.3)' }}>
                    {places.length} pending
                </span>
            </div>

            {/* adminApproval Mentor_Copy line — shown after the most recent approve/reject action */}
            {lastAction?.action === 'approve' && (
                <p className="mb-5 text-sm italic" style={{ color: 'var(--cn-status-approved)' }} data-testid="admin-approval-mentor-line">
                    {pickMentorLine('adminApproval')}
                </p>
            )}

            {error ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cn-accent-sukuna)' }}>Access Denied</h3>
                    <p style={{ color: 'var(--cn-accent-sukuna)', opacity: 0.7 }}>{error}</p>
                </div>
            ) : loading ? (
                <div className="space-y-3">
                    {Array(3).fill(null).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--cn-surface-2)' }} />)}
                </div>
            ) : places.length === 0 ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)' }}>
                    <p className="text-5xl mb-4">🎉</p>
                    <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cn-text-1)' }}>All caught up!</h3>
                    <p style={{ color: 'var(--cn-text-3)' }}>No pending approvals at the moment.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {places.map(place => (
                        <div key={place.id} className="cn-glass p-5 flex items-center gap-5 transition-all hover:brightness-110">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                style={{ background: 'var(--cn-accent-purple-glow)' }}>
                                {place.category?.icon || '📍'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm" style={{ color: 'var(--cn-text-1)' }}>{place.name}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--cn-text-3)' }}>
                                    {place.category?.categoryName} • By {place.createdBy.name} • {new Date(place.createdAt).toLocaleDateString()}
                                </p>
                                {place.description && <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--cn-text-2)' }}>{place.description}</p>}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => setSelected(place)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-xl transition-all"
                                    style={{ background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)', color: 'var(--cn-text-2)' }}>
                                    Details
                                </button>
                                <button onClick={() => act(place.id, 'approve')} disabled={processingId === place.id}
                                    className="px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'var(--cn-status-approved)' }}>
                                    {processingId === place.id ? '...' : '✓ Approve'}
                                </button>
                                <button onClick={() => act(place.id, 'reject')} disabled={processingId === place.id}
                                    className="px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'var(--cn-status-rejected)' }}>
                                    {processingId === place.id ? '...' : '✗ Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
                    <div className="cn-glass relative w-full max-w-lg p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--cn-text-1)' }}>Place Details</h3>
                            <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl transition-all" style={{ color: 'var(--cn-text-3)' }}>✕</button>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Name</p>
                                <p className="font-semibold" style={{ color: 'var(--cn-text-1)' }}>{selected.name}</p>
                            </div>
                            {selected.description && <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Description</p>
                                <p className="text-sm" style={{ color: 'var(--cn-text-2)' }}>{selected.description}</p>
                            </div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Category</p>
                                    <p className="text-sm" style={{ color: 'var(--cn-text-1)' }}>{selected.category?.icon} {selected.category?.categoryName || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Block</p>
                                    <p className="text-sm" style={{ color: 'var(--cn-text-1)' }}>{selected.block?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Submitted by</p>
                                    <p className="text-sm" style={{ color: 'var(--cn-text-1)' }}>{selected.createdBy.name}</p>
                                </div>
                                {selected.latitude && <div>
                                    <p className="text-xs mb-1" style={{ color: 'var(--cn-text-3)' }}>Coordinates</p>
                                    <p className="text-sm" style={{ color: 'var(--cn-text-1)' }}>{selected.latitude.toFixed(4)}, {selected.longitude?.toFixed(4)}</p>
                                </div>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => act(selected.id, 'approve')} disabled={processingId === selected.id}
                                className="flex-1 py-3 text-sm font-bold text-white rounded-2xl disabled:opacity-50 hover:opacity-90 transition-all"
                                style={{ background: 'var(--cn-status-approved)' }}>
                                ✓ Approve
                            </button>
                            <button onClick={() => act(selected.id, 'reject')} disabled={processingId === selected.id}
                                className="flex-1 py-3 text-sm font-bold text-white rounded-2xl disabled:opacity-50 hover:opacity-90 transition-all"
                                style={{ background: 'var(--cn-status-rejected)' }}>
                                ✗ Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

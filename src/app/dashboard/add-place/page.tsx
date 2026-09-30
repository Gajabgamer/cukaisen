'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

interface Category {
    id: string
    categoryName: string
    icon?: string
}

interface Block {
    id: string
    name: string
}

const COMMON_EMOJIS = ['📍', '🏫', '📚', '🍕', '☕', '🏋️', '🅿️', '🏥', '🚻', '💊',
    '🎭', '🖥️', '🔬', '⚗️', '🎨', '🏊', '⚽', '🛒', '🏦', '📬']

export default function AddPlacePage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [blocks, setBlocks] = useState<Block[]>([])

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [blockId, setBlockId] = useState('')
    const [latitude, setLatitude] = useState('')
    const [longitude, setLongitude] = useState('')
    const [photo, setPhoto] = useState<string | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // New category inline
    const [showNewCat, setShowNewCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatIcon, setNewCatIcon] = useState('📍')
    const [creatingCat, setCreatingCat] = useState(false)
    const [catError, setCatError] = useState('')

    useEffect(() => {
        Promise.all([fetch('/api/categories'), fetch('/api/blocks')]).then(async ([c, b]) => {
            const cd = await c.json()
            setCategories(cd.categories || [])
            if (b.ok) {
                const bd = await b.json()
                setBlocks(bd.blocks || [])
            }
        })
    }, [])

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLatitude(coords.latitude.toString())
                setLongitude(coords.longitude.toString())
            },
            (err) => alert('Could not get location: ' + err.message)
        )
    }

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return
        setCreatingCat(true); setCatError('')
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCatName.trim(), icon: newCatIcon })
            })
            const data = await res.json()
            if (!res.ok) { setCatError(data.error || 'Failed'); return }
            setCategories(prev => [...prev, data.category])
            setCategoryId(data.category.id)
            setShowNewCat(false); setNewCatName(''); setNewCatIcon('📍')
        } catch { setCatError('Network error') }
        finally { setCreatingCat(false) }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(''); setIsLoading(true)
        try {
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, description, categoryId,
                    blockId: blockId || undefined,
                    latitude: latitude ? parseFloat(latitude) : undefined,
                    longitude: longitude ? parseFloat(longitude) : undefined,
                    photo
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || data.details?.[0] || 'Failed')
            setSuccess(true)
            setTimeout(() => router.push('/map'), 2500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cn-bg)' }}>
                <div className="text-center px-8">
                    <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
                        <svg className="w-12 h-12" style={{ color: 'var(--cn-status-approved)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="cn-display text-3xl font-bold mb-2" style={{ color: 'var(--cn-text-1)' }}>Place Submitted!</h1>
                    <p className="text-base mb-2" style={{ color: 'var(--cn-text-2)' }}>Your place is pending admin review. You&apos;ll be redirected to the map shortly.</p>
                    <p className="text-sm italic mb-6" style={{ color: 'var(--cn-text-3)' }}>{pickMentorLine('arrivalConfirmed')}</p>
                    <Link href="/map" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all" style={{ background: 'var(--cn-accent-purple)', color: '#fff', boxShadow: 'var(--cn-shadow-glow-purple)' }}>
                        Back to Map
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ background: 'var(--cn-bg)' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl" style={{ background: 'var(--cn-nav-bg)', borderBottom: '1px solid var(--cn-nav-border)' }}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/map" className="w-9 h-9 flex items-center justify-center rounded-xl transition-all" style={{ color: 'var(--cn-text-2)' }}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="cn-display font-bold text-sm leading-tight" style={{ color: 'var(--cn-text-1)' }}>Add New Place</h1>
                            <p className="text-xs" style={{ color: 'var(--cn-text-3)' }}>Campus Navigator</p>
                        </div>
                    </div>
                    <span className="text-2xl">📍</span>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="cn-glass overflow-hidden mb-6">
                    <div className="px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--cn-border-soft)' }}>
                        <h2 className="font-bold text-xl" style={{ color: 'var(--cn-text-1)' }}>Place Details</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--cn-text-3)' }}>Your submission will be reviewed before appearing on the map.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                        {error && (
                            <div className="flex flex-col gap-1 rounded-2xl p-4 text-sm" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--cn-accent-sukuna)' }}>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-lg">⚠️</span> {error}
                                </div>
                                <p className="text-xs italic" style={{ opacity: 0.7 }}>{pickMentorLine('errorInterference')}</p>
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>Place Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="e.g. UIET Main Lab"
                                className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm font-medium transition-all"
                                style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cn-accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--cn-accent-purple-glow)' }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cn-border)'; e.currentTarget.style.boxShadow = 'none' }}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Brief description of this place..."
                                className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all resize-none"
                                style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--cn-accent-purple)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--cn-accent-purple-glow)' }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cn-border)'; e.currentTarget.style.boxShadow = 'none' }}
                            />
                        </div>

                        {/* Photo (Optional) */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>Photo (Optional)</label>
                            <ImageUpload
                                onImageSelect={(_, base64) => setPhoto(base64)}
                                className="w-full"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>Category *</label>
                            {!showNewCat ? (
                                <select
                                    value={categoryId}
                                    onChange={e => { if (e.target.value === '__new__') { setShowNewCat(true); return } setCategoryId(e.target.value) }}
                                    required
                                    className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                                    style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                >
                                    <option value="" className="bg-gray-900">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.icon} {cat.categoryName}</option>
                                    ))}
                                    <option value="__new__" className="bg-gray-900">✨ Create new category...</option>
                                </select>
                            ) : (
                                <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--cn-accent-purple-glow)', border: '1px solid var(--cn-accent-purple)' }}>
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-sm" style={{ color: 'var(--cn-accent-purple)' }}>✨ New Category</p>
                                        <button type="button" onClick={() => setShowNewCat(false)} className="text-xs transition-colors" style={{ color: 'var(--cn-accent-purple)' }}>Cancel</button>
                                    </div>
                                    {catError && <p className="text-xs" style={{ color: 'var(--cn-accent-sukuna)' }}>{catError}</p>}
                                    <input
                                        type="text"
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        placeholder="Category name"
                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                                        style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                    />
                                    <div>
                                        <p className="text-xs mb-2" style={{ color: 'var(--cn-accent-purple)' }}>Choose icon:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {COMMON_EMOJIS.map(emoji => (
                                                <button
                                                    type="button"
                                                    key={emoji}
                                                    onClick={() => setNewCatIcon(emoji)}
                                                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                                                    style={{
                                                        background: newCatIcon === emoji ? 'var(--cn-accent-purple)' : 'var(--cn-surface-2)',
                                                        border: `2px solid ${newCatIcon === emoji ? 'var(--cn-accent-purple)' : 'var(--cn-border)'}`,
                                                        transform: newCatIcon === emoji ? 'scale(1.12)' : 'scale(1)'
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={!newCatName.trim() || creatingCat}
                                        className="w-full py-3 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                        style={{ background: 'var(--cn-accent-purple)' }}
                                    >
                                        {creatingCat ? 'Creating...' : 'Create Category'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Block */}
                        {blocks.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>
                                    Building / Block <span className="normal-case font-normal" style={{ opacity: 0.7 }}>(optional)</span>
                                </label>
                                <select
                                    value={blockId}
                                    onChange={e => setBlockId(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                                    style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                >
                                    <option value="" className="bg-gray-900">No specific building</option>
                                    {blocks.map(b => (
                                        <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Location */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--cn-text-3)' }}>Location</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    type="number" step="any" value={latitude}
                                    onChange={e => setLatitude(e.target.value)}
                                    placeholder="Latitude"
                                    className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                                    style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                />
                                <input
                                    type="number" step="any" value={longitude}
                                    onChange={e => setLongitude(e.target.value)}
                                    placeholder="Longitude"
                                    className="w-full px-4 py-3.5 rounded-2xl outline-none text-sm transition-all"
                                    style={{ border: '1px solid var(--cn-border)', background: 'var(--cn-surface-2)', color: 'var(--cn-text-1)' }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-2xl transition-all"
                                style={{ color: 'var(--cn-accent-purple)', background: 'var(--cn-accent-purple-glow)', border: '1px solid var(--cn-border)' }}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Use My Current Location
                            </button>
                        </div>

                        {/* Tip about pin-drop */}
                        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)' }}>
                            <span className="text-lg mt-0.5" style={{ color: 'var(--cn-accent-gojo)' }}>💡</span>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--cn-accent-gojo)' }}>Pro tip</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--cn-accent-gojo)', opacity: 0.7 }}>
                                    For precise location, use the <Link href="/map" className="underline underline-offset-2">map&apos;s pin-drop tool</Link> instead — just tap the + button on the map.
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-sm"
                            style={{
                                background: 'var(--cn-accent-purple)',
                                boxShadow: 'var(--cn-shadow-glow-purple)'
                            }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Submitting...
                                </span>
                            ) : 'Submit Place for Review ✓'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

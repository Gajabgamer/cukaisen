'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface ParkingArea {
    id: string
    name: string
    block: { name: string }
    slots: ParkingSlot[]
    stats: {
        total: number
        available: number
        occupied: number
        reserved: number
    }
}

interface ParkingSlot {
    id: string
    slotNumber: string
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
}

export default function AdminParkingPage() {
    const router = useRouter()
    const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedArea, setSelectedArea] = useState<string | null>(null)
    const [updatingSlot, setUpdatingSlot] = useState<string | null>(null)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchParkingData()
    }, [])

    const fetchParkingData = async () => {
        try {
            const res = await fetch('/api/parking')
            if (res.status === 403) {
                setError('Access Denied. You do not have permission to manage parking.')
                return
            }
            const data = await res.json()
            setParkingAreas(data.parkingAreas || [])
            if (data.parkingAreas?.length > 0) {
                setSelectedArea(data.parkingAreas[0].id)
            }
        } catch (error) {
            console.error('Error fetching parking data:', error)
            setError('Failed to fetch parking data.')
        } finally {
            setIsLoading(false)
        }
    }

    const updateSlotStatus = async (slotId: string, status: string) => {
        setUpdatingSlot(slotId)
        try {
            const res = await fetch('/api/admin/parking/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slotId, status })
            })

            if (res.status === 403) {
                setError('Access Denied. You do not have permission to modify parking.')
                return
            }

            if (res.ok) {
                // Update local state
                setParkingAreas(areas =>
                    areas.map(area => ({
                        ...area,
                        slots: area.slots.map(slot =>
                            slot.id === slotId ? { ...slot, status: status as ParkingSlot['status'] } : slot
                        ),
                        stats: {
                            ...area.stats,
                            available: area.slots.filter(s =>
                                s.id === slotId ? status === 'AVAILABLE' : s.status === 'AVAILABLE'
                            ).length,
                            occupied: area.slots.filter(s =>
                                s.id === slotId ? status === 'OCCUPIED' : s.status === 'OCCUPIED'
                            ).length,
                            reserved: area.slots.filter(s =>
                                s.id === slotId ? status === 'RESERVED' : s.status === 'RESERVED'
                            ).length
                        }
                    }))
                )
            }
        } catch (error) {
            console.error('Error updating slot:', error)
        } finally {
            setUpdatingSlot(null)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'var(--cn-status-available)'
            case 'OCCUPIED': return 'var(--cn-status-occupied)'
            case 'RESERVED': return 'var(--cn-status-reserved)'
            default: return 'var(--cn-text-3)'
        }
    }

    const getNextStatus = (current: string): ParkingSlot['status'] => {
        switch (current) {
            case 'AVAILABLE': return 'OCCUPIED'
            case 'OCCUPIED': return 'RESERVED'
            case 'RESERVED': return 'AVAILABLE'
            default: return 'AVAILABLE'
        }
    }

    const currentArea = parkingAreas.find(a => a.id === selectedArea)

    return (
        <div className="min-h-screen" data-intensity="low" style={{ background: 'var(--cn-bg)' }}>
            <Header />

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="cn-display text-2xl font-bold mb-2" style={{ color: 'var(--cn-text-1)' }}>🚗 Manage Parking</h1>
                    <p className="mb-6" style={{ color: 'var(--cn-text-3)' }}>
                        Click on slots to toggle their status
                    </p>

                    {error ? (
                        <div className="cn-glass text-center py-20">
                            <span className="text-5xl mb-4 block">🚫</span>
                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--cn-accent-sukuna)' }}>Access Denied</h3>
                            <p style={{ color: 'var(--cn-accent-sukuna)', opacity: 0.7 }}>{error}</p>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: 'var(--cn-accent-purple)', borderTopColor: 'transparent' }}></div>
                        </div>
                    ) : parkingAreas.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🚗</span>
                            <p style={{ color: 'var(--cn-text-3)' }}>No parking areas configured</p>
                        </div>
                    ) : (
                        <>
                            {/* Area Selector */}
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                                {parkingAreas.map((area) => (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedArea(area.id)}
                                        className="flex-shrink-0 px-4 py-3 rounded-xl transition-all"
                                        style={selectedArea === area.id
                                            ? { background: 'var(--cn-accent-purple)', color: '#fff' }
                                            : { background: 'var(--cn-surface-2)', border: '1px solid var(--cn-border)', color: 'var(--cn-text-2)' }}
                                    >
                                        <div className="font-medium">{area.name}</div>
                                        <div className="text-sm" style={{ color: selectedArea === area.id ? 'rgba(255,255,255,0.8)' : 'var(--cn-text-3)' }}>
                                            {area.block.name}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {currentArea && (
                                <>
                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
                                            <div className="text-2xl font-bold" style={{ color: 'var(--cn-status-available)' }}>{currentArea.stats.available}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-available)' }}>Available</div>
                                        </div>
                                        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                                            <div className="text-2xl font-bold" style={{ color: 'var(--cn-status-occupied)' }}>{currentArea.stats.occupied}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-occupied)' }}>Occupied</div>
                                        </div>
                                        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                                            <div className="text-2xl font-bold" style={{ color: 'var(--cn-status-reserved)' }}>{currentArea.stats.reserved}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-reserved)' }}>Reserved</div>
                                        </div>
                                    </div>

                                    {/* Interactive Slot Grid */}
                                    <div className="cn-glass p-4">
                                        <h2 className="font-semibold mb-4" style={{ color: 'var(--cn-text-1)' }}>
                                            Click to toggle status (Available → Occupied → Reserved → Available)
                                        </h2>
                                        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                                            {currentArea.slots.map((slot) => (
                                                <button
                                                    key={slot.id}
                                                    onClick={() => updateSlotStatus(slot.id, getNextStatus(slot.status))}
                                                    disabled={updatingSlot === slot.id}
                                                    className="aspect-square rounded-lg flex items-center justify-center text-white text-sm font-medium transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    style={{ background: getStatusColor(slot.status) }}
                                                    title={`${slot.slotNumber} - ${slot.status} (click to change)`}
                                                >
                                                    {updatingSlot === slot.id ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    ) : (
                                                        slot.slotNumber.replace('P', '')
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Legend */}
                                        <div className="flex gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--cn-border)' }}>
                                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cn-text-2)' }}>
                                                <div className="w-4 h-4 rounded" style={{ background: 'var(--cn-status-available)' }}></div>
                                                <span>Available</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cn-text-2)' }}>
                                                <div className="w-4 h-4 rounded" style={{ background: 'var(--cn-status-occupied)' }}></div>
                                                <span>Occupied</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--cn-text-2)' }}>
                                                <div className="w-4 h-4 rounded" style={{ background: 'var(--cn-status-reserved)' }}></div>
                                                <span>Reserved</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}

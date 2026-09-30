'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

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
        availabilityPercent: number
    }
}

interface ParkingSlot {
    id: string
    slotNumber: string
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
}

export default function ParkingPage() {
    const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedArea, setSelectedArea] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchParkingData()
    }, [])

    const fetchParkingData = async () => {
        try {
            const res = await fetch('/api/parking')
            if (!res.ok) throw new Error('Failed to load parking data')
            const data = await res.json()
            setParkingAreas(data.parkingAreas || [])
            if (data.parkingAreas?.length > 0) {
                setSelectedArea(data.parkingAreas[0].id)
            }
        } catch (err) {
            console.error('Error fetching parking data:', err)
            setError('Could not load parking data. Please try again.')
        } finally {
            setIsLoading(false)
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

    const currentArea = parkingAreas.find(a => a.id === selectedArea)

    return (
        <div className="min-h-screen" style={{ background: 'var(--cn-bg)' }}>
            <Header />

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="cn-display text-2xl font-bold mb-2" style={{ color: 'var(--cn-text-1)' }}>🅿️ Parking Availability</h1>
                    <p className="mb-6" style={{ color: 'var(--cn-text-3)' }}>
                        Real-time parking slot availability across campus
                    </p>

                    {error && (
                        <div className="flex flex-col gap-1 rounded-2xl p-4 text-sm mb-6" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: 'var(--cn-accent-sukuna)' }}>
                            <div className="flex items-center gap-2.5">
                                <span>⚠️</span> {error}
                            </div>
                            <p className="text-xs italic" style={{ opacity: 0.7 }}>{pickMentorLine('errorInterference')}</p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: 'var(--cn-accent-purple)', borderTopColor: 'transparent' }}></div>
                        </div>
                    ) : parkingAreas.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🚗</span>
                            <p style={{ color: 'var(--cn-text-3)' }}>No parking areas found</p>
                            <p className="text-sm mt-1 italic" style={{ color: 'var(--cn-text-3)', opacity: 0.7 }}>{pickMentorLine('emptyResults')}</p>
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
                                            {area.stats.available}/{area.stats.total} available
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {currentArea && (
                                <>
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="cn-glass p-4">
                                            <div className="text-3xl font-bold" style={{ color: 'var(--cn-text-1)' }}>{currentArea.stats.total}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-text-3)' }}>Total Slots</div>
                                        </div>
                                        <div className="rounded-xl p-4" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
                                            <div className="text-3xl font-bold" style={{ color: 'var(--cn-status-available)' }}>{currentArea.stats.available}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-available)' }}>Available</div>
                                        </div>
                                        <div className="rounded-xl p-4" style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)' }}>
                                            <div className="text-3xl font-bold" style={{ color: 'var(--cn-status-occupied)' }}>{currentArea.stats.occupied}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-occupied)' }}>Occupied</div>
                                        </div>
                                        <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
                                            <div className="text-3xl font-bold" style={{ color: 'var(--cn-status-reserved)' }}>{currentArea.stats.reserved}</div>
                                            <div className="text-sm" style={{ color: 'var(--cn-status-reserved)' }}>Reserved</div>
                                        </div>
                                    </div>

                                    {/* Availability Bar */}
                                    <div className="cn-glass p-4 mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium" style={{ color: 'var(--cn-text-2)' }}>Availability</span>
                                            <span className="text-2xl font-bold" style={{ color: 'var(--cn-accent-purple)' }}>
                                                {currentArea.stats.availabilityPercent}%
                                            </span>
                                        </div>
                                        <div className="h-4 rounded-full overflow-hidden" style={{ background: 'var(--cn-surface-2)' }}>
                                            <div
                                                className="h-full transition-all"
                                                style={{ width: `${currentArea.stats.availabilityPercent}%`, background: 'linear-gradient(90deg, var(--cn-status-available), var(--cn-accent-gojo))' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Slot Grid */}
                                    <div className="cn-glass p-4">
                                        <h2 className="font-semibold mb-4" style={{ color: 'var(--cn-text-1)' }}>Slot Overview</h2>
                                        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                            {currentArea.slots.map((slot) => (
                                                <div
                                                    key={slot.id}
                                                    className="aspect-square rounded-lg flex items-center justify-center text-white text-xs font-medium transition-transform hover:scale-110"
                                                    style={{ background: getStatusColor(slot.status) }}
                                                    title={`${slot.slotNumber} - ${slot.status}`}
                                                >
                                                    {slot.slotNumber.replace('P', '')}
                                                </div>
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

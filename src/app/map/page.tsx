'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Place, Category } from '@/components/MapLibreCampusMap'
import ImageUpload from '@/components/ImageUpload'
import { pickMentorLine } from '@/lib/lore/mentorCopy'
import { getCursedTerritoryName } from '@/lib/lore/cursedTerritory'
import DomainExpansionTrigger from '@/components/domain/DomainExpansionTrigger'
import DomainExpansionSequence from '@/components/domain/DomainExpansionSequence'
import { AnimatePresence } from 'framer-motion'
import { Veil360Portal, Veil360Domain } from '@/components/jjk/Veil360'
import {
    nearestTourSpot, tourForPlace, TRIGGER_RADIUS_M, RELEASE_RADIUS_M, MIN_TRIGGER_ZOOM,
    TOUR_SPOTS, TOUR_SCENES, type TourHit,
} from '@/lib/tour360'
import type maplibregl from 'maplibre-gl'
import { useVeilProgress, REVEAL_RADIUS } from '@/lib/veilProgress'
import { setVeilVisible } from '@/lib/map/cursedStyle'
import { mapAlive } from '@/lib/map/mapAlive'
import { ensureTourLayers, startTourPulse } from '@/lib/map/tourMarkers'
import { CU_CENTER, metersBetween, pointInPolygon } from '@/lib/map/campusGeo'
import { sfx, isMuted, setMuted, toggleMusic, stopMusic } from '@/lib/sfx'
import VeilHud, { type VeilStage, type DemoCaption } from '@/components/jjk/VeilHud'
import CursedGuide from '@/components/jjk/CursedGuide'
import ArrivalBurst from '@/components/jjk/ArrivalBurst'
import VeilOnboarding, { ONBOARDING_KEY } from '@/components/jjk/VeilOnboarding'
import { useSquad } from '@/lib/squad'
import SquadPanel from '@/components/jjk/SquadPanel'
import SquadMarkers from '@/components/jjk/SquadMarkers'
import BlockNamer from '@/components/jjk/BlockNamer'
import type { CampusBlock } from '@/lib/campusBlocks'
import { getGuide, isGuideId, fill, shortName as guideShort, GUIDE_KEY, GUIDE_INTRO_KEY, type GuideId } from '@/lib/guides'
import { landmarksAlong, joinNames, meters, type BrainPlace } from '@/lib/guideBrain'
import GuideDialog from '@/components/jjk/GuideDialog'
import GuideChat from '@/components/jjk/GuideChat'

// CACHE BUSTER: Force Next.js and browser to invalidate stale bundle
const CACHE_BUSTER = Date.now();

const MapLibreCampusMap = dynamic(() => import('@/components/MapLibreCampusMap'), {
    ssr: false,
    loading: () => (
        <div className="scanlines relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--ink)' }}>
            <img src="/jjk/fx/blue_bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
            <img src="/jjk/chars/gojo_large.webp" alt="" className="aura-blue float-slow absolute bottom-0 right-0 h-[70vh] object-contain opacity-60" />
            <div className="relative text-center">
                <div className="relative mx-auto mb-6 h-24 w-24">
                    <span className="pulse-ring absolute inset-0 rounded-full border-2 border-cyan-300" />
                    <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-cyan-300 border-r-transparent border-b-red-500 border-l-transparent" />
                    <span className="jjk-font neon-red absolute inset-0 flex items-center justify-center text-4xl">帳</span>
                </div>
                <p className="jjk-font neon-cyan text-4xl">EXPANDING DOMAIN</p>
                <p className="mt-1 text-[10px] tracking-[0.4em] text-white/50">CHANDIGARH UNIVERSITY // CAMPUS MAP</p>
                <p className="mt-3 max-w-xs text-xs italic text-white/60">{pickMentorLine('loaderIntro')}</p>
            </div>
        </div>
    )
})

// Category color palette (synced with MapLibre component)
const CAT_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
    '#a855f7', '#eab308', '#22c55e', '#3b82f6', '#fb923c',
]

const COMMON_EMOJIS = ['📍', '🏫', '📚', '🍕', '☕', '🏋️', '🅿️', '🏥', '🚻', '💊',
    '🎭', '🖥️', '🔬', '⚗️', '🎨', '🏊', '⚽', '🛒', '🏦', '📬']

// Decluttered layout: these stay in the code but are hidden from the map.
const SHOW_CATEGORY_CHIPS = false
const SHOW_EXTRA_BUTTONS = false   // About link + admin NAME BLOCKS
const SHOW_DOMAIN_TRIGGER = false

export default function MapPage() {
    const [mounted, setMounted] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [places, setPlaces] = useState<Place[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [searchResults, setSearchResults] = useState<Place[]>([])
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
    const [flyToPlace, setFlyToPlace] = useState<Place | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string; emailVerified: boolean } | null>(null)
    const router = useRouter()

    // Add place state
    const [addMode, setAddMode] = useState<'idle' | 'pin-drop' | 'form'>('idle')
    const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [addForm, setAddForm] = useState({ name: '', description: '', categoryId: '', blockId: '', photos: [] as string[] })
    const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [navigateToPlace, setNavigateToPlace] = useState<Place | null>(null)

    // Domain Expansion Easter egg (Task 30 — lowest priority, see design §5)
    const [domainExpansionActive, setDomainExpansionActive] = useState(false)
    // Stable callback so the sequence's timer effect doesn't restart on every re-render.
    const endDomainExpansion = useCallback(() => setDomainExpansionActive(false), [])

    // ── 360° tour: pop a preview when the map settles near a place that has a panorama ──
    const [tourPortal, setTourPortal] = useState<TourHit | null>(null)
    const [tourOpen, setTourOpen] = useState<TourHit | null>(null)
    const tourDismissedId = useRef<string | null>(null)
    const closeTour = useCallback(() => setTourOpen(null), [])

    // ── THE VEIL: map instance, fog, floating guide, arrival, sound, demo ──
    const veil = useVeilProgress()
    const [mapObj, setMapObj] = useState<maplibregl.Map | null>(null)
    const [mapEpoch, setMapEpoch] = useState(0)
    const handleMapReady = useCallback((m: maplibregl.Map) => {
        setMapObj(m)
        setMapEpoch(e => e + 1)
        // Dev-only handle for automated browser checks
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __veilMap?: maplibregl.Map }).__veilMap = m
    }, [])
    const [fogVisible, setFogVisible] = useState(true)
    const [guideActive, setGuideActive] = useState(false)
    const [guideFollow, setGuideFollow] = useState(false)
    const [guideSpeed, setGuideSpeed] = useState(9)
    const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)
    const [navOrigin, setNavOrigin] = useState<{ lat: number; lng: number } | null>(null)
    const [arrival, setArrival] = useState<Place | null>(null)
    const [arriveGlow, setArriveGlow] = useState(false)
    const [musicOn, setMusicOn] = useState(false)
    const [muted, setMutedState] = useState(false)
    const [demoRunning, setDemoRunning] = useState(false)
    const [caption, setCaption] = useState<DemoCaption | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [onboardOpen, setOnboardOpen] = useState(false)

    // ── Sorcerer guide persona (picked on the landing page) + AI chat ──
    const [guideId, setGuideId] = useState<GuideId>('yuji')
    const guide = getGuide(guideId)
    const [introOpen, setIntroOpen] = useState(false)
    const [chatOpen, setChatOpen] = useState(false)
    const [bark, setBark] = useState<{ id: number; text: string } | null>(null)
    const say = useCallback((text: string) => setBark({ id: Date.now(), text }), [])

    // ── Admin: name this block ──
    const [naming, setNaming] = useState(false)
    const namingRef = useRef(false)
    useEffect(() => { namingRef.current = naming }, [naming])
    const [namerTarget, setNamerTarget] = useState<{ lat: number; lng: number; snapped: boolean } | null>(null)
    const [namerSaving, setNamerSaving] = useState(false)
    const [namerSaved, setNamerSaved] = useState<string | null>(null)
    const [namerError, setNamerError] = useState<string | null>(null)

    // ── Squad live location ──
    const [shareOpen, setShareOpen] = useState(false)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const guideOnRef = useRef(false)
    const squad = useSquad(
        () => {
            const m = mapRef.current
            if (!guideOnRef.current || !m || !(m as unknown as { style?: unknown }).style) return null
            const c = m.getCenter()
            return { lat: c.lat, lng: c.lng }
        },
        () => {
            const m = mapRef.current
            if (!m || !(m as unknown as { style?: unknown }).style) return null
            const c = m.getCenter()
            return { lat: c.lat, lng: c.lng }
        },
    )

    // New category state
    const [showNewCat, setShowNewCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatIcon, setNewCatIcon] = useState('📍')
    const [creatingCat, setCreatingCat] = useState(false)
    const [catError, setCatError] = useState('')

    // Review & Photo addition state
    const [reviewingPlaceId, setReviewingPlaceId] = useState<string | null>(null)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)
    
    const [addingPhotoPlaceId, setAddingPhotoPlaceId] = useState<string | null>(null)
    const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null)
    const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false)
    const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState<string | null>(null)
    const [isDetailLoading, setIsDetailLoading] = useState(false)

    const catColorMap = useRef<Map<string, string>>(new Map())
    const fullPlaceCache = useRef<Map<string, Place>>(new Map())
    const searchTimeout = useRef<NodeJS.Timeout | null>(null)
    const searchBoxRef = useRef<HTMLDivElement>(null)

    // Close the search dropdown when clicking anywhere outside it, so it
    // never floats over the map and swallows marker/map clicks.
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                setShowSearchResults(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [])

    const getColor = (catId: string) => {
        if (!catColorMap.current.has(catId)) {
            const idx = catColorMap.current.size % CAT_COLORS.length
            catColorMap.current.set(catId, CAT_COLORS[idx])
        }
        return catColorMap.current.get(catId)!
    }

    // Initial load
    useEffect(() => {
        const load = async () => {
            try {
                // Fetch independently to prevent auth fail from breaking places
                const [placesRes, catRes, blocksRes, meRes] = await Promise.allSettled([
                    fetch('/api/places').then(r => r.json()),
                    fetch('/api/categories').then(r => r.json()),
                    fetch('/api/blocks').then(r => r.ok ? r.json() : { blocks: [] }),
                    fetch('/api/auth/me', { cache: 'no-store' }).then(r => r.ok ? r.json() : { user: null })
                ])

                if (placesRes.status === 'fulfilled') setPlaces(placesRes.value.places || [])
                if (catRes.status === 'fulfilled') setCategories(catRes.value.categories || [])
                if (blocksRes.status === 'fulfilled') setBlocks(blocksRes.value.blocks || [])
                if (meRes.status === 'fulfilled') setCurrentUser(meRes.value.user || null)

            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    // Live search
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!searchInput.trim()) {
            setSearchResults([])
            setShowSearchResults(false)
            setSearchQuery('')
            return
        }
        searchTimeout.current = setTimeout(() => {
            const q = searchInput.trim().toLowerCase()
            // Rank: name-starts-with > name-contains > category/territory > description
            const score = (p: Place) => {
                const name = p.name.toLowerCase()
                const cat = p.category?.categoryName.toLowerCase() || ''
                const territory = p.category ? getCursedTerritoryName(p.category.categoryName).toLowerCase() : ''
                if (name.startsWith(q)) return 4
                if (name.includes(q)) return 3
                if (cat.includes(q) || territory.includes(q)) return 2
                if (p.description?.toLowerCase().includes(q)) return 1
                return 0
            }
            const results = places
                .map(p => ({ p, s: score(p) }))
                .filter(x => x.s > 0)
                .sort((a, b) => b.s - a.s)
                .slice(0, 6)
                .map(x => x.p)
            setSearchResults(results)
            setShowSearchResults(true)
        }, 200)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [searchInput, places])

    const getDescriptionSnippet = (desc?: string, query?: string) => {
        if (!desc) return null;
        const q = query?.toLowerCase() || '';
        const d = desc.toLowerCase();
        const words = desc.split(' ');
        
        if (!q || !d.includes(q)) {
            return words.slice(0, 3).join(' ') + (words.length > 3 ? '...' : '');
        }
        
        const idx = d.indexOf(q);
        const startIdx = desc.lastIndexOf(' ', idx);
        const snippet = desc.substring(startIdx === -1 ? 0 : startIdx + 1);
        const snippetWords = snippet.split(' ');
        return (startIdx > 0 ? '...' : '') + snippetWords.slice(0, 3).join(' ') + (snippetWords.length > 3 ? '...' : '');
    };

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const handlePlaceClick = async (place: Place) => {
        if (namingRef.current) return // naming mode: map taps pick buildings, not places
        sfx.select()
        if (place.latitude != null && place.longitude != null) {
            veil.reveal({ lat: place.latitude, lng: place.longitude }, REVEAL_RADIUS.sensed)
        }
        // Check cache first
        if (fullPlaceCache.current.has(place.id)) {
            setSelectedPlace(fullPlaceCache.current.get(place.id)!)
            setFlyToPlace(place)
            setShowSearchResults(false)
            return
        }

        // Optimistically set the base place
        setSelectedPlace(place)
        setFlyToPlace(place)
        setShowSearchResults(false)
        setIsDetailLoading(true)

        // Fetch deep relations (photos, reviews) asynchronously
        try {
            const res = await fetch(`/api/places/${place.id}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedPlace(data.place)
                // Cache it
                fullPlaceCache.current.set(place.id, data.place)
            }
        } catch (e) {
            console.error('Failed to fetch detailed place data', e)
        } finally {
            setIsDetailLoading(false)
        }
    }

    const handleSearchSelect = (place: Place) => {
        setSearchInput(place.name)
        setShowSearchResults(false)
        handlePlaceClick(place)
    }

    const enterPinDrop = useCallback(() => {
        if (!currentUser) {
            router.push('/login?redirect=' + encodeURIComponent('/map?action=add-place'))
            return
        }
        if (!currentUser.emailVerified) {
            // Trigger the verification banner warning or show an alert
            alert('Please verify your email to add new places.')
            return
        }
        setAddMode('pin-drop')
        setSelectedPlace(null)
        setPinnedCoords(null)
        setAddForm({ name: '', description: '', categoryId: '', blockId: '', photos: [] })
        setSubmitSuccess(false)
        setSubmitError('')
    }, [currentUser, router])

    // Handle ?action=add-place from URL
    useEffect(() => {
        if (!isLoading) {
            const query = new URLSearchParams(window.location.search);
            if (query.get('action') === 'add-place') {
                window.history.replaceState({}, '', '/map');
                enterPinDrop();
            }
        }
    }, [isLoading, enterPinDrop]);

    const handleViewChange = useCallback((view: { lat: number; lng: number; zoom: number }) => {
        if (addMode !== 'idle' || navigateToPlace || tourOpen || namingRef.current) return
        const best = nearestTourSpot(view)
        // Moved away: hide the portal and re-arm a previously dismissed spot
        if (!best || best.d > RELEASE_RADIUS_M || view.zoom < MIN_TRIGGER_ZOOM - 0.5) {
            setTourPortal(null)
            tourDismissedId.current = null
            return
        }
        if (view.zoom >= MIN_TRIGGER_ZOOM && best.d <= TRIGGER_RADIUS_M && best.spot.sceneId !== tourDismissedId.current) {
            setTourPortal(prev => (prev?.spot.sceneId === best.spot.sceneId ? prev : best))
        }
    }, [addMode, navigateToPlace, tourOpen])

    const handleMapClick = useCallback((lat: number, lng: number) => {
        if (addMode !== 'pin-drop') return
        setPinnedCoords({ lat, lng })
        setAddMode('form')
    }, [addMode])

    const cancelAdd = () => {
        setAddMode('idle')
        setPinnedCoords(null)
        setShowNewCat(false)
        setNewCatName('')
        setNewCatIcon('📍')
        setCatError('')
    }

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return
        setCreatingCat(true)
        setCatError('')
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCatName.trim(), icon: newCatIcon })
            })
            const data = await res.json()
            if (!res.ok) { setCatError(data.error || 'Failed'); return }
            const newCat: Category = data.category
            setCategories(prev => [...prev, newCat])
            setAddForm(prev => ({ ...prev, categoryId: newCat.id }))
            setShowNewCat(false)
            setNewCatName('')
            setNewCatIcon('📍')
        } catch {
            setCatError('Network error')
        } finally {
            setCreatingCat(false)
        }
    }

    const handleSubmitPlace = async () => {
        if (!addForm.name.trim() || !addForm.categoryId) {
            setSubmitError('Name and category are required')
            return
        }
        setIsSubmitting(true)
        setSubmitError('')
        try {
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addForm.name.trim(),
                    description: addForm.description.trim() || undefined,
                    categoryId: addForm.categoryId,
                    blockId: addForm.blockId || undefined,
                    latitude: pinnedCoords?.lat,
                    longitude: pinnedCoords?.lng,
                    photos: addForm.photos
                })
            })
            const data = await res.json()
            if (res.status === 401) {
                cancelAdd()
                router.push('/login?redirect=/map')
                return
            }
            if (!res.ok) { setSubmitError(data.error || data.details?.[0] || 'Failed'); return }
            setSubmitSuccess(true)
            setTimeout(() => {
                cancelAdd()
                // Reload places
                fetch('/api/places').then(r => r.json()).then(d => setPlaces(d.places || []))
            }, 2200)
        } catch {
            setSubmitError('Network error, please try again')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitReview = async () => {
        if (!selectedPlace || !currentUser) return
        if (!reviewComment.trim()) return
        setIsSubmittingReview(true)
        try {
            const res = await fetch(`/api/places/${selectedPlace.id}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() })
            })
            if (res.ok) {
                const data = await res.json()
                setReviewingPlaceId(null)
                setReviewComment('')
                setReviewRating(5)
                // Reload places to update
                fetch('/api/places').then(r => r.json()).then(d => {
                    setPlaces(d.places || [])
                    const updated = (d.places || []).find((p: Place) => p.id === selectedPlace.id)
                    if (updated) setSelectedPlace(updated)
                })
            }
        } finally {
            setIsSubmittingReview(false)
        }
    }

    const handleSubmitPhoto = async () => {
        if (!selectedPlace || !currentUser || !newPhotoBase64) return
        setIsSubmittingPhoto(true)
        try {
            const res = await fetch(`/api/places/${selectedPlace.id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoUrl: newPhotoBase64 })
            })
            if (res.ok) {
                const data = await res.json()
                setAddingPhotoPlaceId(null)
                setNewPhotoBase64(null)
                // Reload places to update
                fetch('/api/places').then(r => r.json()).then(d => {
                    setPlaces(d.places || [])
                    const updated = (d.places || []).find((p: Place) => p.id === selectedPlace.id)
                    if (updated) setSelectedPlace(updated)
                })
            }
        } finally {
            setIsSubmittingPhoto(false)
        }
    }

    const placesWithCoords = places.filter(p => p.latitude && p.longitude)

    /* ═════════════ THE VEIL orchestration ═════════════ */

    // Latest values for async demo polling + once-bound map handlers
    useEffect(() => { mapRef.current = mapObj; guideOnRef.current = guideActive }, [mapObj, guideActive])

    // An invite link (?squad=CODE) opens the share panel once the map is up and the tour is done
    const invitedCode = squad.invited
    useEffect(() => {
        if (!invitedCode || !mapObj || onboardOpen) return
        const t = setTimeout(() => setShareOpen(true), 600)
        return () => clearTimeout(t)
    }, [invitedCode, mapObj, onboardOpen])

    const flyToMember = (m: { latitude: number; longitude: number }) => {
        if (!mapAlive(mapObj)) return
        mapObj.flyTo({ center: [m.longitude, m.latitude], zoom: Math.max(mapObj.getZoom(), 18), duration: 1200, essential: true })
    }

    /* ── Admin block naming ── */
    const placedNames = new Set(places.map(p => p.name.trim().toLowerCase()))

    // Tap → snap to the building under the finger (footprint centroid), else the tapped point
    useEffect(() => {
        if (!naming || !mapAlive(mapObj)) return
        const m = mapObj
        const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
        const ensure = () => {
            if (!m.getSource('namer-target')) m.addSource('namer-target', { type: 'geojson', data: empty })
            if (!m.getLayer('namer-target-fill')) m.addLayer({ id: 'namer-target-fill', type: 'fill', source: 'namer-target', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#fbbf24', 'fill-opacity': 0.45 } })
            if (!m.getLayer('namer-target-line')) m.addLayer({ id: 'namer-target-line', type: 'line', source: 'namer-target', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#fde047', 'line-width': 3 } })
            if (!m.getLayer('namer-target-pt')) m.addLayer({ id: 'namer-target-pt', type: 'circle', source: 'namer-target', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 9, 'circle-color': '#fbbf24', 'circle-stroke-color': '#05030a', 'circle-stroke-width': 2 } })
        }
        try { ensure() } catch { /* style swapping */ }
        m.getCanvas().style.cursor = 'crosshair'

        const onClick = (e: maplibregl.MapMouseEvent) => {
            setNamerError(null)
            setNamerSaved(null)
            const layers = ['jp-roof', '3d-buildings', 'jp-stone'].filter(id => m.getLayer(id))
            // Tolerant pick: 12 px box; prefer the footprint that contains the tap, else the nearest one
            const R = 12
            const hits = layers.length ? m.queryRenderedFeatures([[e.point.x - R, e.point.y - R], [e.point.x + R, e.point.y + R]], { layers }) : []
            const rings = hits.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]]
                : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map(p => p[0]) : []) as [number, number][][]
            const tap = { lng: e.lngLat.lng, lat: e.lngLat.lat }
            const nearest = (r: [number, number][]) => Math.min(...r.map(([x, y]) => metersBetween(tap, { lng: x, lat: y })))
            const ring = rings.find(r => pointInPolygon(tap.lng, tap.lat, r))
                ?? (rings.length ? rings.reduce((a, b) => (nearest(a) <= nearest(b) ? a : b)) : null)
            let lat = e.lngLat.lat, lng = e.lngLat.lng
            let feature: GeoJSON.Feature
            if (ring && ring.length > 2) {
                // Area-weighted polygon centroid
                let a = 0, cx = 0, cy = 0
                for (let i = 0; i < ring.length - 1; i++) {
                    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1]
                    const f = x1 * y2 - x2 * y1
                    a += f; cx += (x1 + x2) * f; cy += (y1 + y2) * f
                }
                if (Math.abs(a) > 1e-14) { lng = cx / (3 * a); lat = cy / (3 * a) }
                feature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
            } else {
                feature = { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lng, lat] } }
            }
            try { ensure(); (m.getSource('namer-target') as maplibregl.GeoJSONSource).setData(feature) } catch { /* ignore */ }
            setNamerTarget({ lat, lng, snapped: !!ring })
        }
        m.on('click', onClick)
        return () => {
            m.off('click', onClick)
            if (!mapAlive(m)) return
            m.getCanvas().style.cursor = ''
            try { (m.getSource('namer-target') as maplibregl.GeoJSONSource | undefined)?.setData(empty) } catch { /* ignore */ }
        }
    }, [naming, mapObj, mapEpoch])

    useEffect(() => {
        if (naming) return
        // Leaving naming mode: reset its state
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNamerTarget(null); setNamerSaved(null); setNamerError(null)
    }, [naming])

    const saveBlockName = async (b: CampusBlock) => {
        if (!namerTarget) return
        setNamerSaving(true)
        setNamerError(null)
        try {
            const res = await fetch('/api/admin/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: b.name, description: b.description, category: b.category, latitude: namerTarget.lat, longitude: namerTarget.lng }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Could not save')
            sfx.select()
            setNamerSaved(`${b.name}${data.updated ? ' (moved)' : ''}`)
            setNamerTarget(null)
            if (mapAlive(mapObj)) { try { (mapObj.getSource('namer-target') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] }) } catch { /* ignore */ } }
            const [pr, cr] = await Promise.all([fetch('/api/places').then(r => r.json()), fetch('/api/categories').then(r => r.json())])
            setPlaces(pr.places || [])
            setCategories(cr.categories || [])
            fullPlaceCache.current.clear()
        } catch (e) {
            setNamerError(e instanceof Error ? e.message : 'Could not save')
        } finally {
            setNamerSaving(false)
        }
    }

    const removeBlockName = async (name: string) => {
        const place = places.find(p => p.name.trim().toLowerCase() === name.toLowerCase())
        if (!place) return
        setNamerSaving(true)
        setNamerError(null)
        try {
            const res = await fetch('/api/admin/places', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId: place.id }),
            })
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not remove')
            if (selectedPlace?.id === place.id) setSelectedPlace(null)
            setNamerSaved(`${name} removed`)
            const [pr, cr] = await Promise.all([fetch('/api/places').then(r => r.json()), fetch('/api/categories').then(r => r.json())])
            setPlaces(pr.places || [])
            setCategories(cr.categories || [])
            fullPlaceCache.current.delete(place.id)
        } catch (e) {
            setNamerError(e instanceof Error ? e.message : 'Could not remove')
        } finally {
            setNamerSaving(false)
        }
    }

    const live = useRef({ routeCoords, tourOpen, arrival, guideActive })
    const openTourRef = useRef<(sceneId: string) => void>(() => {})
    useEffect(() => { live.current = { routeCoords, tourOpen, arrival, guideActive } })

    const openTourScene = (sceneId: string) => {
        const spot = TOUR_SPOTS.find(s => s.sceneId === sceneId)
        const scene = spot && TOUR_SCENES[spot.sceneId]
        if (!spot || !scene) return
        setTourPortal(null)
        setTourOpen({ spot, scene, d: 0 })
    }
    useEffect(() => { openTourRef.current = openTourScene })

    // Layers that live on the map (re-added after every style reload)
    useEffect(() => {
        if (!mapAlive(mapObj)) return
        try {
            ensureTourLayers(mapObj, TOUR_SPOTS, id => openTourRef.current(id))
        } catch (e) { console.error('Veil layers', e) }
    }, [mapObj, mapEpoch])

    // 霧 toggle shows/hides the barrier curtain on the campus edge
    useEffect(() => { if (mapAlive(mapObj)) setVeilVisible(mapObj, fogVisible) }, [mapObj, mapEpoch, fogVisible])

    useEffect(() => { if (mapAlive(mapObj)) return startTourPulse(mapObj) }, [mapObj, mapEpoch])

    // First visit: show the feature tour once the map is up (after the Veil loader clears)
    const mapReady = !!mapObj
    useEffect(() => {
        if (!mapReady) return
        let seen = false
        try { seen = localStorage.getItem(ONBOARDING_KEY) === '1' } catch { /* ignore */ }
        if (seen) return
        const t = setTimeout(() => setOnboardOpen(true), 1400)
        return () => clearTimeout(t)
    }, [mapReady])

    // Guide persona: ?guide=gojo from the landing roster wins, else the saved pick.
    useEffect(() => {
        let id: GuideId = 'yuji'
        try {
            const q = new URLSearchParams(window.location.search).get('guide')
            const saved = localStorage.getItem(GUIDE_KEY)
            if (isGuideId(q)) { id = q; localStorage.setItem(GUIDE_KEY, q) }
            else if (isGuideId(saved)) id = saved
        } catch { /* private mode */ }
        // One-time client-only read of the persisted guide choice.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuideId(id)
    }, [])
    const changeGuide = useCallback((id: GuideId) => {
        setGuideId(id)
        try { localStorage.setItem(GUIDE_KEY, id) } catch { /* ignore */ }
        setBark({ id: Date.now(), text: getGuide(id).t.hello })
    }, [])

    // Game-style intro the first time each guide meets the player on the map
    useEffect(() => {
        if (!mapReady) return
        let seen: string[] = []
        try { seen = JSON.parse(localStorage.getItem(GUIDE_INTRO_KEY) || '[]') } catch { /* ignore */ }
        if (seen.includes(guideId)) return
        const t = setTimeout(() => setIntroOpen(true), 900)
        return () => clearTimeout(t)
    }, [mapReady, guideId])
    const closeIntro = () => {
        setIntroOpen(false)
        try {
            const seen: string[] = JSON.parse(localStorage.getItem(GUIDE_INTRO_KEY) || '[]')
            if (!seen.includes(guideId)) localStorage.setItem(GUIDE_INTRO_KEY, JSON.stringify([...seen, guideId]))
        } catch { /* ignore */ }
    }

    // Real route drawn → guide tells you what you'll pass on the way
    const brainPlaces = useRef<BrainPlace[]>([])
    useEffect(() => {
        brainPlaces.current = places
            .filter(p => p.latitude != null && p.longitude != null)
            .map(p => ({ id: p.id, name: p.name, lat: p.latitude!, lng: p.longitude!, cat: p.category?.categoryName?.toLowerCase() || 'building' }))
    }, [places])
    const barkedRoute = useRef<string | null>(null)
    useEffect(() => {
        if (!routeCoords || routeCoords.length < 2 || !navigateToPlace) { if (!navigateToPlace) barkedRoute.current = null; return }
        const key = `${navigateToPlace.id}:${routeCoords.length}`
        if (barkedRoute.current === key) return
        barkedRoute.current = key
        let len = 0
        for (let i = 1; i < routeCoords.length; i++) len += meters(routeCoords[i - 1][1], routeCoords[i - 1][0], routeCoords[i][1], routeCoords[i][0])
        const dist = Math.max(10, Math.round(len / 10) * 10), min = Math.max(1, Math.round(dist / 75))
        const way = landmarksAlong(routeCoords, brainPlaces.current, { excludeId: navigateToPlace.id, radius: 35, limit: 4 })
        const dest = navigateToPlace.name.split(/\s[|•]\s|\s\|/)[0].trim()
        const g = getGuide(guideId)
        const text = `${fill(g.t.nav, { dest, dist, min })} ${way.length ? fill(g.t.way, { way: joinNames(way.map(w => w.name)) }) : g.t.noWay}`
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBark({ id: Date.now(), text })
    }, [routeCoords, navigateToPlace, guideId])

    // Sound hooks
    useEffect(() => {
        // One-time client-only read of the persisted mute flag.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMutedState(isMuted())
        return () => stopMusic()
    }, [])
    const portalId = tourPortal?.spot.sceneId
    useEffect(() => { if (portalId) sfx.portal() }, [portalId])
    const openId = tourOpen?.spot.sceneId
    useEffect(() => {
        const spot = TOUR_SPOTS.find(s => s.sceneId === openId)
        if (!spot) return
        sfx.portal()
        veil.reveal(spot, REVEAL_RADIUS.sight360)
    }, [openId, veil.reveal])

    useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t) }, [toast])
    useEffect(() => { if (!arriveGlow) return; const t = setTimeout(() => setArriveGlow(false), 6000); return () => clearTimeout(t) }, [arriveGlow])

    // Floating guide
    const toggleGuide = () => {
        if (guideActive) {
            sfx.dismiss()
            setGuideActive(false)
            setGuideFollow(false)
        } else {
            sfx.summon()
            setGuideActive(true)
            setGuideFollow(!!routeCoords && !!navigateToPlace)
        }
    }

    const handleRouteReady = useCallback((coords: [number, number][]) => {
        setRouteCoords(coords)
        if (live.current.guideActive) setGuideFollow(true)
    }, [])

    const handleArrive = useCallback((place: Place) => {
        if (live.current.arrival) return
        setGuideFollow(false)
        setArrival(place)
        sfx.arrive()
        arrivedAt.current = place.name.split(/\s[|•]\s|\s\|/)[0].trim()
    }, [])
    const arrivedAt = useRef<string | null>(null)

    const finishArrival = () => {
        const place = arrival
        if (!place) return
        setArrival(null)
        if (arrivedAt.current) { say(fill(guide.t.arrive, { dest: arrivedAt.current })); arrivedAt.current = null }
        if (place.latitude != null && place.longitude != null) {
            veil.reclaim(place.id, { lat: place.latitude, lng: place.longitude })
        }
        setNavigateToPlace(null)
        setRouteCoords(null)
        setNavOrigin(null)
        setArriveGlow(true)
        const hit = tourForPlace(place)
        if (hit) setTourOpen(hit)
        else handlePlaceClick(place)
    }

    // Chat actions
    const startNavigation = (place: Place) => {
        if (place.latitude == null || place.longitude == null) return
        sfx.route()
        const c = guideActive ? mapObj?.getCenter() : null
        setNavOrigin(c ? { lat: c.lat, lng: c.lng } : null)
        setNavigateToPlace({ ...place })
        setFlyToPlace(null)
        setSelectedPlace(null)
        setChatOpen(false)
    }
    const chatNavigate = (id: string) => { const p = places.find(x => x.id === id); if (p) startNavigation(p) }
    const chatShow = (id: string) => {
        const p = places.find(x => x.id === id)
        if (!p) return
        setChatOpen(false)
        handlePlaceClick(p)
        setFlyToPlace({ ...p })
    }
    const chatOrigin = () => {
        if (navOrigin) return navOrigin
        if (!mapAlive(mapObj)) return null
        const c = mapObj.getCenter()
        return { lat: c.lat, lng: c.lng }
    }

    const cancelNavigation = () => {
        setNavigateToPlace(null)
        setRouteCoords(null)
        setNavOrigin(null)
        setGuideFollow(false)
    }

    // 360° site tour: fly to each panorama in turn (the proximity portal pops on arrival)
    const tourIdx = useRef(-1)
    const flyToNextTour = () => {
        if (!mapAlive(mapObj)) return
        tourIdx.current = (tourIdx.current + 1) % TOUR_SPOTS.length
        const s = TOUR_SPOTS[tourIdx.current]
        tourDismissedId.current = null
        mapObj.flyTo({ center: [s.lng, s.lat], zoom: guideActive ? 18.6 : 18.2, pitch: guideActive ? 62 : 58, duration: 1600, essential: true })
        setToast(`👁 360° SITE ${tourIdx.current + 1}/${TOUR_SPOTS.length} · ${s.name.toUpperCase()}`)
    }

    // ── One-click demo: DISCOVER → NAVIGATE → ARRIVE, hands-free ──
    const demoToken = useRef({ cancelled: true })
    const stopDemo = () => {
        demoToken.current.cancelled = true
        setDemoRunning(false)
        setCaption(null)
        setGuideSpeed(9)
    }
    const runDemo = async () => {
        if (!mapObj || demoRunning) return
        const token = { cancelled: false }
        demoToken.current = token
        const alive = () => !token.cancelled
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
        const until = async (cond: () => boolean, max: number) => {
            const t0 = performance.now()
            while (alive() && !cond() && performance.now() - t0 < max) await sleep(120)
        }
        const target = placesWithCoords.find(p => p.name.trim().toLowerCase() === 'b2')
            ?? placesWithCoords.find(p => tourForPlace(p)) ?? placesWithCoords[0]
        if (!target) return
        const gate = TOUR_SPOTS.find(s => s.name === 'Gate 2') ?? TOUR_SPOTS[0]

        setDemoRunning(true)
        setTourOpen(null); setTourPortal(null); setSelectedPlace(null); setNavigateToPlace(null)
        setRouteCoords(null); setGuideActive(false); setGuideFollow(false); setNavOrigin(null)
        setShowSearchResults(false); setSearchInput('')
        try {
            setCaption({ kicker: 'MISSION 01 // THE VEIL', text: 'A cursed Veil has swallowed the campus.' })
            mapObj.flyTo({ center: CU_CENTER, zoom: 16.2, pitch: 55, bearing: 200, duration: 2600, essential: true })
            await sleep(3400); if (!alive()) return

            setCaption({ kicker: '01 · DISCOVER — CURSED SIGHT', text: 'Sense any block, lab or canteen.' })
            let typed = ''
            setSearchOpen(true)
            for (const ch of target.name) { typed += ch; setSearchInput(typed); await sleep(200); if (!alive()) return }
            await sleep(900); if (!alive()) return
            handleSearchSelect(target)
            await sleep(3000); if (!alive()) return

            setCaption({ kicker: '02 · NAVIGATE — CURSED MOVEMENT', text: 'Your guide floats the path for you.' })
            setNavOrigin({ lat: gate.lat, lng: gate.lng })
            setSelectedPlace(null); setFlyToPlace(null)
            sfx.route()
            setNavigateToPlace({ ...target })
            await until(() => !!live.current.routeCoords, 9000); if (!alive()) return
            setGuideSpeed(22)
            sfx.summon()
            setGuideActive(true)
            setGuideFollow(true)
            await until(() => !!live.current.arrival, 60000); if (!alive()) return

            setCaption({ kicker: '03 · ARRIVE — RECLAIM', text: 'Territory reclaimed. The Veil thins.' })
            await until(() => !!live.current.tourOpen, 9000); if (!alive()) return
            await sleep(6500); if (!alive()) return
            setTourOpen(null)
            setGuideActive(false)
            setGuideFollow(false)
            setCaption({ kicker: 'THE VEIL', text: 'Discover → Navigate → Arrive. One territory at a time.' })
            await sleep(4000)
        } finally {
            if (demoToken.current === token) {
                setDemoRunning(false)
                setCaption(null)
                setGuideSpeed(9)
            }
        }
    }

    // Space = summon/dismiss guide · Shift+D = demo · Esc = stop demo
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return
            if (onboardOpen) return
            if (e.key === ' ' && !e.repeat) {
                if (tourOpen || arrival || addMode !== 'idle') return
                e.preventDefault()
                toggleGuide()
            } else if (e.key === 'D' && e.shiftKey) {
                e.preventDefault()
                if (demoRunning) stopDemo(); else void runDemo()
            } else if (e.key === 'Escape' && demoRunning) {
                stopDemo()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    })

    const reclaimedCount = placesWithCoords.filter(p => veil.progress.reclaimed.includes(p.id)).length
    const liftedPct = placesWithCoords.length ? Math.round((reclaimedCount / placesWithCoords.length) * 100) : 0
    const stage: VeilStage = arrival || arriveGlow ? 'arrive' : navigateToPlace ? 'navigate' : 'discover'

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <div className="jjk-map h-screen w-screen overflow-hidden relative" style={{ background: 'var(--ink)' }}>
            {/* Neon HUD frame over the map */}
            <div className="pointer-events-none absolute inset-0 z-10" style={{ boxShadow: 'inset 0 0 80px rgba(0,180,255,0.18), inset 0 0 2px rgba(0,240,255,0.6)' }} />
            {addMode === 'idle' && (
                <VeilHud
                    stage={stage}
                    liftedPct={liftedPct}
                    reclaimed={reclaimedCount}
                    total={placesWithCoords.length}
                    fogVisible={fogVisible}
                    onToggleFog={() => setFogVisible(v => !v)}
                    musicOn={musicOn}
                    onToggleMusic={() => setMusicOn(toggleMusic())}
                    muted={muted}
                    onToggleMute={() => { const v = !muted; setMuted(v); setMutedState(v); if (v) setMusicOn(false) }}
                    onTour360={flyToNextTour}
                    onDemo={() => (demoRunning ? stopDemo() : void runDemo())}
                    demoRunning={demoRunning}
                    caption={caption}
                    toast={toast}
                    hideCompact={guideActive}
                    onHelp={() => { if (demoRunning) stopDemo(); setOnboardOpen(true) }}
                    onShare={() => setShareOpen(o => !o)}
                    shareOpen={shareOpen}
                    sharing={squad.sharing}
                    squadCount={squad.members.length}
                />
            )}
            {/* Full Screen Map */}
            <div className="absolute inset-0">
                <MapLibreCampusMap
                    places={placesWithCoords}
                    categories={categories}
                    selectedCategoryIds={selectedCategoryIds}
                    searchQuery={searchQuery}
                    pinDropMode={addMode === 'pin-drop'}
                    flyToPlace={flyToPlace}
                    navigateToPlace={navigateToPlace}
                    pinnedCoords={pinnedCoords}
                    selectedPlace={selectedPlace}
                    onMapClick={handleMapClick}
                    onPlaceClick={handlePlaceClick}
                    onCancelNavigation={cancelNavigation}
                    onCancelAdd={cancelAdd}
                    onViewChange={handleViewChange}
                    onMapReady={handleMapReady}
                    reclaimedIds={veil.progress.reclaimed}
                    navOrigin={navOrigin}
                    onRouteReady={handleRouteReady}
                    onArrive={handleArrive}
                    guideActive={guideActive}
                    onToggleGuide={toggleGuide}
                />
            </div>

            {/* ─── VERIFICATION BANNER ─── */}
            {currentUser && !currentUser.emailVerified && (
                <div className="absolute top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-lg animate-slideDown">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="text-lg">📧</span>
                        <p>Verify your email to unlock all features. Check your inbox for the Neon verification link.</p>
                    </div>
                    <button 
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/auth/send-verification-link', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ callbackURL: `${window.location.pathname}${window.location.search}` || '/map' }),
                                })
                                if (!res.ok) throw new Error()
                                alert('Verification email resent!')
                            } catch {
                                alert('Failed to resend email.')
                            }
                        }}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-all"
                    >
                        Resend Link
                    </button>
                </div>
            )}

            {/* ─── TOP SEARCH BAR ─── */}
            {!navigateToPlace && addMode === 'idle' && (
                <div className={`absolute top-4 left-4 z-30 ${searchOpen ? 'right-16 md:right-auto md:w-[320px]' : ''}`}>
                {/* Search: circular icon that expands into the input */}
                <div className="relative" ref={searchBoxRef} data-tour="search">
                    <div className={`neon-border flex items-center overflow-hidden rounded-full bg-black/75 backdrop-blur-md transition-all duration-300 focus-within:shadow-[0_0_22px_rgba(0,240,255,0.6)] ${searchOpen ? 'w-full' : 'h-11 w-11'}`}>
                        <button type="button" aria-label={searchOpen ? 'Search' : 'Open search'} aria-expanded={searchOpen}
                            onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 60) }}
                            className={`flex shrink-0 items-center justify-center text-cyan-300 ${searchOpen ? 'pl-4' : 'h-11 w-11'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                        {searchOpen && <input
                            ref={searchInputRef}
                            onBlur={() => { if (!searchInput.trim()) setTimeout(() => setSearchOpen(false), 150) }}
                            type="text"
                            placeholder="Sense a cursed territory..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onFocus={() => searchInput.trim() && setShowSearchResults(true)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && searchResults.length > 0) {
                                    e.preventDefault()
                                    handleSearchSelect(searchResults[0])
                                    e.currentTarget.blur()
                                } else if (e.key === 'Escape') {
                                    setShowSearchResults(false)
                                    e.currentTarget.blur()
                                }
                            }}
                            aria-label="Search campus places"
                            enterKeyHint="search"
                            className="flex-1 px-3 py-2.5 outline-none text-gray-800 text-sm font-medium placeholder-gray-500 bg-transparent"
                        />}
                        {searchOpen && (
                            <button aria-label="Close search" onClick={() => { setSearchInput(''); setSearchResults([]); setShowSearchResults(false); setSearchQuery(''); setSearchOpen(false) }}
                                className="pr-4 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-50">
                            {searchResults.map((place, i) => (
                                <button
                                    key={place.id}
                                    onClick={() => handleSearchSelect(place)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                    style={{ borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                >
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                        style={{ background: place.category ? getColor(place.category.id) + '20' : '#f3f4f6' }}>
                                        <span>{place.category?.icon || '📍'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{place.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                                {place.category?.categoryName}
                                            </p>
                                            <p className="text-[10px] text-gray-400 truncate">
                                                {getDescriptionSnippet(place.description, searchInput)}
                                            </p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Zero-result empty state */}
                    {showSearchResults && searchInput.trim() && searchResults.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-50 px-4 py-5 text-center">
                            <p className="text-gray-500 text-sm">No places found for &quot;{searchInput}&quot;</p>
                            <p className="text-gray-400 text-xs mt-1 italic">{pickMentorLine('emptyResults')}</p>
                        </div>
                    )}
                </div>

                {/* Category Filter Chips (hidden to declutter; kept for later) */}
                {SHOW_CATEGORY_CHIPS && categories.length > 0 && addMode === 'idle' && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map(cat => {
                            const color = getColor(cat.id)
                            const active = selectedCategoryIds.includes(cat.id)
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                                    style={{
                                        background: active ? color : 'rgba(5,3,10,0.78)',
                                        color: '#fff',
                                        border: `1px solid ${active ? color : 'rgba(0,240,255,0.35)'}`,
                                        boxShadow: active ? `0 0 16px ${color}` : '0 0 8px rgba(0,240,255,0.18)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <span>{cat.icon || '📍'}</span>
                                    <span>{cat.categoryName}</span>
                                    <span className="opacity-70 hidden sm:inline">· {getCursedTerritoryName(cat.categoryName)}</span>
                                    {(cat.placeCount || 0) > 0 && (
                                        <span className="ml-0.5 opacity-70">({cat.placeCount})</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
            )}

            {/* ─── PROFILE BUTTON ─── */}
            {!navigateToPlace && addMode === 'idle' && (
                <div className="absolute top-4 right-4 z-20">
                    <Link href="/profile" className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 transition-all backdrop-blur-md border border-white/20 rounded-full px-2 py-2 pr-4 shadow-lg group">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner" style={{ background: 'linear-gradient(135deg, #2563ff, #ff1f4b)', boxShadow: '0 0 12px rgba(0,240,255,0.6)' }}>
                            {currentUser ? currentUser.name.charAt(0).toUpperCase() : '👤'}
                        </div>
                    </Link>
                </div>
            )}

            {/* Pin drop instructions now handled by unified draggable bar in MapLibreCampusMap */}

            {/* ─── PLACE DETAIL PANEL ─── */}
            {selectedPlace && addMode === 'idle' && (
                <div className="absolute bottom-0 left-0 right-0 md:left-4 md:bottom-4 md:right-auto z-40 md:w-96">
                    <div className="bg-white md:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-hidden"
                        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        {/* Drag handle (mobile) - just visual now */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                            <div className="px-5 pb-6 pt-2 max-h-[75vh] overflow-y-auto overflow-x-hidden">
                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ background: selectedPlace.category ? getColor(selectedPlace.category.id) + '18' : '#f3f4f6' }}>
                                        <span>{selectedPlace.category?.icon || '📍'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedPlace.name}</h2>
                                        {selectedPlace.category && (
                                            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                                style={{
                                                    background: getColor(selectedPlace.category.id) + '18',
                                                    color: getColor(selectedPlace.category.id)
                                                }}>
                                                {selectedPlace.category.categoryName}
                                                <span className="opacity-70"> · {getCursedTerritoryName(selectedPlace.category.categoryName)}</span>
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setSelectedPlace(null)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Description */}
                                {selectedPlace.description && (
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-3">
                                        {selectedPlace.description}
                                    </p>
                                )}

                                {/* Info chips */}
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {selectedPlace.block && (
                                        <span className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-100">
                                            🏢 <span>{selectedPlace.block.name}</span>
                                        </span>
                                    )}
                                    {selectedPlace.latitude && (
                                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-100">
                                            📌 <span>GPS Located</span>
                                        </span>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2.5">
                                    <button
                                        onClick={() => {
                                            if (selectedPlace.latitude && selectedPlace.longitude) {
                                                sfx.route()
                                                // With the guide out, the route starts where the guide floats
                                                const c = guideActive ? mapObj?.getCenter() : null
                                                setNavOrigin(c ? { lat: c.lat, lng: c.lng } : null)
                                                setNavigateToPlace({ ...selectedPlace })
                                                setFlyToPlace(null)
                                                setSelectedPlace(null)
                                            }
                                        }}
                                        className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        Navigate
                                    </button>
                                    {tourForPlace(selectedPlace) && (
                                        <button
                                            onClick={() => {
                                                const hit = tourForPlace(selectedPlace)
                                                if (hit) { setTourPortal(null); setTourOpen(hit) }
                                            }}
                                            className="px-4 py-3 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                            style={{ background: 'linear-gradient(135deg, #b3001f, #ff1f4b)', boxShadow: '0 0 16px rgba(255,31,75,0.55)' }}
                                        >
                                            👁 360°
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedPlace(null)}
                                        className="px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                                    >
                                        Close
                                    </button>
                                </div>

                                <hr className="my-5 border-gray-100" />

                                {/* Photos Section */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-900 text-sm">Photos</h3>
                                        {addingPhotoPlaceId !== selectedPlace.id && (
                                            <button
                                                onClick={() => {
                                                    if (!currentUser) { router.push('/login?redirect=/map'); return }
                                                    if (!currentUser.emailVerified) return; // Banner handles the warning
                                                    setAddingPhotoPlaceId(selectedPlace.id)
                                                }}
                                                disabled={!!(currentUser && !currentUser.emailVerified)}
                                                className={`text-xs font-semibold transition-colors ${currentUser && !currentUser.emailVerified ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                                            >
                                                {currentUser && !currentUser.emailVerified ? 'Verify to Add' : '+ Add Photo'}
                                            </button>
                                        )}
                                    </div>
                                    
                                    {addingPhotoPlaceId === selectedPlace.id && (
                                        <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <ImageUpload onImageSelect={(_, b64) => setNewPhotoBase64(b64)} className="w-full h-32 rounded-lg border-2 border-dashed bg-white overflow-hidden shadow-inner mb-3 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors" />
                                            <div className="flex gap-2">
                                                <button onClick={() => {setAddingPhotoPlaceId(null); setNewPhotoBase64(null)}} className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200">Cancel</button>
                                                <button onClick={handleSubmitPhoto} disabled={!newPhotoBase64 || isSubmittingPhoto} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 disabled:opacity-50">Upload</button>
                                            </div>
                                        </div>
                                    )}

                                    {isDetailLoading && !selectedPlace.mainPhoto ? (
                                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                                            {[1, 2, 3].map((i: number) => (
                                                <div key={i} className="w-28 h-28 flex-shrink-0 rounded-xl bg-gray-100 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (selectedPlace.photos && selectedPlace.photos.length > 0) || selectedPlace.mainPhoto ? (
                                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                                            {/* If we have full photos, show them all */}
                                            {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                                                selectedPlace.photos.map((photo, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100/50 cursor-pointer hover:scale-105 transition-transform relative"
                                                        onClick={() => setFullscreenPhotoUrl(photo.photoUrl)}
                                                    >
                                                        <Image
                                                            src={photo.photoUrl}
                                                            alt="Location"
                                                            fill
                                                            className="object-cover select-none"
                                                            sizes="112px"
                                                        />
                                                    </div>
                                                ))
                                            ) : selectedPlace.mainPhoto ? (
                                                /* If we only have mainPhoto (initial load), show it + skeletons */
                                                <>
                                                    <div
                                                        className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100/50 cursor-pointer hover:scale-105 transition-transform relative"
                                                        onClick={() => setFullscreenPhotoUrl(selectedPlace.mainPhoto!)}
                                                    >
                                                        <Image
                                                            src={selectedPlace.mainPhoto}
                                                            alt="Location"
                                                            fill
                                                            className="object-cover select-none"
                                                            sizes="112px"
                                                        />
                                                    </div>
                                                    {isDetailLoading && [1, 2].map(i => (
                                                        <div key={i} className="w-28 h-28 flex-shrink-0 rounded-xl bg-gray-100 animate-pulse" />
                                                    ))}
                                                </>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No photos yet.</p>
                                    )}
                                </div>

                                {/* Reviews Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900 text-sm">Reviews</h3>
                                            {selectedPlace.reviews && selectedPlace.reviews.length > 0 && (
                                                <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                                    ⭐ {(selectedPlace.reviews.reduce((acc, r) => acc + r.rating, 0) / selectedPlace.reviews.length).toFixed(1)} 
                                                    <span className="opacity-60 font-normal">({selectedPlace.reviews.length})</span>
                                                </span>
                                            )}
                                        </div>
                                        {reviewingPlaceId !== selectedPlace.id && (
                                            <button
                                                onClick={() => {
                                                    if (!currentUser) { router.push('/login?redirect=/map'); return }
                                                    if (!currentUser.emailVerified) return;
                                                    setReviewingPlaceId(selectedPlace.id)
                                                }}
                                                disabled={!!(currentUser && !currentUser.emailVerified)}
                                                className={`text-xs font-semibold transition-colors ${currentUser && !currentUser.emailVerified ? 'text-gray-300 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800'}`}
                                            >
                                                {currentUser && !currentUser.emailVerified ? 'Verify to Review' : 'Write a Review'}
                                            </button>
                                        )}
                                    </div>

                                    {reviewingPlaceId === selectedPlace.id && (
                                        <div className="mb-5 bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                                            <div className="flex gap-1 mb-3">
                                                {[1,2,3,4,5].map(star => (
                                                    <button key={star} onClick={() => setReviewRating(star)} className={`text-xl transition-all ${reviewRating >= star ? 'text-amber-400 drop-shadow-sm scale-110' : 'text-gray-300'}`}>⭐</button>
                                                ))}
                                            </div>
                                            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share details of your experience..." rows={3} className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3 resize-none bg-white placeholder-gray-400" />
                                            <div className="flex gap-2">
                                                <button onClick={() => {setReviewingPlaceId(null); setReviewComment(''); setReviewRating(5)}} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                                <button onClick={handleSubmitReview} disabled={!reviewComment.trim() || isSubmittingReview} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 disabled:opacity-50 transition-all hover:bg-indigo-700">Submit Review</button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {isDetailLoading ? (
                                            [1, 2].map((i: number) => (
                                                <div key={i} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0 animate-pulse">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-6 h-6 rounded-full bg-gray-100" />
                                                        <div className="h-3 w-20 bg-gray-100 rounded" />
                                                    </div>
                                                    <div className="h-3 w-full bg-gray-100 rounded mb-1" />
                                                    <div className="h-3 w-2/3 bg-gray-100 rounded" />
                                                </div>
                                            ))
                                        ) : selectedPlace.reviews && selectedPlace.reviews.length > 0 ? (
                                            selectedPlace.reviews.map(review => (
                                                <div key={review.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                                {review.user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <span className="font-semibold text-gray-800 text-sm">{review.user.name}</span>
                                                            {currentUser?.id === review.user.id && (
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">You</span>
                                                            )}
                                                        </div>
                                                        <div className="flex text-[10px] text-amber-400 drop-shadow-sm gap-[1px]">
                                                            {Array(5).fill(0).map((_, i) => <span key={i} className={i < review.rating ? 'opacity-100' : 'opacity-30 grayscale'}>⭐</span>)}
                                                        </div>
                                                    </div>
                                                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to review!</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                </div>
            )}

            {/* ─── ADD PLACE FORM MODAL (centered popup) ─── */}
            {addMode === 'form' && pinnedCoords && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelAdd} />
                    <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
                        style={{ background: '#1a1f3a', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'fadeIn 0.25s ease-out' }}>

                        {/* Header */}
                        <div className="px-5 pt-4 pb-4 border-b border-white/8 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">📍</div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">Add New Place</h3>
                                        <p className="text-white/70 text-xs">{pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}</p>
                                    </div>
                                </div>
                                <button onClick={cancelAdd}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Form content */}
                        <div className="overflow-y-auto flex-1">
                            <div className="px-5 py-4 space-y-4">
                                {submitSuccess ? (
                                    <div className="py-10 text-center">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-gentle">
                                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h4 className="font-bold text-white text-lg">Place Submitted!</h4>
                                        <p className="text-white/50 text-sm mt-1">Awaiting admin approval.</p>
                                    </div>
                                ) : (
                                    <>
                                        {submitError && (
                                            <div className="flex flex-col gap-1 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
                                                <div className="flex items-center gap-2.5">
                                                    <span>⚠️</span> {submitError}
                                                </div>
                                                <p className="text-xs italic text-red-300/60">{pickMentorLine('errorInterference')}</p>
                                            </div>
                                        )}

                                        {/* Place Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Place Name *</label>
                                            <input
                                                type="text"
                                                value={addForm.name}
                                                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. UIET Computer Lab"
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium transition-all text-white placeholder-white/25"
                                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Description</label>
                                            <textarea
                                                value={addForm.description}
                                                onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                                                placeholder="Brief description of this place..."
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all resize-none text-white placeholder-white/25"
                                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                        </div>

                                        {/* Photos Upload */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Photos (Optional)</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {addForm.photos.map((photo, index) => (
                                                    <ImageUpload 
                                                        key={`photo-${index}`}
                                                        currentImage={photo}
                                                        onImageSelect={(_, b64) => {
                                                            if (!b64) {
                                                                setAddForm(p => ({ ...p, photos: p.photos.filter((_, i) => i !== index) }))
                                                            } else {
                                                                const newPhotos = [...addForm.photos]
                                                                newPhotos[index] = b64
                                                                setAddForm(p => ({ ...p, photos: newPhotos }))
                                                            }
                                                        }}
                                                        className="w-full rounded-xl overflow-hidden border border-white/12"
                                                    />
                                                ))}
                                                <ImageUpload 
                                                    key={`new-photo-${addForm.photos.length}`}
                                                    onImageSelect={(_, b64) => {
                                                        if (b64) {
                                                            setAddForm(p => ({ ...p, photos: [...p.photos, b64] }))
                                                        }
                                                    }}
                                                    className="w-full rounded-xl overflow-hidden border border-white/12 border-dashed"
                                                />
                                            </div>
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Category *</label>
                                            {!showNewCat ? (
                                                <div className="space-y-2">
                                                    <select
                                                        value={addForm.categoryId}
                                                        onChange={e => {
                                                            if (e.target.value === '__new__') { setShowNewCat(true); return }
                                                            setAddForm(p => ({ ...p, categoryId: e.target.value }))
                                                        }}
                                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all text-white"
                                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                    >
                                                        <option value="" className="bg-gray-900">Select a category...</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.icon} {cat.categoryName}</option>
                                                        ))}
                                                        <option value="__new__" className="bg-gray-900">✨ Create new category...</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold text-indigo-300 text-sm">✨ New Category</p>
                                                        <button onClick={() => setShowNewCat(false)} className="text-indigo-400 hover:text-indigo-200 text-xs transition-colors">Cancel</button>
                                                    </div>
                                                    {catError && <p className="text-red-400 text-xs">{catError}</p>}
                                                    <input
                                                        type="text"
                                                        value={newCatName}
                                                        onChange={e => setNewCatName(e.target.value)}
                                                        placeholder="Category name"
                                                        className="w-full px-3 py-2.5 rounded-xl outline-none text-sm text-white placeholder-white/30"
                                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(99,102,241,0.25)' }}
                                                    />
                                                    <div>
                                                        <p className="text-xs text-indigo-400 mb-2">Choose icon:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {COMMON_EMOJIS.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => setNewCatIcon(emoji)}
                                                                    className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                                                                    style={{
                                                                        background: newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.06)',
                                                                        border: `2px solid ${newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                                        transform: newCatIcon === emoji ? 'scale(1.1)' : 'scale(1)'
                                                                    }}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleCreateCategory}
                                                        disabled={!newCatName.trim() || creatingCat}
                                                        className="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                                                    >
                                                        {creatingCat ? 'Creating...' : 'Create Category'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Block (only if blocks exist) */}
                                        {blocks.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Building / Block <span className="font-normal normal-case text-white/25">(optional)</span></label>
                                                <select
                                                    value={addForm.blockId}
                                                    onChange={e => setAddForm(p => ({ ...p, blockId: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all text-white"
                                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                >
                                                    <option value="" className="bg-gray-900">No specific building</option>
                                                    {blocks.map(b => (
                                                        <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Coordinates display */}
                                        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <span className="text-green-400">📌</span>
                                            <div>
                                                <p className="text-xs font-semibold text-green-400">Location Pinned</p>
                                                <p className="text-xs text-green-400/60 font-mono mt-0.5">
                                                    {pinnedCoords.lat.toFixed(6)}, {pinnedCoords.lng.toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer actions */}
                        {!submitSuccess && (
                            <div className="px-5 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                <button
                                    onClick={cancelAdd}
                                    className="flex-1 py-3 text-sm font-semibold text-white/50 hover:text-white rounded-xl hover:bg-white/8 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitPlace}
                                    disabled={isSubmitting || !addForm.name.trim() || !addForm.categoryId}
                                    className="flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Submitting...
                                        </span>
                                    ) : 'Submit for Review →'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── FLOATING BOTTOM-LEFT BUTTONS ─── */}
            {addMode === 'idle' && !navigateToPlace && !guideActive && (
                <div className="absolute left-4 bottom-8 z-30 flex items-center gap-2">
                    {/* Add Place — icon-only + button */}
                    <button
                        onClick={enterPinDrop}
                        className="w-11 h-11 flex items-center justify-center rounded-full text-white font-bold transition-all hover:scale-110 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            boxShadow: '0 4px 18px rgba(99,102,241,0.55)'
                        }}
                        title="Add new place"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    {/* About link (hidden to declutter) */}
                    {SHOW_EXTRA_BUTTONS && <Link
                        href="/about"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-white text-xs font-semibold transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
                        style={{
                            background: 'rgba(15,23,42,0.70)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.25)'
                        }}
                    >
                        <span className="text-[11px]">ℹ️</span>
                        <span>About</span>
                    </Link>}
                    {SHOW_EXTRA_BUTTONS && currentUser?.role === 'ADMIN' && !naming && (
                        <button onClick={() => { setShareOpen(false); setSelectedPlace(null); setNaming(true) }}
                            className="flex items-center gap-1.5 border border-amber-400/60 bg-black/70 px-3 py-2 text-xs font-black tracking-widest text-amber-300 backdrop-blur-md hover:bg-amber-400/10"
                            title="Admin: tap buildings to name them">
                            <span className="jjk-font">名</span> NAME BLOCKS
                        </button>
                    )}
                </div>
            )}

            {/* ─── ADMIN: NAME THIS BLOCK ─── */}
            <BlockNamer
                active={naming}
                target={namerTarget}
                placed={placedNames}
                saving={namerSaving}
                lastSaved={namerSaved}
                error={namerError}
                onPick={saveBlockName}
                onRemove={removeBlockName}
                onExit={() => setNaming(false)}
            />

            {/* Cancel pin drop button now handled by unified draggable bar */}

            {/* No places yet info */}
            {!isLoading && placesWithCoords.length === 0 && addMode === 'idle' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md text-white/80 px-5 py-3 rounded-2xl text-sm text-center border border-white/10">
                        <p className="font-medium">No places pinned yet</p>
                        <p className="text-white/50 text-xs mt-0.5">Tap + to add your first location</p>
                        <p className="text-xs mt-1.5 italic" style={{ color: 'var(--cn-text-3, rgba(255,255,255,0.4))' }}>{pickMentorLine('emptyResults')}</p>
                    </div>
                </div>
            )}

            {/* ─── FULLSCREEN PHOTO LIGHTBOX ─── */}
            {fullscreenPhotoUrl && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.96)' }}
                    onClick={() => setFullscreenPhotoUrl(null)}
                >
                    <div className="relative inline-flex items-center justify-center" onClick={e => e.stopPropagation()}>
                        <div className="relative h-[50vh] md:h-[65vh] aspect-[4/3] md:aspect-video w-auto max-w-[95vw]">
                            <Image
                                src={fullscreenPhotoUrl}
                                alt="Full view"
                                fill
                                className="rounded-2xl shadow-2xl object-contain select-none"
                                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                                priority
                            />
                        </div>
                        <button
                            onClick={() => setFullscreenPhotoUrl(null)}
                            className="absolute -top-4 -right-4 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all hover:scale-110 z-[110]"
                            style={{ background: 'rgba(239,68,68,0.95)', boxShadow: '0 4px 20px rgba(239,68,68,0.6)' }}
                        >
                            ✕
                        </button>
                    </div>
                    <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/30 text-[10px] uppercase tracking-widest pointer-events-none">Click anywhere outside to close</p>
                </div>
            )}

            {/* ─── FLOATING GUIDE ─── */}
            {guideActive && mapAlive(mapObj) && (
                <CursedGuide
                    map={mapObj}
                    route={navigateToPlace ? routeCoords : null}
                    follow={guideFollow}
                    followSpeed={guideSpeed}
                    paused={!!tourOpen || !!arrival}
                    targetName={navigateToPlace?.name}
                    onFollowChange={setGuideFollow}
                    onStep={p => veil.reveal(p, REVEAL_RADIUS.trail)}
                    onArrive={() => { if (navigateToPlace) handleArrive(navigateToPlace) }}
                    onExit={toggleGuide}
                />
            )}

            {/* ─── SQUAD LIVE LOCATION ─── */}
            {mapAlive(mapObj) && squad.sharing && (
                <SquadMarkers map={mapObj} members={squad.members} me={squad.me} showSelf={!guideActive} onSelect={flyToMember} />
            )}
            {addMode === 'idle' && (
                <SquadPanel open={shareOpen} squad={squad} onClose={() => setShareOpen(false)} onFlyTo={flyToMember} />
            )}

            {/* ─── FIRST-VISIT FEATURE TOUR ─── */}
            <VeilOnboarding open={onboardOpen && !introOpen} onClose={() => setOnboardOpen(false)} />

            {/* ─── SORCERER GUIDE: game-style intro, barks, AI chat ─── */}
            <GuideDialog guide={guide} lines={guide.intro} open={introOpen && !tourOpen && !arrival} onClose={closeIntro}
                actions={[{ label: `Ask ${guideShort(guide)}`, primary: true, onClick: () => { closeIntro(); setChatOpen(true) } }]} />
            <GuideDialog key={bark?.id} guide={guide} lines={bark ? [bark.text] : []} bark
                open={!!bark && !introOpen && !chatOpen && !tourOpen && !arrival && !onboardOpen} onClose={() => setBark(null)} />
            <GuideChat guide={guide} open={chatOpen} onOpenChange={setChatOpen}
                hidden={addMode !== 'idle' || naming || !!tourOpen || !!arrival || introOpen || demoRunning}
                getOrigin={chatOrigin} onNavigate={chatNavigate} onShow={chatShow} onGuideChange={changeGuide} />

            {/* ─── ARRIVAL: TERRITORY RECLAIMED ─── */}
            <AnimatePresence>
                {arrival && <ArrivalBurst key={arrival.id} placeName={arrival.name} onDone={finishArrival} />}
            </AnimatePresence>

            {/* ─── 360° TOUR: proximity portal + fullscreen domain ─── */}
            <AnimatePresence>
                {tourPortal && !tourOpen && addMode === 'idle' && !navigateToPlace && (
                    <Veil360Portal
                        key={tourPortal.spot.sceneId}
                        scene={tourPortal.scene}
                        placeName={tourPortal.spot.name}
                        onEnter={() => { setTourOpen(tourPortal); setTourPortal(null) }}
                        onDismiss={() => { tourDismissedId.current = tourPortal.spot.sceneId; setTourPortal(null) }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {tourOpen && (
                    <Veil360Domain
                        key={tourOpen.spot.sceneId}
                        scene={tourOpen.scene}
                        placeName={tourOpen.spot.name}
                        onClose={closeTour}
                    />
                )}
            </AnimatePresence>

            {/* ─── DOMAIN EXPANSION EASTER EGG (Task 30 — lowest priority) ─── */}
            {SHOW_DOMAIN_TRIGGER && !selectedPlace && addMode === 'idle' && !navigateToPlace && !guideActive && <DomainExpansionTrigger
                onActivate={() => setDomainExpansionActive(true)}
                disabled={domainExpansionActive}
            />}
            <DomainExpansionSequence
                active={domainExpansionActive}
                onComplete={endDomainExpansion}
            />

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(120%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes bounceGentle {
                    0%, 100% { transform: translateY(0) translateX(-50%); }
                    50% { transform: translateY(-6px) translateX(-50%); }
                }
                .animate-bounce-gentle {
                    animation: bounceGentle 2s ease-in-out infinite;
                }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .place-marker { will-change: transform; }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    )
}

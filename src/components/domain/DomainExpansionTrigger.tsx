'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const HOLD_THRESHOLD_MS = 1200
const DISCOVERY_TOOLTIP_KEY = 'domain-expansion-discovered'

interface DomainExpansionTriggerProps {
    /** Called exactly once, the moment the hold duration crosses the threshold. */
    onActivate: () => void
    /** Disable interaction while a sequence is already in flight. */
    disabled?: boolean
}

/**
 * Domain_Expansion_Trigger — the fixed-position cursed-seal glyph button in
 * the bottom-right corner of the NAVIGATE_Surface (map page).
 *
 * Pure interaction/timer logic per design §5.2:
 *   - `pointerdown` starts a 1200ms hold timer (measured via `performance.now()`
 *     on each animation frame, not a single `setTimeout`, so the radial
 *     conic-gradient fill progress affordance can track elapsed/1200ms smoothly).
 *   - `pointerup` / `pointerleave` / `pointercancel` before the threshold
 *     cancels the pending activation (Requirement 8.2) — no sequence starts,
 *     the glyph just snaps back from its press-scale.
 *   - Reaching the threshold calls `onActivate()` exactly once; continuing to
 *     hold past the threshold does not call it again (Requirement 8.1/8.2,
 *     Property 3).
 *
 * A one-time discovery tooltip ("Something's sealed here. Try holding it.")
 * shows until the user has triggered the sequence once, persisted via
 * localStorage so it doesn't reappear on subsequent visits.
 */
export default function DomainExpansionTrigger({ onActivate, disabled = false }: DomainExpansionTriggerProps) {
    const [holdProgress, setHoldProgress] = useState(0) // 0..1
    const [isHolding, setIsHolding] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    const holdStartRef = useRef<number | null>(null)
    const rafRef = useRef<number | null>(null)
    const activatedRef = useRef(false)
    // Holds the latest `tick` implementation so the rAF loop can call itself
    // recursively without the function body referencing its own `const`
    // binding directly (avoids a same-scope self-reference).
    const tickRef = useRef<() => void>(() => {})

    useEffect(() => {
        // Intentional one-time client-only localStorage read (unavailable
        // during SSR) that gates whether the discovery tooltip shows.
        try {
            const discovered = localStorage.getItem(DISCOVERY_TOOLTIP_KEY)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (!discovered) setShowTooltip(true)
        } catch {
            // localStorage unavailable (e.g. private mode) — skip the tooltip gracefully.
        }
    }, [])

    const dismissTooltip = useCallback(() => {
        setShowTooltip(false)
        try {
            localStorage.setItem(DISCOVERY_TOOLTIP_KEY, 'true')
        } catch {
            // ignore
        }
    }, [])

    const tick = useCallback(() => {
        if (holdStartRef.current === null) return
        const elapsed = performance.now() - holdStartRef.current
        const progress = Math.min(elapsed / HOLD_THRESHOLD_MS, 1)
        setHoldProgress(progress)

        if (progress >= 1 && !activatedRef.current) {
            activatedRef.current = true
            dismissTooltip()
            onActivate()
            return // stop scheduling further frames — threshold reached exactly once
        }

        if (progress < 1) {
            rafRef.current = requestAnimationFrame(() => tickRef.current())
        }
    }, [onActivate, dismissTooltip])

    // Keep the ref pointed at the latest `tick` closure. Done in an effect
    // (not directly during render) so the ref update never happens during
    // the render phase itself.
    useEffect(() => {
        tickRef.current = tick
    }, [tick])

    const startHold = useCallback(() => {
        if (disabled) return
        activatedRef.current = false
        holdStartRef.current = performance.now()
        setIsHolding(true)
        setHoldProgress(0)
        rafRef.current = requestAnimationFrame(() => tickRef.current())
    }, [disabled])

    const cancelHold = useCallback(() => {
        holdStartRef.current = null
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
        setIsHolding(false)
        setHoldProgress(0)
    }, [])

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
        }
    }, [])

    // Radial conic-gradient fill progress affordance (design §5.2).
    const fillDeg = holdProgress * 360

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2" data-testid="domain-expansion-trigger-root">
            {showTooltip && (
                <div
                    className="cn-glass max-w-[200px] px-3 py-2 text-xs"
                    style={{ color: 'var(--cn-text-2)' }}
                    data-testid="domain-expansion-discovery-tooltip"
                >
                    Something&apos;s sealed here. Try holding it.
                </div>
            )}

            <button
                type="button"
                aria-label="Domain Expansion seal — press and hold"
                data-testid="domain-expansion-trigger"
                disabled={disabled}
                className="cn-seal relative flex h-14 w-14 items-center justify-center rounded-full select-none transition-transform"
                style={{
                    background: 'var(--cn-surface)',
                    border: '1px solid var(--cn-accent-purple)',
                    boxShadow: 'var(--cn-shadow-glow-purple)',
                    transform: isHolding ? 'scale(0.95)' : 'scale(1)',
                    touchAction: 'none',
                }}
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId)
                    startHold()
                }}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
            >
                {/* Radial fill progress ring */}
                <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: `conic-gradient(var(--cn-accent-purple) ${fillDeg}deg, transparent ${fillDeg}deg)`,
                        opacity: isHolding ? 0.55 : 0,
                        transition: isHolding ? 'none' : 'opacity 150ms ease-out',
                    }}
                />
                <span className="relative text-xl" aria-hidden="true">
                    🌀
                </span>
            </button>
        </div>
    )
}

export { HOLD_THRESHOLD_MS }

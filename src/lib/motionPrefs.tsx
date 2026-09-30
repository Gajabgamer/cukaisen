'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type MotionPrefs = {
  reducedMotion: boolean
  lowCapability: boolean
}

const defaultMotionPrefs: MotionPrefs = { reducedMotion: false, lowCapability: false }

const MotionPrefsContext = createContext<MotionPrefs>(defaultMotionPrefs)

/**
 * Provides `{ reducedMotion, lowCapability }` to the whole app from a single
 * source of truth, computed once on mount (see design §7.4).
 *
 * Defaults to `{ reducedMotion: false, lowCapability: false }` before mount
 * so server-rendered markup and the initial client render match (no
 * hydration mismatch) — the real values are only known client-side.
 */
export function MotionPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<MotionPrefs>(defaultMotionPrefs)

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false

    // Coarse device-capability heuristic: low memory, few logical cores, or a
    // slow network connection. `navigator` here is cast loosely since
    // `deviceMemory` / `connection` aren't in the standard lib.dom types.
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & {
      deviceMemory?: number
      connection?: { effectiveType?: string }
    }) : undefined

    const lowCapability = Boolean(
      (nav?.deviceMemory && nav.deviceMemory <= 4) ||
      (nav?.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
      (nav?.connection?.effectiveType && ['slow-2g', '2g', '3g'].includes(nav.connection.effectiveType))
    )

    // Intentional one-time client-only detection (matchMedia/navigator
    // aren't available during SSR); deferring to an effect avoids a
    // hydration mismatch that a lazy useState initializer computing this
    // eagerly would introduce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs({ reducedMotion, lowCapability })
  }, [])

  return (
    <MotionPrefsContext.Provider value={prefs}>
      {children}
    </MotionPrefsContext.Provider>
  )
}

export const useMotionPrefs = () => useContext(MotionPrefsContext)

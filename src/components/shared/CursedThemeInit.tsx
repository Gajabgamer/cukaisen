'use client'
import { useCursedTheme } from '@/lib/useCursedTheme'

/**
 * Tiny client component that mounts `useCursedTheme()` at the root.
 * Rendered from the (server) root layout so `layout.tsx` itself
 * doesn't need to become a client component.
 */
export default function CursedThemeInit() {
    useCursedTheme()
    return null
}

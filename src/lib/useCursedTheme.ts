'use client'
import { useEffect } from 'react'

/**
 * Sets `data-theme="cursed"` on the document root once on mount.
 * Replaces the old light/dark `useTheme` hook — there is now only
 * one theme, so there is no toggle function and no `campusnav-theme`
 * localStorage key. Most components don't need to import this at all
 * since the CSS tokens in globals.css do the work; it exists only to
 * set the attribute once at root.
 */
export function useCursedTheme() {
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'cursed')
    }, [])
}

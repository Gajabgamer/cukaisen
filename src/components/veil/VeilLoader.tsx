'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, animate } from 'framer-motion'
import { useMotionPrefs } from '@/lib/motionPrefs'
import { pickMentorLine } from '@/lib/lore/mentorCopy'

const VEIL_VISITED_KEY = 'veil-visited'
const MAX_DURATION_MS = 4000
const TITLE_TEXT = 'THE VEIL'

/**
 * The Veil Loader — full-screen cursed-mist intro reveal shown on first
 * visit only. See design.md §3.1–§3.6 for the full timeline/spec.
 *
 * - First-visit gating (§3.4): checks `localStorage['veil-visited']` on
 *   mount; renders nothing at all (no DOM) on repeat visits.
 * - Hybrid progress (§3.3): `document.fonts.ready` advances progress to
 *   ~80%, then a fixed tween covers the remaining 80→100%.
 * - Reduced motion (§3.5): clip-path wipe + per-character fly-in collapse
 *   to opacity cross-fades of equal-or-shorter duration.
 * - Max-duration failsafe (§3.6): a 4000ms timer force-dismisses the
 *   loader regardless of progress/font-load state.
 */
export default function VeilLoader() {
  const { reducedMotion, lowCapability } = useMotionPrefs()
  const reduceMotionBranch = reducedMotion || lowCapability

  // `null` = still checking localStorage (avoid any flash), `false` = don't
  // show (already visited), `true` = show the full intro.
  const [shouldShow, setShouldShow] = useState<boolean | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const mentorLine = useRef(pickMentorLine('loaderIntro'))
  const progressMotionValue = useMotionValue(0)
  const dismissedRef = useRef(false)

  useEffect(() => {
    let seen: string | null = null
    try {
      seen = localStorage.getItem(VEIL_VISITED_KEY)
    } catch {
      // localStorage unavailable (e.g. privacy mode) — treat as first visit
      seen = null
    }
    setShouldShow(!seen)
  }, [])

  const dismiss = () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    // Write the visited flag the moment dismissal is *initiated*, not once
    // the exit animation visually finishes. The gating requirement (design
    // §3.4, Requirement 2.7) only needs the flag set so future loads skip
    // the loader — it doesn't depend on animation completion, and tying it
    // to `onExitComplete` made the write depend on Framer Motion's
    // rAF-driven exit animation actually running to completion (fine in a
    // real browser, but not guaranteed under all test/timer conditions).
    try {
      localStorage.setItem(VEIL_VISITED_KEY, 'true')
    } catch {
      // ignore write failures (privacy mode, quota, etc.)
    }
    setIsExiting(true)
  }

  const handleExitComplete = () => {
    setShouldShow(false)
  }

  // Hybrid real/simulated progress tracking (design §3.3).
  useEffect(() => {
    if (shouldShow !== true) return

    let cancelled = false
    const controls = { current: null as ReturnType<typeof animate> | null }

    const fontsReady: Promise<unknown> =
      typeof document !== 'undefined' && document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve()

    // Dismissal timing is driven by a plain `setTimeout` chain rather than
    // by the Framer Motion `animate()` calls' `onComplete` callbacks. The
    // visual progress-bar tween below is purely cosmetic (design §3.3) —
    // decoupling *when we dismiss* from *when the cosmetic tween finishes*
    // keeps dismissal timing deterministic and independent of the
    // animation library's internal (rAF-driven) scheduler, consistent with
    // how the exit-animation-complete write was decoupled above.
    const toMs = (seconds: number) => Math.round(seconds * 1000)
    const firstLegDuration = reduceMotionBranch ? 0.2 : 0.4
    const secondLegDuration = reduceMotionBranch ? 0.2 : 0.4
    let secondLegTimer: ReturnType<typeof setTimeout> | null = null

    fontsReady.then(() => {
      if (cancelled) return
      // Genuine signal reached — animate 0 -> 80 quickly, then tween the
      // simulated remainder 80 -> 100 (cosmetic only).
      controls.current = animate(progressMotionValue, 80, {
        duration: firstLegDuration,
        ease: 'easeOut',
        onUpdate: (v) => {
          if (!cancelled) setProgress(Math.round(v))
        },
      })

      secondLegTimer = setTimeout(() => {
        if (cancelled) return
        controls.current = animate(progressMotionValue, 100, {
          duration: secondLegDuration,
          ease: 'easeInOut',
          onUpdate: (v) => {
            if (!cancelled) setProgress(Math.round(v))
          },
        })
        dismiss()
      }, toMs(firstLegDuration))
    })

    return () => {
      cancelled = true
      controls.current?.stop()
      if (secondLegTimer) clearTimeout(secondLegTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow])

  // 4000ms max-duration failsafe (design §3.6) — force-dismiss regardless
  // of progress/font-load state.
  useEffect(() => {
    if (shouldShow !== true) return
    const failsafe = setTimeout(() => {
      dismiss()
    }, MAX_DURATION_MS)
    return () => clearTimeout(failsafe)
  }, [shouldShow])

  if (shouldShow !== true) {
    return null
  }

  // Exit duration must be equal-or-shorter under reduced motion (Requirement 2.5).
  const exitTransition = reduceMotionBranch
    ? { duration: 0.3, ease: 'easeInOut' as const }
    : { duration: 0.4, ease: 'easeInOut' as const }

  const overlayBackground =
    'radial-gradient(circle at 50% 40%, rgba(139,92,246,0.25), var(--cn-bg) 70%)'

  // Reduced-motion branch: plain opacity cross-fade in/out, no clip-path.
  // Normal branch: clip-path wipe entrance (large circle) that wipes down
  // to nothing on exit (design §3.2 step 5 / §3.5).
  const initialState = reduceMotionBranch
    ? { opacity: 0 }
    : { opacity: 1, clipPath: 'circle(150% at 50% 50%)' }
  const animateState = reduceMotionBranch
    ? { opacity: 1 }
    : { opacity: 1, clipPath: 'circle(150% at 50% 50%)' }
  const exitState = reduceMotionBranch
    ? { opacity: 0 }
    : { opacity: 1, clipPath: 'circle(0% at 50% 50%)' }

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!isExiting && (
        <motion.div
          data-testid="veil-loader"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: overlayBackground }}
          initial={initialState}
          animate={animateState}
          exit={exitState}
          transition={exitTransition}
        >
          <VeilTitle reduceMotionBranch={reduceMotionBranch} />

          <div className="mt-8 flex w-64 items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--cn-border-soft)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--cn-accent-purple)' }}
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: 'linear' }}
              />
            </div>
            <span
              data-testid="veil-loader-counter"
              className="w-10 text-right text-sm tabular-nums"
              style={{ color: 'var(--cn-text-2)' }}
            >
              {progress}
            </span>
          </div>

          <motion.p
            className="mt-6 max-w-sm px-6 text-center text-sm"
            style={{ color: 'var(--cn-text-2)' }}
            initial={{ opacity: 0, y: reduceMotionBranch ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotionBranch ? 0.2 : 0.4, delay: reduceMotionBranch ? 0 : 0.2 }}
          >
            {mentorLine.current}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function VeilTitle({ reduceMotionBranch }: { reduceMotionBranch: boolean }) {
  const chars = TITLE_TEXT.split('')

  if (reduceMotionBranch) {
    return (
      <motion.h1
        className="cn-display text-4xl tracking-widest"
        style={{ color: 'var(--cn-text-1)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {TITLE_TEXT}
      </motion.h1>
    )
  }

  return (
    <h1 className="cn-display flex text-4xl tracking-widest" style={{ color: 'var(--cn-text-1)' }}>
      {chars.map((char, i) => {
        const isOdd = i % 2 === 0
        return (
          <motion.span
            key={i}
            initial={{ x: isOdd ? -80 : 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: i * 0.03,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
          >
            {char}
          </motion.span>
        )
      })}
    </h1>
  )
}

# Implementation Plan: THE VEIL — Cursed-Energy Reskin

## Overview

Convert the feature design into a series of prompts for a code-generation LLM that will implement each step with incremental progress. Each prompt builds on the previous prompts and ends with wiring things together — no hanging or orphaned code. Tasks are ordered for hackathon time pressure (demo: Sep 30 2026): (1) global token/theme system, since every other surface depends on it, (2) `Header.tsx` — the only component needing a real code change rather than a token swap, (3) Veil Loader — biggest single aesthetic wow-factor, (4) storyline/copy layer + `CursedArtifactSlot`, (5) per-surface restyling (DISCOVER/NAVIGATE/ARRIVE, admin, auth), (6) Domain Expansion easter egg — explicitly the lowest priority, first thing to cut if time runs short.

Tasks referencing photo *sourcing* are intentionally excluded (user handles that separately) — only the `CursedArtifactSlot` component and its 4 wiring points are in scope. No Prisma/schema tasks are included (none needed per design).

## Tasks

- [x] 1. Set up cursed design token foundation in `globals.css`
  - Replace `:root`, `[data-theme="light"]`, `[data-theme="dark"]` blocks in `src/app/globals.css` with a single `:root, [data-theme="cursed"]` block containing all tokens from design §1.2 (backgrounds, text, nav chrome, accent duo, status semantics, typography vars, spacing/radius/shadow, motion tokens)
  - Update `.maplibregl-ctrl-*` override selectors in `globals.css` to key off `--cn-*` tokens instead of hardcoded/dark-only values
  - Add `.cn-glass` and `.cn-seal` utility classes (with `cn-seal-spin` keyframe) per design §1.4
  - Add the global `@media (prefers-reduced-motion: reduce)` defense-in-depth block from design §7.4
  - _Requirements: 1.1, 1.2, 1.6_
  - _Design: §1.1, §1.2, §1.4_

- [x] 2. Add cursed typography
  - Copy `JujutsuKaisen.ttf` from `references/` into `public/fonts/JujutsuKaisen.ttf` (asset copy only, no cross-package runtime import)
  - Add `@font-face` declaration with `font-display: swap` and fallback stack (`'Cinzel', 'Bebas Neue', serif`) per design §1.3
  - Define `--font-display` / `--font-body` tokens and apply `h1, h2, h3, .cn-display` / `body, p, input, textarea, button` font-family rules
  - **NOTE — lower priority / cuttable**: this task reuses a third-party JJK font asset copied from `references/`. If licensing risk or time pressure requires cutting it, fall back to the existing fallback stack (`Cinzel`/`Bebas Neue`/serif) with no functional loss — the `@font-face` + fallback design already tolerates skipping this task.
  - _Requirements: 1.3, 1.4, 11.7_
  - _Design: §1.3_

- [x] 3. Build the motion-preferences and device-capability context
  - Create `src/lib/motionPrefs.tsx` implementing `MotionPrefsProvider` / `useMotionPrefs()` per design §7.4 (reads `prefers-reduced-motion` + coarse device-capability heuristic once on mount)
  - Mount `MotionPrefsProvider` in `src/app/layout.tsx` above where `VeilLoader` will be mounted
  - _Requirements: 1.7, 1.8, 11.3, 11.4_
  - _Design: §7.4_

  - [ ]* 3.1 Write property test for motion-gating branch behavior
    - **Property 10: Motion-affecting components branch before animating under reduced motion or low capability**
    - **Validates: Requirements 1.7, 1.8, 11.3, 11.4**
    - Test generates random combinations of the 5 effect-bearing components (conceptually, via a small harness) × reduced-motion/low-capability flags and asserts no animated/particle/trail elements render when either flag is true

- [x] 4. Replace `useTheme.ts` with `useCursedTheme.ts` and remove light/dark mechanism
  - Create `src/lib/useCursedTheme.ts` that sets `data-theme="cursed"` once on mount (no toggle, no `campusnav-theme` key)
  - Delete `src/lib/useTheme.ts`
  - Migrate `src/app/profile/page.tsx` and `src/app/about/page.tsx` off `useTheme` — remove `toggleTheme`/`isDark` theme-toggle UI and any conditional light/dark styling now made redundant by the single theme
  - _Requirements: 1.2_
  - _Design: §1.1, §7.2_

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Fix `Header.tsx` to consume cursed tokens
  - Replace hardcoded inline `style={{ background: ... }}` rgba values in `src/components/Header.tsx` with `var(--cn-nav-bg)`, `var(--cn-nav-border)`, `var(--cn-nav-shadow)`
  - Switch active nav-item accent from indigo to `var(--cn-accent-purple)`; introduce `--cn-accent-admin` token in `globals.css` (added in Task 1's token block if not already present) for the admin nav-item accent
  - Apply `.cn-glass` to the dropdown menu
  - _Requirements: 1.9_
  - _Design: §4 (Header.tsx row)_

  - [ ]* 6.1 Write unit tests for Header token rendering
    - Assert Header no longer references removed light/dark tokens and renders with `--cn-nav-*` values applied
    - _Requirements: 1.9_

- [x] 7. Build the Veil Loader intro reveal
  - Add `framer-motion` dependency to `package.json`
  - Create `src/components/veil/VeilLoader.tsx` implementing the timeline from design §3.2: mist gradient overlay, title fly-in, progress bar + numeric counter, one `loaderIntro` Mentor_Copy line, clip-path wipe reveal, unmount + `veil-visited` localStorage write
  - Implement hybrid real/simulated progress tracking per design §3.3 (`document.fonts.ready` + fixed tween for remainder)
  - Implement first-visit gating per design §3.4 (`veil-visited` localStorage check)
  - Implement reduced-motion branch per design §3.5 (opacity cross-fade replacing clip-path wipe, equal-or-shorter duration; title fly-in collapses to opacity fade)
  - Implement 4000ms max-duration failsafe per design §3.6
  - Mount `VeilLoader` once in `src/app/layout.tsx`, above `{children}`, below `MotionPrefsProvider`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - _Design: §3.1–§3.6_

  - [x] 7.1 Write property test for Veil Loader first-visit gating
    - **Property 6: Veil Loader shows at most once per first-visit gate**
    - **Validates: Requirements 2.7**
    - Test simulates sequences of app loads sharing localStorage state; asserts loader shows only when `veil-visited` is absent

  - [x] 7.2 Write property test for Veil Loader termination guarantee
    - **Property 7: Veil Loader always terminates**
    - **Validates: Requirements 2.5, 2.6**
    - Test generates random combinations of load-progress timing and reduced-motion setting; asserts loader always dismisses within the max duration

  - [x] 7.3 Write unit tests for Veil Loader concrete cases
    - Cover the 8 concrete cases: first-visit × reduced-motion × timeout-triggered (true/false each)
    - _Requirements: 2.5, 2.6, 2.7_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Build the lore/copy layer: Cursed Territory mapping and Mentor Copy pools
  - Create `src/lib/lore/cursedTerritory.ts` with `CATEGORY_MAP` (per design §2.2 table) and pure function `getCursedTerritoryName(categoryName: string): string` (case-insensitive substring match, falls back to `"Uncharted Territory"`)
  - Create `src/lib/lore/mentorCopy.ts` with `MENTOR_COPY` pools (`loaderIntro`, `onboarding`, `emptyResults`, `errorInterference`, `arrivalConfirmed`, `adminApproval`, `authLogin`, `authRegister`, `notFound404`) and `pickMentorLine(key, seed?)` helper with fallback to `"...the mist stirs."` for an empty pool
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_
  - _Design: §2.2, §2.3_

  - [ ]* 9.1 Write property test for Cursed Territory mapping totality and stability
    - **Property 1: Cursed Territory mapping totality and stability**
    - **Validates: Requirements 3.5, 3.6**
    - Test generates random strings including known categories, casing variants, whitespace; asserts non-empty output and stable output across repeated calls with the same input

  - [ ]* 9.2 Write property test for Mentor Copy pool distinctness
    - **Property 2: Mentor Copy pools are pairwise distinct across unrelated states**
    - **Validates: Requirements 3.8**
    - Test checks all pool-key pairs for zero shared lines

  - [ ]* 9.3 Write unit tests for `getCursedTerritoryName`
    - Assert each literal category example from the §2.2 table maps correctly, plus one unmatched string maps to `"Uncharted Territory"`
    - _Requirements: 3.5, 3.6_

- [x] 10. Wire Mentor Copy into onboarding, loading, empty, and error states
  - Add Mentor_Copy display to onboarding introduction screen(s), loading states on DISCOVER/NAVIGATE/ARRIVE surfaces, zero-result empty states, and user-facing error displays, using `pickMentorLine` with the appropriate pool key
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - _Design: §2.3, §2.5_

- [x] 11. Wire Cursed Territory Names into category displays
  - Update DISCOVER_Surface category tiles, ARRIVE_Surface place detail view, and place detail metadata to display `getCursedTerritoryName(categoryName)` alongside the literal category name
  - _Requirements: 3.6_
  - _Design: §2.2_

- [x] 12. Build the `CursedArtifactSlot` shared component
  - Create `src/components/shared/CursedArtifactSlot.tsx` accepting an optional `src` prop; renders the supplied photo when valid, a themed placeholder when `src` is absent, and swaps to the same themed placeholder via `<img onError>` when `src` fails to load (never a native broken-image state)
  - Support placeholder-ready behavior for all 4 planned wiring points (hero backdrop mist-gradient+silhouette style, PlaceCard category-icon-on-glass style, about-page numbered-caption-template style, dossier-card silhouette+microcopy style) via a `variant` prop
  - _Requirements: 7.4_
  - _Design: §4.1, Error Handling (Cursed_Artifact_Slot broken image)_

  - [ ]* 12.1 Write property test for Cursed Artifact Slot never rendering a broken image
    - **Property 8: Cursed Artifact Slot never renders a broken image state**
    - **Validates: Requirements 7.4**
    - Test generates the three input states (no src, valid src, failing src) and asserts rendered output is always either the photo or a themed placeholder

  - [ ]* 12.2 Write unit tests for Cursed Artifact Slot concrete cases
    - Cover no-src, valid-src, broken-src (3 concrete cases) across each `variant`
    - _Requirements: 7.4_

- [x] 13. Build `GlitchText` shared component
  - Create `src/components/shared/GlitchText.tsx` implementing the pure-CSS RGB-split glitch technique (red/cyan `::before`/`::after` offset + `clip-path` inset flicker) for reuse in the landing page hero title and the Domain Expansion payoff
  - _Requirements: (supports 4.1, 8.5)_
  - _Design: §4 (Landing page row), §5.3 step 3_

- [~] 14. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Restyle `PlaceCard.tsx`
  - Apply `.cn-glass` + `--cn-shadow-glass` to card background/border/shadow
  - Render `getCursedTerritoryName()` alongside the literal category label
  - Replace the image area with `CursedArtifactSlot` (`variant` for torn-parchment/cursed-seal frame via `clip-path` irregular polygon + `--cn-border` glow ring)
  - Add IntersectionObserver-based scroll-reveal entrance animation, gated through `useMotionPrefs()` (skip animation branch when `reducedMotion` or `lowCapability` is true)
  - _Requirements: 1.10, 4.6, 7.2_
  - _Design: §4 (PlaceCard.tsx row), §4.1 (#2)_

  - [ ]* 15.1 Write unit tests for PlaceCard token + slot rendering
    - Assert cursed territory name renders alongside literal category, and `CursedArtifactSlot` renders in place of the old image area
    - _Requirements: 1.10, 7.2_

- [x] 16. Restyle `ImageUpload.tsx`
  - Replace dropzone border/background with `--cn-border`/`--cn-surface` tokens; drag-active state uses `--cn-shadow-glow-purple`; upload progress bar uses the purple gradient matching the Veil Loader's progress bar
  - _Requirements: 1.11_
  - _Design: §4 (ImageUpload.tsx row)_

- [x] 17. Restyle landing page (`src/app/page.tsx`)
  - Add full-bleed hero `CursedArtifactSlot` backdrop with dark gradient overlay for text contrast, and `GlitchText` "THE VEIL" title over it
  - Add Sense → Traverse → Reclaim stage strip below hero using labels/microcopy from design §2.4
  - Mount `CursedCursor` (see Task 20) app-wide from this page down, gated to pointer-capable + non-mobile + non-low-capability
  - _Requirements: 4.1, 4.2, 7.1_
  - _Design: §4 (Landing page row), §4.1 (#1)_

- [x] 18. Restyle DISCOVER surface: dashboard browse/category grid, search results, add-place form
  - Relabel category tiles to Cursed_Territory_Name with `.cn-glass` tile styling and per-tile scroll-reveal
  - Apply Cursed_Theme card styling to search results without altering existing search/filter logic
  - Restyle add-place dashboard form backgrounds, borders, inputs, and buttons using Cursed_Theme tokens
  - _Requirements: 4.3, 4.4, 4.7_
  - _Design: §4 (Dashboard browse/category grid row)_

- [x] 19. Build `CursedCursor` component
  - Create `src/components/shared/CursedCursor.tsx`: spring-following custom cursor via Framer Motion, mounted only when pointer-capable, non-mobile, and non-low-capability (per `useMotionPrefs()`); disabled entirely (native cursor + touch-appropriate tap feedback) on mobile viewports
  - _Requirements: 4.5, 11.5_
  - _Design: §4 (Landing page row), §7.3_

  - [ ]* 19.1 Write unit tests for CursedCursor gating
    - Assert cursor does not mount on mobile viewport or when `lowCapability`/non-pointer conditions apply
    - _Requirements: 4.5, 11.5_

- [~] 20. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 21. Restyle NAVIGATE surface: `CustomCampusMap.tsx`, `MapLibreCampusMap.tsx`, `MapView.tsx`
  - Recolor `CustomCampusMap.tsx` controls/markers/popups via `--cn-*` tokens; restyle marker-pop animation to use `var(--cn-shadow-glow-purple)` glow
  - Recolor `MapLibreCampusMap.tsx` chrome via the token substitution from Task 1's `.maplibregl-ctrl-*` updates
  - Recolor `MapView.tsx` container/overlay backgrounds to `var(--cn-bg)`/`.cn-glass`; set route-path polyline color to `var(--cn-accent-gojo)`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_
  - _Design: §4 (CustomCampusMap.tsx, MapLibreCampusMap.tsx, MapView.tsx rows)_

- [x] 22. Restyle dashboard parking screen
  - Map parking status pill colors to `--cn-status-available`/`--cn-status-occupied`/`--cn-status-reserved` tokens while preserving existing status semantics
  - _Requirements: 5.5_
  - _Design: §4 (Dashboard parking screen row)_

- [x] 23. Restyle ARRIVE surface: place detail view and arrival confirmation
  - Restyle dashboard place detail view (info, photos, metadata) using Cursed_Theme tokens as a "sorcerer dossier" card (`.cn-glass` container, portrait-style photo slot, stat-block metadata rows)
  - Add `arrivalConfirmed` Mentor_Copy line shown once on open of the arrival confirmation state
  - Add a `CursedArtifactSlot` (dossier variant) to the place detail view for the place's real campus photograph
  - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - _Design: §4 (Dashboard place-detail / ARRIVE modal row), §4.1 (#4)_

- [~] 24. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Restyle Admin surface at reduced visual intensity
  - Apply Cursed_Theme color tokens and typography to admin approvals, categories, feedback, manage-parking, places, and users screens, and to `AdminClientLayout`/admin layout nav chrome (consistent with Header styling)
  - Wrap Admin surface root in a `data-intensity="low"` attribute per design §7.4, and add the corresponding CSS rule zeroing `--cn-shadow-glow-*` and disabling `.cn-seal` spin + card scroll-reveal under that attribute
  - Add `adminApproval` Mentor_Copy line to the approvals action flow
  - Preserve all existing data tables, forms, and action controls without altering underlying functionality
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - _Design: §4 (Admin pages row), §7.4_

  - [ ]* 25.1 Write unit tests for admin low-intensity variant
    - Assert `data-intensity="low"` zeroes glow tokens and disables seal-spin/scroll-reveal on admin surface
    - _Requirements: 9.2_

- [x] 26. Restyle Auth surface: login, register, setup-admin
  - Restyle login, register, and setup-admin form containers with `.cn-glass`, `--cn-border` inputs, `var(--cn-accent-purple)` focus ring
  - Add `authLogin`/`authRegister` Mentor_Copy line above the respective forms; add an appropriate intro line for setup-admin
  - Style validation errors with `var(--cn-accent-sukuna)` text/border alongside (not replacing) existing validation message text
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - _Design: §4 (Auth pages row)_

- [x] 27. Wire lore content into the about page
  - Restructure `src/app/about/page.tsx` per design §2.5 outline: Hero (GlitchText "THE VEIL" title + premise + `CursedArtifactSlot` backdrop), The Incident, Your Role (Sense/Traverse/Reclaim), Meet Your Sensei (onboarding Mentor_Copy line), Field Notes gallery (1+ `CursedArtifactSlot` with "we discovered X → therefore built Y" caption template), Credits/non-canon disclaimer
  - _Requirements: 3.7, 7.3_
  - _Design: §2.5, §4.1 (#3)_

- [~] 28. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 29. Verify accessibility contrast and cross-cutting motion/performance gating
  - Add fixed unit test assertions computing WCAG contrast ratio for each declared token pair (`--cn-text-1`/`--cn-bg`, `--cn-text-2`/`--cn-surface`, heading pairs, etc.) against the 4.5:1 (body) / 3:1 (heading) thresholds
  - Verify Performance_Gate (from `useMotionPrefs`) disables particle effects, cursor-trail rendering, and autoplaying background video across all surfaces when `lowCapability` is true
  - _Requirements: 11.1, 11.2, 11.4_
  - _Design: Correctness Properties §9, §7.4_

  - [ ]* 29.1 Write property test for theme contrast minimums
    - **Property 9: Declared theme text/background pairs meet contrast minimums**
    - **Validates: Requirements 11.1, 11.2**
    - Test computes contrast ratio for each declared Cursed_Theme color pair and asserts body-text pairs ≥ 4.5:1, heading/large-text pairs ≥ 3:1

  - [ ]* 29.2 Write unit tests for fixed token-pair contrast assertions
    - Cover each fixed token pair listed in Property 9 as a concrete example-based assertion
    - _Requirements: 11.1, 11.2_

- [ ] 30. **[LOWER PRIORITY / FIRST TO CUT]** Build Domain Expansion trigger and sequence
  - **NOTE**: This entire task (30 and its sub-tasks) is explicitly the lowest-priority feature in this spec per project direction. If time before the Sep 30 2026 demo runs short, cut this task first — no other surface depends on it.
  - Create `src/components/domain/DomainExpansionTrigger.tsx`: pure interaction/timer logic using `pointerdown`/`pointerup`/`pointerleave`/`pointercancel`, 1200ms hold threshold measured via `performance.now()`, radial conic-gradient fill progress affordance while holding
  - Create `src/components/domain/DomainExpansionSequence.tsx`: visual payoff mounted via portal at document root — screen-shake keyframe (skipped under Reduced_Motion_Mode), full-screen CSS/canvas-generated radial aura overlay (no licensed video asset — see design §5.4 licensing note), RGB-split glitch text via `GlitchText`, fade-out, unmount with transform reset and interactivity restoration
  - Implement low-capability substitution: static single-frame aura (skip pulsing keyframe) instead of any video source
  - Add the fixed-position cursed-seal glyph button to the bottom-right corner of the NAVIGATE_Surface (map page), with a one-time discovery tooltip
  - **NOTE — third-party asset caution**: per design §5.4, do NOT embed the real JJK cutscene video/GIF assets cataloged under `references/` into this sequence — the CSS/canvas-generated aura is the default and recommended implementation specifically to avoid that licensing exposure. Do not add this as a separate task; it is a constraint on this task.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_
  - _Design: §5.1, §5.2, §5.3, §5.4_

  - [ ]* 30.1 Write property test for hold-duration threshold behavior
    - **Property 3: Domain Expansion hold-duration threshold behavior**
    - **Validates: Requirements 8.1, 8.2**
    - **[LOWER PRIORITY / FIRST TO CUT]** — generate random hold durations across `[0ms, 3000ms]`; assert sequence never initiates below 1200ms and initiates exactly once at/above threshold regardless of continued hold

  - [ ]* 30.2 Write property test for sequence completion returning to interactive state
    - **Property 4: Domain Expansion sequence always returns to interactive state**
    - **Validates: Requirements 8.7**
    - **[LOWER PRIORITY / FIRST TO CUT]** — generate random reduced-motion/low-capability flag combinations; assert transform resets and interactivity restores after total duration elapses

  - [ ]* 30.3 Write property test for reduced-motion shake omission
    - **Property 5: Reduced-motion suppresses shake but preserves aura and glitch text**
    - **Validates: Requirements 8.8**
    - **[LOWER PRIORITY / FIRST TO CUT]** — generate random sequence trigger timings with reduced-motion forced true; assert shake transform is absent while aura and glitch text still render

  - [ ]* 30.4 Write unit tests for Domain Expansion cancel path and low-capability substitution
    - **[LOWER PRIORITY / FIRST TO CUT]** — cover release-before-threshold cancel path (no sequence, no visible state beyond press-scale snap-back) and low-capability static-aura substitution
    - _Requirements: 8.2, 8.9_

- [~] 31. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP; they are not implemented by the coding agent by default.
- Task 30 and all its sub-tasks (Domain Expansion) are flagged **[LOWER PRIORITY / FIRST TO CUT]** per explicit project direction — cut this whole task first if the Sep 30 2026 demo deadline is at risk. No other task depends on it.
- Task 2 (cursed display font) reuses a third-party JJK font asset copied from `references/`; it is flagged as lower-priority/cuttable given the design's licensing caution — the fallback font stack already covers this gracefully if cut.
- Task 30's licensing caution (no real JJK cutscene video/GIF assets) is a hard constraint on the task, not a separate cuttable item — the CSS/canvas-generated aura is the only implementation path taken.
- No photo-sourcing tasks are included; `CursedArtifactSlot` and its 4 wiring points (Tasks 12, 15, 17, 23, 27) are built placeholder-ready and await user-supplied photographs.
- No Prisma/schema tasks are included; this feature is presentation-layer only.
- Property tests validate the 10 correctness properties from design.md; unit tests validate the finite/fixed cases identified in the design's Testing Strategy section.
- Checkpoints (Tasks 5, 8, 14, 20, 24, 28, 31) provide incremental validation breaks.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3", "4"] },
    { "id": 2, "tasks": ["3.1", "6", "9"] },
    { "id": 3, "tasks": ["6.1", "7", "9.1", "9.2", "9.3"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "10", "11", "12", "13"] },
    { "id": 5, "tasks": ["12.1", "12.2", "15", "16", "19"] },
    { "id": 6, "tasks": ["15.1", "17", "19.1"] },
    { "id": 7, "tasks": ["18", "21", "22"] },
    { "id": 8, "tasks": ["23"] },
    { "id": 9, "tasks": ["25", "26", "27"] },
    { "id": 10, "tasks": ["25.1", "29"] },
    { "id": 11, "tasks": ["29.1", "29.2", "30"] },
    { "id": 12, "tasks": ["30.1", "30.2", "30.3", "30.4"] }
  ]
}
```

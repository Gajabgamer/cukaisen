# Design Document: THE VEIL — Cursed-Energy Reskin

## Overview

This is a presentation-layer-only reskin. No Prisma schema changes, no new API routes, no ML/camera code, no photo sourcing — every visual/narrative element either reuses existing data (place categories, place photos, approval status, parking status) or ships with a themed placeholder awaiting user-supplied assets. The existing `data-theme` attribute + CSS custom property mechanism in `globals.css` is repointed rather than replaced with a new system, per Requirement 1.2.

Target stack: Next.js 16 (App Router), React 19, Tailwind v4, existing Leaflet + MapLibre map components. Code examples below use TypeScript/TSX to match the existing codebase.

---

## 1. Design Token Spec

### 1.1 `data-theme` mechanism — what it becomes

Keep the attribute mechanism (cheapest, lowest-risk path since MapLibre CSS overrides in `globals.css` already key off nothing more than plain selectors). Repoint it to a single value:

```ts
document.documentElement.setAttribute('data-theme', 'cursed')
```

`useTheme.ts` is replaced by `useCursedTheme.ts` (see §7) which no longer toggles between two states. It still owns:
- Setting `data-theme="cursed"` once on mount (kept as an attribute, not deleted, so the existing `[data-theme="dark"] .maplibregl-ctrl-group` -style selectors in `globals.css` keep working — they get renamed to `[data-theme="cursed"]`).
- Reading/writing `prefers-reduced-motion` and a coarse device-capability flag into a small context (see §7) so components don't each re-implement `matchMedia` checks.
- No more `campusnav-theme` localStorage key for light/dark. A **new** localStorage key `veil-visited` (boolean) is introduced solely for the Veil Loader first-visit gate (§3).

### 1.2 Full token replacement (`src/app/globals.css`)

Every existing token gets exactly one cursed-energy value. `[data-theme="light"]` and `[data-theme="dark"]` blocks are deleted; `:root, [data-theme="cursed"]` becomes the sole block (kept as an attribute selector so nothing else needs to change if `data-theme` is momentarily absent during hydration — root inherits the same values as a safe default).

```css
:root, [data-theme="cursed"] {
  /* Backgrounds — void / deep indigo */
  --cn-bg: #0a0713;
  --cn-surface: rgba(26, 16, 46, 0.72);
  --cn-surface-2: rgba(20, 12, 36, 0.55);
  --cn-border: rgba(139, 92, 246, 0.22);
  --cn-border-soft: rgba(139, 92, 246, 0.10);

  /* Text */
  --cn-text-1: #f3eefc;
  --cn-text-2: #c3b6de;
  --cn-text-3: #8a7ba3;

  /* Nav chrome */
  --cn-nav-bg: rgba(10, 7, 19, 0.88);
  --cn-nav-border: rgba(139, 92, 246, 0.18);
  --cn-nav-shadow: 0 2px 24px rgba(76, 29, 149, 0.35);
  --cn-toggle-bg: rgba(139, 92, 246, 0.14);
  --cn-toggle-text: #d8cdf0;

  /* Base Next.js tokens */
  --background: #0a0713;
  --foreground: #f3eefc;

  /* ── Cursed accent duo (Gojo cyan / Sukuna crimson) ── */
  --cn-accent-gojo: #38bdf8;        /* Limitless / Six Eyes cyan-blue */
  --cn-accent-gojo-glow: rgba(56, 189, 248, 0.55);
  --cn-accent-sukuna: #dc2626;      /* Malevolent Shrine crimson */
  --cn-accent-sukuna-glow: rgba(220, 38, 38, 0.55);
  --cn-accent-purple: #8b5cf6;      /* primary cursed-energy purple, default accent */
  --cn-accent-purple-glow: rgba(139, 92, 246, 0.55);

  /* Status semantics (reused by parking + approvals — DO NOT change meaning) */
  --cn-status-available: #34d399;   /* green, kept recognizable */
  --cn-status-occupied: var(--cn-accent-sukuna);
  --cn-status-reserved: #fbbf24;
  --cn-status-pending: #fbbf24;
  --cn-status-approved: #34d399;
  --cn-status-rejected: var(--cn-accent-sukuna);

  /* ── Typography ── */
  --font-display: 'JujutsuKaisen', 'Cinzel', 'Bebas Neue', var(--font-geist-sans), serif;
  --font-body: var(--font-geist-sans), 'Inter', system-ui, sans-serif;

  /* ── Spacing / radius / shadow — glass-meets-seal ── */
  --cn-radius-sm: 10px;
  --cn-radius-md: 16px;
  --cn-radius-lg: 24px;
  --cn-radius-seal: 50%; /* for circular seal-glyph accents */

  --cn-space-unit: 4px; /* consumers use Tailwind spacing scale; token exists for non-Tailwind CSS */

  --cn-shadow-glass: 0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset;
  --cn-shadow-glow-purple: 0 0 24px var(--cn-accent-purple-glow), 0 0 4px rgba(139,92,246,0.8);
  --cn-shadow-glow-gojo: 0 0 24px var(--cn-accent-gojo-glow);
  --cn-shadow-glow-sukuna: 0 0 24px var(--cn-accent-sukuna-glow);

  --cn-blur-glass: 18px;

  /* ── Motion tokens (Requirement 1.6) ── */
  --cn-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --cn-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --cn-dur-fast: 150ms;
  --cn-dur-base: 300ms;
  --cn-dur-slow: 600ms;
  --cn-dur-veil: 1400ms;
}
```

Remove the `[data-theme="light"]` and `[data-theme="dark"]` blocks entirely. Update the MapLibre override selectors from implicit dark-only styling to key off `--cn-*` tokens instead of hardcoded rgba values, e.g.:

```css
.maplibregl-ctrl-group button {
  background-color: var(--cn-nav-bg) !important;
  color: var(--cn-text-1) !important;
  border-bottom: 1px solid var(--cn-border) !important;
}
.maplibregl-ctrl-group button:hover {
  background-color: var(--cn-accent-purple) !important;
}
```

### 1.3 Typography

- **Display font**: `JujutsuKaisen.ttf`, copied from `references/JJK-promo/src/styles/JujutsuKaisen.ttf` into `public/fonts/JujutsuKaisen.ttf` (do not import cross-package from `references/` at runtime — copy the asset into `public/`). Declared via `@font-face` with `font-display: swap` and a safe fallback stack (`'Cinzel', 'Bebas Neue', serif`) so a failed/slow font load never blocks text rendering (Requirement 11.7).
- **Body font**: keep the existing `--font-geist-sans` (Next.js `next/font` Geist) — already legible, already loaded, zero new risk.

```css
@font-face {
  font-family: 'JujutsuKaisen';
  src: url('/fonts/JujutsuKaisen.ttf') format('truetype');
  font-display: swap;
  font-weight: 400;
}

h1, h2, h3, .cn-display {
  font-family: var(--font-display);
  letter-spacing: 0.02em;
}
body, p, input, textarea, button {
  font-family: var(--font-body);
}
```

### 1.4 Glass-morphism + cursed-seal utility classes

Extend (not replace) the existing `.glass` / `.glass-dark` utilities in `globals.css`:

```css
.cn-glass {
  background: var(--cn-surface);
  backdrop-filter: blur(var(--cn-blur-glass));
  -webkit-backdrop-filter: blur(var(--cn-blur-glass));
  border: 1px solid var(--cn-border);
  box-shadow: var(--cn-shadow-glass);
  border-radius: var(--cn-radius-lg);
}

/* Cursed seal ring — decorative accent, e.g. behind avatars/category icons */
.cn-seal {
  position: relative;
}
.cn-seal::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px dashed var(--cn-accent-purple);
  opacity: 0.5;
  animation: cn-seal-spin 12s linear infinite;
}
@keyframes cn-seal-spin {
  to { transform: rotate(360deg); }
}
```

`prefers-reduced-motion` disables `cn-seal-spin` (see §7 CSS gating pattern).

---

## 2. Storyline & Copy Bible

### 2.1 Narrative framing

- **Setting**: The campus is **Jujutsu Tech — Kyoto Annex**. "THE VEIL" is a cursed mist that swept the campus, scrambling wards and severing the old navigation grid.
- **Player**: A **first-year, low-grade (Grade 4) sorcerer** newly enrolled, tasked with re-mapping campus territory as practical fieldwork.
- **Mentor Archetype**: A **Special Grade sorcerer, post-Shibuya, technique sealed** — Gojo-post-Shibuya-coded: still sharp-tongued and effortlessly confident in tone, but explicitly operating "without his technique," relying on experience and dry wit rather than raw power. Referred to in-app only as **"the Sensei"** or **"your Sensei"** (never a copyrighted proper name) to keep copy original.
- **DISCOVER → NAVIGATE → ARRIVE** is reframed as **Sense → Traverse → Reclaim**, matching Requirement 4.2.

### 2.2 Cursed-Territory name mapping (`PlaceCategory.categoryName` → flavor name)

Inferred categories from typical campus seed data / `PlaceCategory` model (`categoryName` is a free string, so mapping is by normalized lowercase match with a safe fallback):

| Literal Category | Cursed_Territory_Name |
|---|---|
| Cafeteria / Canteen / Food Court | Restoration Shrine |
| Library | The Archive of Bound Scrolls |
| Parking / Parking Lot | Barrier Gate |
| Faculty Office / Staff Office | Special Grade Chambers |
| Classroom / Lecture Hall | Training Hall |
| Admin Block / Administration | The Jujutsu High Council Office |
| Sports Complex / Gym | Domain Sparring Grounds |
| Medical Center / Health Center / Clinic | Healing Ward |
| Hostel / Dormitory | Sorcerer Dormitories |
| Auditorium / Seminar Hall | Assembly Hall of Oaths |
| Laboratory / Lab | Cursed Tools Workshop |
| Restroom / Washroom | Purification Chamber |
| ATM / Bank | Exchange Annex |
| Store / Stationery / Shop | Sorcerer's Supply Post |
| Garden / Courtyard / Open Ground | The Untainted Court |
| *(unmatched/other)* | Uncharted Territory |

Implementation: a pure function `getCursedTerritoryName(categoryName: string): string` in the new lore constants file, doing case-insensitive substring matching against the table keys, falling back to `"Uncharted Territory"`. This guarantees totality (every category maps to *something*) without needing a schema change.

### 2.3 Sample Mentor Copy

Copy pools live in `src/lib/lore/mentorCopy.ts` as keyed arrays (multiple lines per key so repeat visits don't feel static); each key below must be textually distinct from every other key's pool (Requirement 3.8).

```ts
export const MENTOR_COPY = {
  loaderIntro: [
    "The mist hasn't lifted yet. Give it a second — some of us don't rely on instinct alone.",
    "Hold on. Even without my technique, I know better than to rush a barrier this thick.",
  ],
  onboarding: [
    "Welcome to Jujutsu Tech, first-year. THE VEIL scrambled every ward on this campus — your fieldwork is to map it back, one territory at a time.",
    "Grade 4, huh? Don't worry. I lost my technique and I'm still standing. You'll manage a campus map.",
  ],
  emptyResults: [
    "Nothing here. Either it's warded from us, or it simply doesn't exist yet — try another sensing angle.",
    "That territory's still hidden behind the mist. Uncharted, not gone.",
  ],
  errorInterference: [
    "Curse interference. Something in the veil pushed back — here's what it left behind:",
    "That's not a wall, that's cursed static. Give it another try.",
  ],
  arrivalConfirmed: [
    "Territory reclaimed. One less blind spot on this campus.",
    "Ward lifted. This one's yours now, first-year.",
  ],
  adminApproval: [
    "Approved. The Council's seal is on it — this territory's official.",
    "Signed off. Even sealed techniques recognize good fieldwork.",
  ],
  authLogin: [
    "Credentials, sorcerer. The Council doesn't let just anyone past the barrier.",
  ],
  authRegister: [
    "New enrollment? Good. Jujutsu Tech always needs more first-years who don't run from a little mist.",
  ],
  notFound404: [
    "This path doesn't exist — not cursed, just never mapped. Head back before the mist gets ideas.",
  ],
} as const
```

A small helper `pickMentorLine(key: keyof typeof MENTOR_COPY, seed?: string)` deterministically picks (hash of seed) or randomly picks a line, so SSR/CSR don't mismatch when a stable seed (e.g. place id, route path) is available.

### 2.4 Stage labels & microcopy

| Stage | Label | Microcopy |
|---|---|---|
| DISCOVER | **Sense** | "Sense the cursed territories around you." |
| NAVIGATE | **Traverse** | "Traverse the path — the veil won't hold forever." |
| ARRIVE | **Reclaim** | "Reclaim this territory for the campus." |

### 2.5 About / lore page section outline (`src/app/about/page.tsx`)

1. **Hero** — "THE VEIL" glitch-text title + one-line premise + Cursed_Artifact_Slot backdrop.
2. **The Incident** — 2-3 paragraphs: what THE VEIL is, why navigation broke.
3. **Your Role** — Sense → Traverse → Reclaim explanation with the 3 stage labels.
4. **Meet Your Sensei** — Mentor Archetype introduction, 1 Mentor_Copy onboarding line.
5. **Field Notes (Cursed Artifact Mandate lore section)** — gallery of 1+ Cursed_Artifact_Slot images, each paired with "We discovered `<real campus observation>` → therefore we built `<feature>`" caption copy (copy itself is a placeholder string until the team fills in real findings, e.g. *"We discovered new students couldn't find the health center during orientation week → therefore we built real-time category search."*).
6. **Credits / non-canon disclaimer** — small print: fan-work, non-commercial, hackathon submission.

---

## 3. The Veil Loader / Intro

### 3.1 Library choice

**Framer Motion**, not GSAP. Rationale: Framer Motion is the primary library already selected in `jjk-references.md` for this codebase (React-idiomatic, no separate plugin licensing/ScrollTrigger setup needed for a single clip-path wipe), and it isn't yet a dependency — add it. GSAP is explicitly reserved in the reference notes for a scroll-scrub timeline, which is out of scope for the loader. One library for the loader keeps bundle size and complexity down.

**New dependency**: `framer-motion` (not currently in `package.json` — confirmed by reading `package.json`). No GSAP dependency added.

### 3.2 Sequence (adapted from JJK-promo's `Loader.jsx` / `animations.js` GSAP timeline, re-authored in Framer Motion)

Component: `src/components/veil/VeilLoader.tsx`. Mounted once in `src/app/layout.tsx`, above `{children}`, controlling its own visibility.

Timeline (total ≈ 1.4s on first visit, matches `--cn-dur-veil`):

1. **0ms** — Full-screen fixed overlay (`z-[100]`), background `var(--cn-bg)` with a subtle animated cursed-mist gradient (CSS `radial-gradient` + `background-position` keyframe, cheap, no video).
2. **0–250ms** — Title characters ("THE VEIL") fly in from opposite edges: odd characters `x: -80 → 0`, even characters `x: 80 → 0`, `opacity: 0 → 1`, easing `var(--cn-ease-spring)` (mirrors JJK-promo's `data-title-first` / `data-title-second` split).
3. **150–1000ms** — Progress indicator: a thin `--cn-accent-purple` bar animates `width: 0% → 100%`, driven by real load signal where available (see 3.3), with a numeric `0→100` counter beside it (Framer Motion `useMotionValue` + `animate()`), replacing GSAP's counter tween.
4. **200–1200ms** — One Mentor_Copy line (`loaderIntro` pool) fades in below the progress bar (`opacity: 0→1`, `y: 8→0`).
5. **1000–1400ms** — Clip-path wipe: overlay animates `clip-path: circle(150% at 50% 50%)` → `circle(0% at 50% 50%)` (or a diagonal polygon wipe, matching JJK-promo's `polygon(...)` technique) using Framer Motion's `clipPath` animatable prop, revealing the app content mounted underneath the whole time (not re-mounted — avoids layout shift/flicker).
6. **1400ms** — Overlay unmounts (`display: none` via `AnimatePresence` exit complete), `veil-visited` written to `localStorage`.

### 3.3 Real progress vs. simulated progress

Since this is a client-rendered SPA-ish shell (Next.js), there's no single "load event" to bind to meaningfully. Use a hybrid: track `document.readyState` / a `Promise.all` of critical resources (fonts via `document.fonts.ready`, first paint) to advance progress genuinely up to ~80%, then animate the remaining 80→100% over a fixed short tween so the bar never stalls. This satisfies Requirement 2.3 (progress indicator reflecting load progress) without inventing fake infra.

### 3.4 First-visit vs. subsequent-visit gating (Requirement 2.7, 11.6-adjacent)

```ts
// inside VeilLoader
const [shouldShow, setShouldShow] = useState(false)
useEffect(() => {
  const seen = localStorage.getItem('veil-visited')
  if (!seen) setShouldShow(true)
}, [])
```

- The loader is mounted only in the **root layout**, not per-route layout, so client-side route transitions between already-loaded pages never re-trigger it (Requirement 2.7) — it's simply not in the component tree for those transitions since root layout doesn't remount on navigation.
- Subsequent full page loads (new tab, hard refresh) also skip it once `veil-visited` is set — treated as "not first-time" per Requirement 2.7's intent and for performance.

### 3.5 Reduced motion (Requirement 2.5)

```ts
if (prefersReducedMotion) {
  // replace clip-path wipe with opacity cross-fade, equal-or-shorter duration
  return <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.3 }} ... />
}
```
Title fly-in also collapses to a simple opacity fade under reduced motion.

### 3.6 Max-duration failsafe (Requirement 2.6)

A `setTimeout` of 4000ms force-dismisses the loader regardless of progress state, guaranteeing the app is never permanently blocked by a stuck asset load.

---

## Components and Interfaces

### 4. Component-Level Design

For each component, "extend" = keep existing Tailwind classes/structure, add token-driven styles or wrap with a motion/effect component. "Replace" = swap the literal color values.

| Component | Treatment | Reference Technique | Extend vs Replace |
|---|---|---|---|
| `Header.tsx` | Currently uses **hardcoded inline rgba values** (`rgba(15,23,42,0.9)`, `#a5b4fc`, etc.) rather than CSS tokens — this is the one component that needs a real code change, not just a CSS var swap. Replace inline `style={{ background: ... }}` with `var(--cn-nav-bg)`, `var(--cn-nav-border)`, `var(--cn-nav-shadow)`; active nav-item accent switches from indigo to `var(--cn-accent-purple)`; admin nav-item accent stays amber-ish but pulled from a new `--cn-accent-admin` token for consistency. | Glass-morphism (`.cn-glass` on the dropdown menu) | **Replace** inline colors → tokens |
| `PlaceCard.tsx` | Card background/border/shadow → `.cn-glass` + `--cn-shadow-glass`; category label renders `getCursedTerritoryName()` next to (not instead of, to avoid confusing existing users) the literal name; image area becomes a Cursed_Artifact_Slot with themed placeholder (torn-parchment / cursed-seal graphic) when no photo exists; scroll-reveal entrance via IntersectionObserver (technique #10, cheapest option — no GSAP ScrollTrigger needed for a one-shot reveal). | Scroll-reveal (IntersectionObserver), glass-morphism, Cursed_Artifact_Slot | **Extend** existing markup with new classes + one new placeholder branch |
| `CustomCampusMap.tsx` | Controls/markers/popups recolored via tokens; marker-pop animation (`animate-marker-pop` already in `globals.css`) restyled to use `var(--cn-accent-purple)` glow (`box-shadow: var(--cn-shadow-glow-purple)`) instead of plain white ring. | Glow/motion tokens only | **Extend** — no structural change |
| `MapLibreCampusMap.tsx` | Same token repoint as the existing `.maplibregl-ctrl-*` overrides in `globals.css` (already dark-styled — mostly a variable substitution, see §1.2). | Token substitution | **Extend** |
| `MapView.tsx` | Container/overlay backgrounds → `var(--cn-bg)` / `.cn-glass` panels; route-path polyline color → `var(--cn-accent-gojo)` (distinct from marker purple, satisfies Requirement 5.6's "distinct from map background/other accent" intent). | Token substitution | **Extend** |
| `ImageUpload.tsx` | Dropzone border/background → tokens; drag-active state glow → `var(--cn-shadow-glow-purple)`; upload progress bar → purple gradient matching Veil Loader's progress bar for visual consistency. | Token substitution + shared progress-bar style | **Extend** |
| Admin pages (`admin/**`, `AdminClientLayout.tsx`) | Same token set, but consumed through a `data-intensity="low"` wrapper (see §7 Architecture) that zeroes out `--cn-shadow-glow-*` (set to `none`) and disables `.cn-seal` spin + card scroll-reveal, per Requirement 9.2's "lower visual intensity" mandate. Tables/forms/action controls unchanged structurally. | Token substitution, intensity variant | **Extend** |
| Auth pages (`login`, `register`, `setup-admin`) | Form container → `.cn-glass`; inputs get `--cn-border` + focus ring `var(--cn-accent-purple)`; one Mentor_Copy line (`authLogin`/`authRegister`) above the form; validation errors styled with `var(--cn-accent-sukuna)` text/border instead of default red-500, alongside (not replacing) existing message text. | Token substitution, Mentor_Copy slot | **Extend** |
| Dashboard place-detail / ARRIVE modal | Restyled as a "sorcerer dossier" card: `.cn-glass` container, portrait-style photo slot top, stat-block-style metadata rows, arrival Mentor_Copy line (`arrivalConfirmed`) shown once on open. | Character-bio modal pattern (technique #11) | **Extend** existing modal markup |
| Landing page (`src/app/page.tsx`) | Hero: full-bleed Cursed_Artifact_Slot backdrop image (`object-fit: cover`, dark gradient overlay for text contrast) with "THE VEIL" glitch-text title (technique #5) over it; Sense/Traverse/Reclaim stage strip below hero using stage labels from §2.4; Cursed_Cursor mounted app-wide from this page down (pointer-capable + non-mobile + non-low-capability only). | Glitch text, Cursed_Artifact_Slot, Cursed_Cursor | **Extend** existing hero section |
| Dashboard browse/category grid | Category tiles relabel to Cursed_Territory_Name (from §2.2 mapping), `.cn-glass` tile background, scroll-reveal per tile. | Scroll-reveal, token substitution | **Extend** |
| Dashboard parking screen | Status pill colors map to `--cn-status-available/occupied/reserved` (semantics preserved per Requirement 5.5). | Token substitution only | **Extend** |

---

## 5. Domain Expansion Tap-and-Hold Easter Egg

### 5.1 Where it lives

A small fixed-position glyph button (a cursed-seal icon, reusing `.cn-seal` styling) in the bottom-right corner of the `NAVIGATE_Surface` (map page), always present but unobtrusive — flavor text on first discovery via a one-time tooltip: *"Something's sealed here. Try holding it."*

### 5.2 Interaction spec

Component: `src/components/domain/DomainExpansionTrigger.tsx` (pure interaction/timer logic, no visuals) + `src/components/domain/DomainExpansionSequence.tsx` (visual payoff, mounted via portal at document root).

- **Hold duration threshold**: 1200ms (`pointerdown` → `pointerup`/`pointerleave` measured via `performance.now()`).
- Cancel path (Requirement 8.2): if `pointerup`/`pointerleave`/`pointercancel` fires before 1200ms, clear the pending timer, no sequence starts, no visible state change beyond a brief press-scale (`scale: 0.95`) snapping back.
- Progress affordance while holding: the seal glyph fills with a radial `conic-gradient` wipe (0→100% synced to elapsed/1200ms) so the user gets feedback before the threshold is reached.

### 5.3 Visual payoff sequence (on threshold reached)

1. **0ms** — Screen-shake: Framer Motion keyframe array on the page container's `x`/`y` (`[0, -8, 8, -6, 6, 0]` over 400ms) — reuses technique #4 (`useDomainShake` pattern). Skipped entirely under Reduced_Motion_Mode (Requirement 8.8), sequence proceeds straight to step 2.
2. **0–300ms (concurrent with shake)** — Full-screen aura overlay fades in (`opacity 0→1`): a **CSS/canvas-generated radial aura** (concentric `radial-gradient` rings pulsing via `background-size` keyframe, tinted `--cn-accent-purple`/`--cn-accent-gojo`), *not* a licensed video asset — see licensing note below.
3. **300–900ms** — RGB-split glitch text ("DOMAIN EXPANSION" or a flavor phrase) renders centered over the aura using the pure-CSS glitch technique (`glitch.css` pattern: red/cyan `::before`/`::after` offset + `clip-path` inset flicker, technique #5 — zero-dependency).
4. **900–1400ms** — Aura + glitch text fade out (`opacity 1→0`).
5. **1400ms** — Overlay unmounts, screen-shake container resets to `x:0, y:0`, focus/interactivity restored (Requirement 8.7).

Low-capability substitution (Requirement 8.9): the "cutscene video" language in the requirement is satisfied here by design — the payoff is CSS/canvas-generated by default (see below), so the "low-capability substitute" is simply a static single-frame version of the aura (skip the pulsing keyframe, render one static radial-gradient frame) rather than swapping a video source, which sidesteps the licensing concern entirely.

### 5.4 Licensing / asset sourcing note (flagged per user instruction)

`jjk-references.md` catalogs real cutscene video assets (`infinite-void.mp4`, `malevolent-shrine.mp4`, `mahoraga.mp4` in `natsu90-jjk/media`) and character GIFs/audio as "non-commercial fan assets." **Recommendation: do not embed these in the submitted build.** For a live-judged demo, licensing risk (even framed as hackathon-only/non-commercial) is an unnecessary exposure the team doesn't need to take on, since a CSS/canvas-generated aura achieves the same visual beat (screen shake + glitch text + aura) without any third-party media dependency, loads instantly (no video buffering on stage), and trivially satisfies the Performance_Gate/low-capability requirement. If the team still wants a recycled video for extra polish, that's a judgment call for the user to make explicitly and separately — flagging it here rather than wiring it in by default.

---

### 4.1 Cursed Artifact Mandate Integration

Exactly 3+ slots (Requirement 7.5), each using a shared `CursedArtifactSlot` component (see §7) that accepts an optional `src` and always renders a themed placeholder when absent (Requirement 7.4):

| # | Location | Slot purpose | Placeholder-ready copy |
|---|---|---|---|
| 1 | Landing page hero backdrop | Full-bleed campus photo behind "THE VEIL" title | Placeholder: dark cursed-mist gradient + faint campus silhouette SVG |
| 2 | `PlaceCard.tsx` photo frame | Per-place real photo, styled with a torn/burned-edge cursed-seal frame (`clip-path` irregular polygon + `--cn-border` glow ring) | Placeholder: category icon centered on `.cn-glass` tile |
| 3 | About/lore page gallery section | 1+ photos paired with "We discovered X → therefore we built Y" caption | Placeholder: numbered blank frame with the caption template visible so the team can see exactly where to drop the real photo + fill the caption before the pitch |
| 4 (bonus, satisfies "3+" with margin) | Dashboard place-detail dossier card | Place-specific photo, portrait-style dossier framing | Placeholder: silhouette + "Field photo pending" Mentor-voiced microcopy |

Pitch copy placeholder block (for the team's live pitch deck, not runtime UI) is included as a commented template in the lore constants file so it's not lost:
```ts
// PITCH COPY TEMPLATE — fill before demo day:
// "We discovered <real observation about the campus> →
//  therefore we built <specific CampusPath feature>."
```

---

## Architecture

### 7.1 New files/modules

```
src/lib/lore/
  mentorCopy.ts            // MENTOR_COPY pools + pickMentorLine()
  cursedTerritory.ts        // CATEGORY_MAP + getCursedTerritoryName()
src/lib/useCursedTheme.ts   // replaces useTheme.ts
src/lib/motionPrefs.tsx     // MotionPrefsProvider + useMotionPrefs() context
                             // (prefers-reduced-motion + capability flag, single source of truth)
src/components/veil/
  VeilLoader.tsx
src/components/domain/
  DomainExpansionTrigger.tsx
  DomainExpansionSequence.tsx
src/components/shared/
  CursedArtifactSlot.tsx    // photo-or-placeholder slot, used in 4 locations from §6
  GlitchText.tsx            // reusable RGB-split glitch heading wrapper
  CursedCursor.tsx          // spring-following custom cursor, pointer-capable + desktop only
```

### 7.2 `useTheme.ts` removal

Delete `src/lib/useTheme.ts` and its light/dark `Theme` type. Any component currently importing `useTheme` (grep before deletion) gets migrated to either nothing (if it was only reading `isDark` for conditional styling — now redundant, single theme) or `useMotionPrefs()` if it was actually gating animation. `useCursedTheme.ts` is intentionally minimal — most components don't need to import it at all since the CSS tokens do the work purely via `globals.css`; it exists only to set the `data-theme="cursed"` attribute once at root.

### 7.3 Library additions

- **`framer-motion`** — not currently a dependency (confirmed against `package.json`). Add as the single animation library for: Veil Loader, Domain Expansion shake, Cursed Cursor spring-follow, card scroll-reveal (optional — can also use plain IntersectionObserver + CSS class, cheaper; recommend that route to avoid Framer Motion overhead on every card).
- **GSAP**: **not added**. No scroll-scrub timeline is in scope for this pass (the about/lore page uses simple IntersectionObserver reveals per technique #10, not GSAP ScrollTrigger), so the extra dependency isn't justified. Revisit only if the team later commits to a full scroll-scrub lore timeline.
- No other new dependencies (no Lenis, no TensorFlow, no Fingerpose — explicitly out of scope per Non-Goals).

### 7.4 Performance/reduced-motion gating approach

Single context, consumed everywhere that needs it, computed once:

```tsx
// src/lib/motionPrefs.tsx
type MotionPrefs = { reducedMotion: boolean; lowCapability: boolean }
const MotionPrefsContext = createContext<MotionPrefs>({ reducedMotion: false, lowCapability: false })

export function MotionPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<MotionPrefs>({ reducedMotion: false, lowCapability: false })
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // coarse heuristic: device memory / logical cores / connection type
    const nav = navigator as any
    const lowCapability =
      (nav.deviceMemory && nav.deviceMemory <= 4) ||
      (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) ||
      (nav.connection && ['slow-2g', '2g', '3g'].includes(nav.connection.effectiveType))
    setPrefs({ reducedMotion, lowCapability: Boolean(lowCapability) })
  }, [])
  return <MotionPrefsContext.Provider value={prefs}>{children}</MotionPrefsContext.Provider>
}
export const useMotionPrefs = () => useContext(MotionPrefsContext)
```

- Mounted once in root layout, above `VeilLoader`.
- Every effect-bearing component (`VeilLoader`, `DomainExpansionSequence`, `CursedCursor`, `.cn-seal` spin, card scroll-reveal, marker-pop glow) reads this context and branches to a static/simplified render — never both branches animating and then one hidden via CSS `display:none` (wastes the animation work); the branch happens before any animation is scheduled.
- Also add a plain-CSS global fallback for defense-in-depth (covers any effect that doesn't get context-checked):
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
- `data-intensity="low"` attribute (set on the Admin layout root) is a separate, simpler mechanism from motion-prefs — it's a fixed design decision (Requirement 9.2), not a device capability, so it's just a CSS attribute selector zeroing glow tokens, not a context.

### 7.5 Config file

Per workflow requirement, `.kiro/specs/jjk-theme-reskin/.config.kiro` already exists from Phase 1/2 — no change needed here.

---

## Data Models

This feature introduces no new persisted data models (no Prisma schema changes). The only "data" artifacts are static, in-memory/constant TypeScript structures:

- `MENTOR_COPY: Record<string, readonly string[]>` — copy pools (§2.3).
- `CATEGORY_MAP: Record<string, string>` — literal category → Cursed_Territory_Name (§2.2), consumed by the pure function `getCursedTerritoryName(categoryName: string): string`.
- `MotionPrefs: { reducedMotion: boolean; lowCapability: boolean }` — runtime-computed client state, not persisted.
- `veil-visited: boolean` — the only new `localStorage` key, replacing the old `campusnav-theme` key.

All existing Prisma models (`Place`, `PlaceCategory`, `PlacePhoto`, `ParkingSlot`, `Approval`, etc.) are read-only inputs to this feature's presentation layer and are unmodified.

## Error Handling

- **Font load failure**: `font-display: swap` + fallback stack means text always renders (Requirement 11.7); no JS error-handling needed for the `@font-face` itself.
- **Domain Expansion asset failure** (n/a for CSS-generated aura — no network asset to fail; if the team later adds an optional video, wrap in `<video onError={...}>` falling back to the static aura frame).
- **Cursed_Artifact_Slot broken image**: `<img onError>` swaps to the themed placeholder branch programmatically (same placeholder used for "no src supplied"), so a broken/missing URL never shows a native broken-image icon.
- **Veil Loader stuck load**: 4000ms failsafe timeout (§3.6) guarantees dismissal.
- **Mentor Copy missing key**: `pickMentorLine` falls back to a generic `"...the mist stirs."` line if a requested pool key is somehow empty, so a copy-authoring gap never renders blank UI text.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cursed Territory mapping totality and stability

For any place category name (including unrecognized/arbitrary strings), `getCursedTerritoryName` SHALL return a non-empty string, and calling it twice with the same input SHALL return the same output.

**Validates: Requirements 3.5, 3.6**

### Property 2: Mentor Copy pools are pairwise distinct across unrelated states

For any two different Mentor_Copy pool keys among `loaderIntro`, `onboarding`, `emptyResults`, `errorInterference`, `arrivalConfirmed`, `adminApproval`, no line in one pool SHALL be identical to any line in the other pool.

**Validates: Requirements 3.8**

### Property 3: Domain Expansion hold-duration threshold behavior

For any simulated hold duration `d`, if `d` is less than the 1200ms threshold, releasing the trigger SHALL NOT initiate the Domain_Expansion_Sequence; if `d` is greater than or equal to the threshold, the trigger SHALL initiate the Domain_Expansion_Sequence exactly once regardless of how much longer the hold continues.

**Validates: Requirements 8.1, 8.2**

### Property 4: Domain Expansion sequence always returns to interactive state

For any completed Domain_Expansion_Sequence (regardless of reduced-motion or low-capability branch taken), after the sequence's total duration elapses, the view's transform SHALL be reset to its pre-sequence state and pointer interactivity SHALL be restored.

**Validates: Requirements 8.7**

### Property 5: Reduced-motion suppresses shake but preserves aura and glitch text

For any Domain_Expansion_Sequence triggered while Reduced_Motion_Mode is active, the rendered sequence SHALL omit the screen-shake transform animation while still rendering the aura overlay and the RGB-split glitch text.

**Validates: Requirements 8.8**

### Property 6: Veil Loader shows at most once per first-visit gate

For any sequence of simulated app loads sharing the same `localStorage` state, the Veil_Loader SHALL display on the first load when the `veil-visited` flag is absent, and SHALL NOT display on any subsequent load once the flag has been set.

**Validates: Requirements 2.7**

### Property 7: Veil Loader always terminates

For any combination of real-load-progress timing and reduced-motion setting, the Veil_Loader SHALL transition to dismissed (revealing underlying content) within the defined maximum duration, whether triggered by natural completion or by the failsafe timeout.

**Validates: Requirements 2.5, 2.6**

### Property 8: Cursed Artifact Slot never renders a broken image state

For any Cursed_Artifact_Slot given either no `src`, a valid `src`, or an `src` that fails to load, the rendered output SHALL be either the supplied photograph or a themed placeholder, and SHALL NEVER be a native broken-image element.

**Validates: Requirements 7.4**

### Property 9: Declared theme text/background pairs meet contrast minimums

For each declared Cursed_Theme color pair used for body text (`--cn-text-1`/`--cn-bg`, `--cn-text-2`/`--cn-surface`, etc.) and heading text pairs, the computed WCAG contrast ratio SHALL be at least 4.5:1 for body-text pairs and at least 3:1 for large-text/heading pairs.

**Validates: Requirements 11.1, 11.2**

### Property 10: Motion-affecting components branch before animating under reduced motion or low capability

For any effect-bearing component (Veil_Loader, Domain_Expansion_Sequence, Cursed_Cursor trail, `.cn-seal` spin, card scroll-reveal), when `reducedMotion` or `lowCapability` is true in `useMotionPrefs`, the component's rendered output SHALL contain no animated/particle/trail elements that would be present when both flags are false.

**Validates: Requirements 1.7, 1.8, 11.3, 11.4**

---

## Testing Strategy

**Unit/example tests** (finite, small branch space):
- `getCursedTerritoryName` against each literal category example in §2.2 plus one unmatched string → `"Uncharted Territory"`.
- Veil Loader: first-visit true/false × reduced-motion true/false × timeout-triggered true/false (8 concrete cases).
- Cursed_Artifact_Slot: no-src, valid-src, broken-src (3 concrete cases).
- Contrast ratio assertions for each fixed token pair listed in Property 9 (fixed, finite set — example-based, not generative).

**Property-based tests** (100+ iterations, varying input):
- Property 1 (mapping totality/stability) — generate random strings including known categories, casing variants, whitespace.
- Property 2 (copy pool distinctness) — static data check, effectively a single assertion run once (not meaningfully improved by iteration, but written as a property test over all key-pairs for completeness).
- Property 3 & 4 (hold-duration + sequence completion) — generate random hold durations across `[0ms, 3000ms]` and random reduced-motion/low-capability flag combinations.
- Property 5 (reduced-motion shake omission) — generate random sequence trigger timings with reduced-motion forced true.
- Property 10 (motion gating) — generate random combinations of the 5 effect-bearing components × reduced-motion/low-capability flags.

Both layers are complementary: unit tests pin down the known finite cases (each named category, each loader branch), property tests sweep the continuous/combinatorial space (arbitrary category strings, arbitrary hold durations, arbitrary flag combinations) that hand-picked examples would miss.

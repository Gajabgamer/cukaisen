---
inclusion: manual
---

# JJK Reference Repos — Animation & USP Takeaways

Reference projects cloned into `references/`. These are studied for reusable
animation techniques and standout ideas for the CampusPath "THE VEIL" theme.
Assets may be recycled (college hackathon, non-commercial).

## Reference Inventory

| Repo | Stack | Value |
|------|-------|-------|
| `references/JJK-promo` | Vite + React 18, GSAP, Framer Motion, Lenis, SCSS | **Best web animation source.** Loader/reveal/scroll timelines, magnetic cursor, page transitions |
| `references/jjk-character-showcase` | Vite + React 18 + TS, Framer Motion, Tailwind | **Best interaction/effects source.** Custom physics, themed cursor, domain-shake, glitch/RGB-split CSS |
| `references/Jujutsu-Kaisen-React` | CRA + React 18, GSAP, Locomotive Scroll, Lottie, styled-components | Cover-video hero, locomotive smooth-scroll, story section pattern |
| `references/jujutsu-kaisen-flutter-app` | Flutter | Mobile IA reference only (not directly portable to web) |

### Figma (manual — cannot be auto-fetched, open in Figma & export)
- JJK UI kit: figma.com/community/file/1364480161142649060
- Carousel slider (JJK): figma.com/community/file/1314240924548525685

## Reusable Assets (recycle into `public/`)
- **JJK-promo `/public`**: `blueFireball.gif` (cursed-energy flame), `transition_sprite.webp/png`
  (sprite-sheet page transition), `textBackground.png`, `header_bg.webp`, `footer_bg.webp`,
  character `*_large.webp`, `JujutsuKaisen.ttf` font (`src/styles/`), `eye.png`, `hands.png`.
- **character-showcase `/public`**: character GIFs + `/audio` voice lines.
- **Jujutsu-Kaisen-React**: `src/assets/bg.mp4` (hero cover video), SVG logos.

## Techniques Worth Stealing (mapped to CampusPath)

### 1. Cursed-Energy Loader / "THE VEIL" reveal  (JJK-promo loader)
GSAP timeline pattern: title words fly in from opposite sides (`data-title-first` x:100,
`data-title-second` x:-100, kanji drops y:-100), flames fade in, progress counter animates
0→100, then loader wipes away via animated `clip-path` polygon.
→ **Use for the VEIL intro**: veil dissolves via clip-path wipe to reveal the campus map.
Reuse `blueFireball.gif` as cursed-energy accent. Kanji 呪術廻戦 already matches event branding.

### 2. Clip-path image/section reveals  (JJK-promo home `animateImage`)
Overlay wipes using `clip-path: polygon(...)` with `transformOrigin`.
→ **Use for**: place-detail photos and the DISCOVER→NAVIGATE→ARRIVE stage transitions.

### 3. Magnetic / themed custom cursor  (both web repos)
`useSmoothMouse` + Framer `useSpring` (damping 20-25, stiffness 150-500, mass 0.3-0.5) for
lag-free tracking; glow blur + optional particle trail; scale on hover/click.
→ **Use for**: a cursed-energy cursor sitewide (respect `prefers-reduced-motion`).

### 4. Domain-Expansion screen shake  (showcase `useDomainShake`)
Framer `useAnimation` keyframe arrays on x/y/scale, distinct patterns per intensity.
→ **Use for**: "ARRIVE" confirmation punch, or triggering a Domain Expansion map mode.

### 5. Glitch / RGB-split text  (showcase `styles/glitch.css`)
Pure CSS: `@keyframes glitch/glitch-1/glitch-2` with clip-path insets + red/cyan
`::before`/`::after` text-shadow split; `pulse-glow` drop-shadow breathing.
→ **Use for**: headings ("THE VEIL"), section titles, error/emergency states. Zero-dep, cheap win.

### 6. Scroll-driven timelines  (JJK-promo home, GSAP ScrollTrigger)
`scrub` timelines with onEnter/onLeave play/reverse tied to scroll position.
→ **Use for**: the landing/lore page storytelling scroll.

### 7. Cover-video hero + smooth scroll  (Jujutsu-Kaisen-React)
Full-bleed looping `bg.mp4` behind hero + Locomotive/Lenis smooth scrolling.
→ **Use for**: landing hero. Prefer Lenis (lighter) over Locomotive.

### 8. Performance & a11y gating  (showcase)
`usePerformanceGating` disables expensive effects on weak devices; `useReducedMotion`
honors OS preference; lazy-load heavy modals.
→ **Adopt as a baseline** so the 40% aesthetic score doesn't tank on judges' laptops.

## USP Ideas Distilled
- **"Domain Expansion" map mode**: fullscreen immersive campus view with aura/particle FX.
- **Character/technique-themed accents** repurposed as place-category identities.
- **Voice-line / audio cue** on key actions (arrival, discovery) — reuse showcase `/audio`.
- **Physics micro-interactions** on cards (float/repel) for the DISCOVER browse grid.

## Library Decision (keep bundle lean for CampusPath = Next.js 16)
- **Framer Motion** — primary (cursor, shake, card physics, reveals). Already React-idiomatic.
- **GSAP + ScrollTrigger** — only if we need the scroll-scrub lore timeline.
- **Lenis** — optional smooth scroll for landing page.
- Avoid Locomotive Scroll and styled-components (project uses Tailwind v4).

---

# Batch 2 References (added)

| Repo | Stack | Value |
|------|-------|-------|
| `references/natsu90-jjk` | Vanilla + Vue 2, TensorFlow HandPose, Fingerpose, Web Speech API | **Standout / highest wow-factor.** Webcam hand-gesture + voice "Domain Expansion" trigger. Includes domain-expansion **video assets** + music |
| `references/jjkwebb` | Vanilla HTML/CSS/JS | JJK wiki. IntersectionObserver scroll-reveal pattern + large photo library |
| `references/jjkfanpage` | Vanilla HTML/CSS/JS | Character-bio modal pattern + clean character `.webp` portraits |

## Reusable Assets (batch 2)
- **natsu90-jjk `/media`**: `infinite-void.mp4`, `malevolent-shrine.mp4`, `mahoraga.mp4`
  (domain-expansion cutscenes — great for an "ARRIVE"/reveal moment), `specialz.mp3`
  (JJK OP loop), `demo.gif`. **Best video assets of all references.**
- **jjkfanpage** (root): clean character portraits — `gojo.webp`, `sukuna.webp` (`Sukuna_29.webp`),
  `Yuji_Itadori_29.webp`, `maki.webp`, `panda.webp`, `inumaki.webp`, `kenjaku.webp`,
  `Megumi_Fushiguro.webp`, `Nobara_Kugisaki_29.webp`, `Suguru_Geto_29.webp`,
  `Yuta_Okkotsu_29.webp`, `rika.webp`, `logo.jpg`.
- **jjkwebb `/jjkphotos`**: large gallery (gojo variants, sukuna, yuji, rika, technique art)
  — texture/background material.

## Techniques Worth Stealing (batch 2)

### 9. Gesture + Voice "Domain Expansion" trigger  (natsu90-jjk) — HERO INNOVATION
- **TensorFlow.js HandPose Detection** (MediaPipe Hands runtime, maxHands: 2) + **Fingerpose**
  `GestureDescription` (per-finger curl/direction) to recognize JJK hand signs.
- **Web Speech API** (`webkitSpeechRecognition`, continuous) listens for keyword
  ("domain expansion"); on match → plays the technique cutscene video to a canvas via
  `requestAnimationFrame` `drawImage` (object-fit cover math), with looping background audio.
- Flow: gesture detected → mic activates → keyword spoken → fullscreen cutscene.
→ **CampusPath USP idea**: an Easter-egg "Domain Expansion" mode — user makes the hand sign
  (or a simpler tap-and-hold fallback) to fullscreen the campus into an immersive aura view,
  or to trigger the "ARRIVE" celebration. High risk/effort; scope as OPTIONAL stretch.
  Note: needs HTTPS + camera/mic permission; provide non-camera fallback. Heavy TF.js bundle —
  lazy-load only on that route.

### 10. IntersectionObserver scroll-reveal  (jjkwebb)
Dead-simple: observe `.item`, add `.show` class on intersect (threshold 0.2), unobserve.
→ **Use for**: cheap, dependency-free scroll-in reveals on the lore/landing page and
  place cards. Lighter alternative to GSAP ScrollTrigger where full timelines aren't needed.

### 11. Character-bio modal pattern  (jjkfanpage)
Click portrait → populate + show modal; click backdrop/close → hide.
→ **Use for**: place-detail popovers styled as "sorcerer dossier" cards.

## Updated Library Note
- Add **@tensorflow-models/hand-pose-detection + fingerpose** ONLY if we commit to the
  gesture Domain Expansion stretch feature; keep it lazy-loaded and isolated.
- **Web Speech API** is zero-dependency (browser built-in) — usable for a voice-command
  Easter egg regardless.

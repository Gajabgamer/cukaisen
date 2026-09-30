# Requirements Document

## Introduction

CampusPath is competing in Mission #01 "THE VEIL" at the NexaSoul BuildSprint 2026, a Jujutsu Kaisen-themed frontend challenge judged on Aesthetic Execution (40%), Technical Architecture (30%), Innovation (20%), and Pitch Polish (10%). This feature is a full presentation-layer reskin of the existing CampusPath application into a single cursed-energy "JJK" theme, replacing the current light/dark theme system entirely. No data model, schema, or backend business logic changes are in scope.

The reskin wraps the existing DISCOVER → NAVIGATE → ARRIVE product flow in an in-fiction storyline: the campus is Jujutsu Tech, "THE VEIL" is a cursed mist event that scrambled navigation, and the user plays a low-grade sorcerer restoring navigation and reclaiming campus locations. A mentor archetype (a Gojo-post-Shibuya-styled elite sorcerer who has lost/sealed his own technique) delivers narrative copy at key moments. The reskin redefines the existing CSS custom-property token system in `globals.css` and the existing `useTheme` mechanism rather than introducing a parallel styling system, and integrates the Cursed Artifact Mandate (3+ real campus photos with "we discovered X → therefore built Y" framing) at designated UI slots. A simplified, non-ML tap-and-hold "Domain Expansion" Easter egg delivers a high-impact visual payoff (screen shake, aura/cutscene reveal, glitch text) without camera/mic/TensorFlow dependencies.

## Glossary

- **Theme_System**: The mechanism (currently `src/lib/useTheme.ts` + `data-theme` attribute + `localStorage` key `campusnav-theme` + CSS custom properties in `src/app/globals.css`) that controls the application's visual appearance.
- **Cursed_Theme**: The single JJK-styled visual theme (color tokens, typography, iconography, motion) that replaces the existing light/dark theme system.
- **Veil_Loader**: The full-screen intro reveal experience shown during initial app load, styled as a dissolving cursed mist/veil that wipes away via clip-path to reveal the underlying content.
- **Mentor_Copy**: Short narrative text lines, written in the voice of the Mentor_Archetype, shown at onboarding, loading, empty-state, and error-state moments.
- **Mentor_Archetype**: The in-fiction elite-sorcerer persona (Gojo-post-Shibuya-styled, techniqueless/sealed) whose voice is used for Mentor_Copy.
- **Cursed_Territory_Name**: The in-fiction lore label assigned to a place category (e.g. "Restoration Shrine" for cafeteria), used alongside or in place of the literal category name in the UI.
- **Domain_Expansion_Trigger**: The simplified tap-and-hold user interaction (no camera, microphone, or ML model) that activates the Domain Expansion visual payoff.
- **Domain_Expansion_Sequence**: The visual payoff triggered by the Domain_Expansion_Trigger, composed of a screen-shake effect, an aura or cutscene-video reveal, and RGB-split glitch text.
- **Cursed_Artifact_Slot**: A designated UI location (hero backdrop, place-card image area, lore section, or pitch copy block) reserved for a real campus photograph supplied by the user, framed with "we discovered X → therefore built Y" narrative copy.
- **Reduced_Motion_Mode**: The application's rendering mode when the OS-level `prefers-reduced-motion` setting is enabled, in which non-essential animation is suppressed or simplified.
- **Performance_Gate**: The runtime logic that disables or downgrades expensive visual effects (particles, cursor trail, video backgrounds, shake) on devices or browsers detected as low-capability.
- **DISCOVER_Surface**: The set of screens where users browse, search, and filter places (landing page, map page's list/grid views, dashboard browse views).
- **NAVIGATE_Surface**: The set of screens showing the campus map and route/direction UI (map page, `CustomCampusMap`, `MapLibreCampusMap`, `MapView`).
- **ARRIVE_Surface**: The set of screens confirming arrival at, or presenting detail for, a specific place (place detail view, arrival confirmation state).
- **Admin_Surface**: The set of admin-only screens (approvals, categories, feedback, manage-parking, places, users, admin dashboard).
- **Auth_Surface**: The set of authentication-related screens (login, register, setup-admin).
- **Cursed_Cursor**: The custom themed cursor replacement rendered on pointer-capable devices, following pointer position with spring-based motion.

## Requirements

### Requirement 1: Global Cursed-Energy Design System

**User Story:** As a hackathon judge evaluating the product, I want a single cohesive cursed-energy visual language applied consistently across the whole application, so that the aesthetic execution feels intentional and complete rather than partially applied.

#### Acceptance Criteria

1. THE Cursed_Theme SHALL define a complete replacement set of values for every CSS custom property currently declared in `src/app/globals.css` under `:root`, `[data-theme="light"]`, and `[data-theme="dark"]` (including `--cn-bg`, `--cn-surface`, `--cn-surface-2`, `--cn-border`, `--cn-border-soft`, `--cn-text-1`, `--cn-text-2`, `--cn-text-3`, `--cn-nav-bg`, `--cn-nav-border`, `--cn-nav-shadow`, `--cn-toggle-bg`, `--cn-toggle-text`, `--background`, `--foreground`).
2. THE Theme_System SHALL apply the Cursed_Theme as the sole visual theme, removing the light/dark theme selection mechanism from the `useTheme` hook and the `data-theme` attribute toggle.
3. THE Cursed_Theme SHALL define a display typeface distinct from the current body sans-serif font, reserved for headings, titles, and the "THE VEIL" branding.
4. THE Cursed_Theme SHALL define a body typeface used for paragraph and UI text that maintains legibility at standard UI sizes.
5. THE Cursed_Theme SHALL define a set of iconography or accent-glyph styling rules (color, glow, stroke treatment) applied consistently to icons across DISCOVER_Surface, NAVIGATE_Surface, ARRIVE_Surface, Admin_Surface, and Auth_Surface.
6. THE Cursed_Theme SHALL define a baseline set of motion tokens (durations, easing curves) used by animated components introduced or restyled under this feature.
7. WHILE Reduced_Motion_Mode is active, THE Cursed_Theme SHALL suppress or replace scroll-driven animation, screen-shake, cursor-trail, and auto-playing video/GIF effects with static or near-static equivalents.
8. WHILE a device or browser is classified as low-capability by the Performance_Gate, THE Cursed_Theme SHALL disable particle effects, cursor-trail rendering, and autoplaying background video across all surfaces.
9. THE Header component SHALL render using Cursed_Theme tokens for background, border, and text color instead of the removed light/dark tokens.
10. THE PlaceCard component SHALL render using Cursed_Theme tokens for background, border, shadow, and text color.
11. THE ImageUpload component SHALL render using Cursed_Theme tokens for background, border, and text color.

### Requirement 2: The Veil Loader / Intro Reveal

**User Story:** As a first-time visitor, I want a cinematic cursed-mist loading intro when the app opens, so that the JJK theme and stakes are established before I start using the product.

#### Acceptance Criteria

1. WHEN the application performs its initial load, THE Veil_Loader SHALL display a full-screen cursed-mist visual covering the underlying page content.
2. WHEN the initial load content becomes ready, THE Veil_Loader SHALL animate a clip-path wipe transition that reveals the underlying page content.
3. WHILE the Veil_Loader is displayed, THE Veil_Loader SHALL render a progress indicator reflecting load progress.
4. WHILE the Veil_Loader is displayed, THE Veil_Loader SHALL display one line of Mentor_Copy.
5. IF Reduced_Motion_Mode is active, THEN THE Veil_Loader SHALL replace the clip-path wipe animation with an opacity-based cross-fade of equivalent or shorter duration.
6. IF the initial load exceeds a defined maximum duration, THEN THE Veil_Loader SHALL dismiss automatically and reveal the underlying page content.
7. THE Veil_Loader SHALL NOT display on client-side route transitions between already-loaded pages within the same session.

### Requirement 3: Storyline and Narrative Layer

**User Story:** As a player-user of CampusPath, I want consistent in-fiction narrative framing across onboarding, loading, empty, and error states, so that the campus navigation experience feels like restoring a cursed campus rather than using a generic utility app.

#### Acceptance Criteria

1. WHERE a screen presents an onboarding introduction, THE Mentor_Archetype SHALL deliver one or more lines of Mentor_Copy introducing the "restore navigation, reclaim the campus" premise.
2. WHEN a data-loading state is shown on the DISCOVER_Surface, NAVIGATE_Surface, or ARRIVE_Surface, THE Mentor_Archetype SHALL deliver one line of Mentor_Copy relevant to loading.
3. WHEN a list, search, or map view returns zero results, THE Mentor_Archetype SHALL deliver one line of Mentor_Copy framed as the location remaining "hidden" or "uncharted."
4. IF an error occurs on a user-facing action, THEN THE Mentor_Archetype SHALL deliver one line of Mentor_Copy framed in-fiction as a "curse" or "interference," alongside the underlying error information.
5. THE CampusPath application SHALL define a mapping from each existing place category to one Cursed_Territory_Name.
6. WHEN a place category is displayed on the DISCOVER_Surface, ARRIVE_Surface, or place detail view, THE CampusPath application SHALL display the corresponding Cursed_Territory_Name alongside or in place of the literal category name.
7. THE about page SHALL present the "THE VEIL" lore summary, the DISCOVER → NAVIGATE → ARRIVE in-fiction framing, and the Mentor_Archetype introduction.
8. THE CampusPath application SHALL apply a consistent set of Mentor_Copy lines across onboarding, loader, empty-state, and error-state occurrences such that no two unrelated states display identical copy.

### Requirement 4: DISCOVER Stage Theming

**User Story:** As a student browsing campus places, I want the browse, search, and category grid experience restyled to match the cursed campus theme, so that discovering places feels like sensing cursed territory.

#### Acceptance Criteria

1. THE landing page SHALL render its hero section using Cursed_Theme typography, color tokens, and a Cursed_Artifact_Slot for backdrop imagery.
2. THE landing page SHALL frame the DISCOVER → NAVIGATE → ARRIVE flow using the in-fiction "sense → traverse → reclaim" narrative labels.
3. THE dashboard browse and category grid views SHALL render category tiles using Cursed_Territory_Name labels and Cursed_Theme card styling.
4. WHEN a user submits a search query on the DISCOVER_Surface, THE CampusPath application SHALL render matching results using Cursed_Theme card styling without altering the underlying search/filter logic.
5. WHERE the viewing device is pointer-capable and not subject to the Performance_Gate, THE DISCOVER_Surface SHALL render the Cursed_Cursor in place of the native cursor.
6. WHILE a place card is scrolled into view on the DISCOVER_Surface, THE CampusPath application SHALL apply a scroll-reveal entrance animation to that card.
7. THE add-place dashboard screen SHALL render its form using Cursed_Theme tokens for backgrounds, borders, inputs, and buttons.

### Requirement 5: NAVIGATE Stage Theming

**User Story:** As a student navigating to a campus place, I want the map and routing interface restyled to the cursed campus theme, so that traversing the route feels like exorcising a cursed path.

#### Acceptance Criteria

1. THE CustomCampusMap component SHALL render its UI chrome (controls, markers, popups) using Cursed_Theme color tokens.
2. THE MapLibreCampusMap component SHALL render its UI chrome using Cursed_Theme color tokens, consistent with the existing MapLibre control overrides in `globals.css`.
3. THE MapView component SHALL render its container and overlay elements using Cursed_Theme color tokens.
4. WHEN a place marker is placed on the map, THE NAVIGATE_Surface SHALL render the marker using a Cursed_Theme accent color and the existing marker-pop animation restyled with Cursed_Theme motion tokens.
5. THE dashboard parking screen SHALL render parking status indicators using Cursed_Theme color tokens while preserving the existing status semantics (available/occupied/reserved or equivalent).
6. WHILE an active route or direction is displayed on the NAVIGATE_Surface, THE CampusPath application SHALL render the route path using a Cursed_Theme accent color distinct from the default map background.

### Requirement 6: ARRIVE Stage Theming

**User Story:** As a student who has reached a destination, I want an arrival confirmation and place-detail view themed to the cursed campus story, so that arriving feels like reclaiming a location.

#### Acceptance Criteria

1. THE dashboard place detail view SHALL render place information, photos, and metadata using Cursed_Theme tokens.
2. WHEN a user reaches or opens the arrival confirmation state for a place, THE ARRIVE_Surface SHALL display Mentor_Copy framed as reclaiming or purifying that location.
3. THE dashboard place detail view SHALL include a Cursed_Artifact_Slot for a real campus photograph associated with that place.
4. WHERE a place detail view is presented as a modal or overlay, THE ARRIVE_Surface SHALL render it using the character-bio-styled dossier card pattern with Cursed_Theme tokens.

### Requirement 7: Cursed Artifact Mandate Integration

**User Story:** As a hackathon pitch presenter, I want designated slots for real campus photographs woven into the UI with "we discovered X → therefore built Y" framing, so that the submission satisfies the anti-AI-fluff judging requirement.

#### Acceptance Criteria

1. THE landing page hero SHALL include at least one Cursed_Artifact_Slot for a full-bleed backdrop photograph.
2. THE PlaceCard component SHALL include a Cursed_Artifact_Slot for place imagery distinct from generic placeholder graphics.
3. THE about page SHALL include a lore section containing at least one Cursed_Artifact_Slot paired with "we discovered X → therefore built Y" caption copy.
4. WHERE a Cursed_Artifact_Slot has no supplied photograph, THE CampusPath application SHALL render a themed placeholder that visually matches the Cursed_Theme rather than a blank or broken image state.
5. THE CampusPath application SHALL provide at least 3 distinct Cursed_Artifact_Slots across the landing page, PlaceCard component, and about page combined.

### Requirement 8: Domain Expansion Tap-and-Hold Easter Egg

**User Story:** As a user exploring the app, I want a hidden tap-and-hold interaction that triggers a dramatic "Domain Expansion" visual sequence, so that the product demonstrates a memorable innovation moment without requiring camera or microphone access.

#### Acceptance Criteria

1. WHEN a user presses and holds a designated trigger element for a defined minimum duration, THE Domain_Expansion_Trigger SHALL initiate the Domain_Expansion_Sequence.
2. IF the user releases the trigger element before the defined minimum duration elapses, THEN THE Domain_Expansion_Trigger SHALL cancel the pending activation without initiating the Domain_Expansion_Sequence.
3. WHEN the Domain_Expansion_Sequence initiates, THE CampusPath application SHALL play a screen-shake effect on the current view.
4. WHEN the Domain_Expansion_Sequence initiates, THE CampusPath application SHALL display a full-screen aura or cutscene-video reveal.
5. WHEN the Domain_Expansion_Sequence initiates, THE CampusPath application SHALL render RGB-split glitch text over or following the aura/cutscene reveal.
6. THE Domain_Expansion_Trigger SHALL NOT require camera access, microphone access, or any machine-learning model.
7. WHEN the Domain_Expansion_Sequence completes, THE CampusPath application SHALL return the view to its normal, interactive state.
8. IF Reduced_Motion_Mode is active, THEN THE Domain_Expansion_Sequence SHALL omit the screen-shake effect while still presenting the aura/cutscene reveal and glitch text.
9. WHERE a device is classified as low-capability by the Performance_Gate, THE Domain_Expansion_Sequence SHALL substitute a static-image aura reveal for the cutscene video.

### Requirement 9: Admin Surface Restyling

**User Story:** As an admin managing campus data, I want the admin screens visually consistent with the cursed campus theme at a calmer visual intensity, so that day-to-day moderation tasks stay efficient while still matching the overall aesthetic.

#### Acceptance Criteria

1. THE admin approvals, categories, feedback, manage-parking, places, and users screens SHALL render using Cursed_Theme color tokens and typography.
2. THE Admin_Surface SHALL apply a lower visual intensity variant of the Cursed_Theme, reducing glow, particle, and animation effects relative to DISCOVER_Surface, NAVIGATE_Surface, and ARRIVE_Surface.
3. THE Admin_Surface SHALL preserve all existing data tables, forms, and action controls without altering their underlying functionality.
4. THE AdminClientLayout and admin layout SHALL render navigation chrome using Cursed_Theme tokens consistent with the Header component styling.

### Requirement 10: Auth Surface Restyling

**User Story:** As a new or returning user, I want the login, register, and setup-admin screens themed to match the cursed campus story, so that the first interaction with the product already establishes the aesthetic.

#### Acceptance Criteria

1. THE login page SHALL render its form using Cursed_Theme color tokens, typography, and input styling.
2. THE register page SHALL render its form using Cursed_Theme color tokens, typography, and input styling.
3. THE setup-admin page SHALL render its form using Cursed_Theme color tokens, typography, and input styling.
4. WHERE an Auth_Surface screen displays introductory copy, THE Mentor_Archetype SHALL deliver one line of Mentor_Copy appropriate to that screen.
5. IF a form validation error occurs on an Auth_Surface screen, THEN THE CampusPath application SHALL display the error using Cursed_Theme error styling alongside the existing validation message.

### Requirement 11: Accessibility and Performance Non-Functional Requirements

**User Story:** As a judge or user accessing CampusPath on varied hardware and accessibility settings, I want the cursed theme to remain readable and performant, so that the aesthetic does not come at the cost of usability.

#### Acceptance Criteria

1. THE Cursed_Theme SHALL define primary text and background color token pairs that meet a 4.5:1 contrast ratio for body text across DISCOVER_Surface, NAVIGATE_Surface, ARRIVE_Surface, Admin_Surface, and Auth_Surface.
2. THE Cursed_Theme SHALL define large-text and heading color token pairs that meet a 3:1 contrast ratio.
3. WHILE Reduced_Motion_Mode is active, THE CampusPath application SHALL disable the Cursed_Cursor trail effect, scroll-driven parallax, and the Veil_Loader clip-path animation across all surfaces.
4. THE Performance_Gate SHALL evaluate device capability on initial load before enabling particle effects, cursor-trail rendering, autoplaying background video, or the Domain_Expansion_Sequence cutscene video.
5. WHERE a mobile viewport is detected, THE CampusPath application SHALL disable the Cursed_Cursor and substitute touch-appropriate tap feedback in its place.
6. THE CampusPath application SHALL lazy-load Domain Expansion cutscene video and aura assets such that they are not fetched until the Domain_Expansion_Trigger is engaged for the first time.
7. IF a Cursed_Theme visual asset (font, video, GIF) fails to load, THEN THE CampusPath application SHALL fall back to a themed static equivalent without blocking page interactivity.

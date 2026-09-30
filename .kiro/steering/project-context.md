# CampusPath — Project Context

## The Event: NexaSoul BuildSprint 2026

CampusPath is the submission for **Mission #01 "THE VEIL"** in the NexaSoul BuildSprint 2026,
a Jujutsu Kaisen-themed frontend product challenge held Sep 30, 2026 at Chandigarh University
(B1 & B2 halls).

- **Mission #01 "THE VEIL" (Grade 1):** A mysterious Veil has disrupted campus navigation.
  Students struggle to locate places, services, and activities.
- **Final unified product:** Campus Discovery + Navigation System
- **Product flow:** DISCOVER → NAVIGATE → ARRIVE
- **Pair A (Cursed Sight):** Visual Campus Discovery / Navigation Module
- **Pair B (Cursed Movement):** Route & Journey Direction Module

### Judging Priorities (weight matters when making tradeoffs)
- Aesthetic Execution — 40%
- Technical Architecture — 30%
- Innovation — 20%
- Pitch Polish — 10%

### Cursed Artifact Mandate (anti-AI-fluff rule)
The interface must integrate at least 3 original campus photographs of key blocks/landmarks.
Pitch framing: "We discovered X on campus → therefore we built Y." Generic stock-photo
templates are penalized.

## The Product

A **Smart Campus Navigation and Information Platform** — a mobile-first Progressive Web App.
A custom campus map bounded to college limits where users locate blocks, departments,
classrooms, faculty offices, cafeterias, and parking; explore categorized places with photos;
and get in-campus directions. Includes a community contribution model (users submit places,
admins approve) plus time-limited live location sharing and real-time parking availability.

### Actors
- **User (Student / Faculty / Visitor):** view map/places, search & filter, add places, share live location
- **Admin:** approve/reject submitted places, manage campus structure, update parking availability

## Tech Stack (confirmed from package.json)

- **Framework:** Next.js 16.1.2, React 19.2 (App Router)
- **Maps:** Leaflet + react-leaflet, MapLibre GL
- **Database:** Neon Serverless PostgreSQL via Prisma 7 (`@prisma/adapter-neon`)
- **Auth:** Neon Auth + Better Auth (Google OAuth configured in Neon Auth)
- **Media storage:** Azure Blob Storage (`@azure/storage-blob`)
- **Styling:** Tailwind CSS v4
- **Realtime:** WebSockets (`ws`)
- **Deploy:** Vercel (+ Cloudflare Wrangler config present)
- Package name: `clmap`

### Required environment variables
```
DATABASE_URL
NEON_AUTH_BASE_URL
NEON_AUTH_COOKIE_SECRET
NEXT_PUBLIC_APP_URL
```

## Data Model

- **User / Role**
- Hierarchy: **Campus → Block → Floor → Room**
- **Place** (name, description, category, block/floor/room, created_by, approval_status)
  - **PlaceCategory**, **PlacePhoto**, **Approval** (admin review workflow)
- **ParkingArea → ParkingSlot** (status)
- **Live location sharing** (time-limited)

## Non-Functional Requirements

- Mobile-first responsive design
- Secure authentication
- Scalable cloud storage
- Fast read operations for map data

## Conventions

- Local `users` table row is created/updated on Neon Auth sign-in; used for roles, approvals, reviews.
- User-submitted places require admin approval before becoming publicly visible.

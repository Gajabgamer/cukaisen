/**
 * Mentor Copy pools.
 *
 * Short narrative lines delivered in the voice of the Mentor_Archetype
 * (the sealed-technique Sensei), per design.md §2.3.
 *
 * Each pool key below is used at a distinct narrative moment (loader,
 * onboarding, empty state, error state, etc.) Every line across every pool
 * must be textually distinct from every other pool's lines (Requirement 3.8) —
 * review before adding new lines.
 */

export const MENTOR_COPY = {
  loaderIntro: [
    "The mist hasn't lifted yet. Give it a second — some of us don't rely on instinct alone.",
    "Hold on. Even without my technique, I know better than to rush a barrier this thick.",
  ],
  onboarding: [
    'Welcome to Jujutsu Tech, first-year. THE VEIL scrambled every ward on this campus — your fieldwork is to map it back, one territory at a time.',
    "Grade 4, huh? Don't worry. I lost my technique and I'm still standing. You'll manage a campus map.",
  ],
  emptyResults: [
    "Nothing here. Either it's warded from us, or it simply doesn't exist yet — try another sensing angle.",
    "That territory's still hidden behind the mist. Uncharted, not gone.",
  ],
  errorInterference: [
    'Curse interference. Something in the veil pushed back — here\'s what it left behind:',
    "That's not a wall, that's cursed static. Give it another try.",
  ],
  arrivalConfirmed: [
    'Territory reclaimed. One less blind spot on this campus.',
    "Ward lifted. This one's yours now, first-year.",
  ],
  adminApproval: [
    "Approved. The Council's seal is on it — this territory's official.",
    'Signed off. Even sealed techniques recognize good fieldwork.',
  ],
  authLogin: [
    "Credentials, sorcerer. The Council doesn't let just anyone past the barrier.",
  ],
  authRegister: [
    "New enrollment? Good. Jujutsu Tech always needs more first-years who don't run from a little mist.",
  ],
  notFound404: [
    'This path doesn\'t exist — not cursed, just never mapped. Head back before the mist gets ideas.',
  ],
} as const

export type MentorCopyKey = keyof typeof MENTOR_COPY

const EMPTY_POOL_FALLBACK = '...the mist stirs.'

/**
 * Simple deterministic string hash (FNV-1a-style), used to derive a stable
 * pseudo-random index from a seed so SSR/CSR renders agree for a given
 * stable seed (e.g. a place id or route path).
 */
function hashString(input: string): number {
  let hash = 2166136261 // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  // Force unsigned 32-bit
  return hash >>> 0
}

/**
 * Picks a line from the requested Mentor_Copy pool.
 *
 * - If `seed` is provided, the pick is deterministic (hash of `seed`) so
 *   repeated calls with the same key+seed always return the same line —
 *   this keeps SSR and CSR renders in agreement.
 * - If `seed` is omitted, the pick is random.
 * - Falls back to "...the mist stirs." if the pool is empty or the key
 *   does not exist.
 */
export function pickMentorLine(key: MentorCopyKey, seed?: string): string {
  const pool = MENTOR_COPY[key] as readonly string[] | undefined

  if (!pool || pool.length === 0) {
    return EMPTY_POOL_FALLBACK
  }

  if (seed !== undefined) {
    const index = hashString(seed) % pool.length
    return pool[index]
  }

  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}

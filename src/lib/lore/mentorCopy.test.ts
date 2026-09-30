import { describe, it, expect } from 'vitest'
import { MENTOR_COPY, pickMentorLine, type MentorCopyKey } from './mentorCopy'

describe('MENTOR_COPY', () => {
  const poolKeys = Object.keys(MENTOR_COPY) as MentorCopyKey[]

  it('has the 9 expected pool keys', () => {
    expect(poolKeys.sort()).toEqual(
      [
        'adminApproval',
        'arrivalConfirmed',
        'authLogin',
        'authRegister',
        'emptyResults',
        'errorInterference',
        'loaderIntro',
        'notFound404',
        'onboarding',
      ].sort(),
    )
  })

  it('every pool has at least one line', () => {
    for (const key of poolKeys) {
      expect(MENTOR_COPY[key].length).toBeGreaterThan(0)
    }
  })

  // 9.2 Property test: Mentor Copy pools are pairwise distinct across unrelated states
  // Property 2: Mentor Copy pools are pairwise distinct across unrelated states
  // Validates: Requirements 3.8
  it('property: no two distinct pools share any line', () => {
    for (let i = 0; i < poolKeys.length; i++) {
      for (let j = i + 1; j < poolKeys.length; j++) {
        const keyA = poolKeys[i]
        const keyB = poolKeys[j]
        const poolA = new Set(MENTOR_COPY[keyA])
        const poolB = MENTOR_COPY[keyB]

        const overlap = poolB.filter((line) => poolA.has(line))
        expect(overlap).toEqual([])
      }
    }
  })
})

describe('pickMentorLine', () => {
  it('returns a line from the requested pool', () => {
    const line = pickMentorLine('loaderIntro')
    expect(MENTOR_COPY.loaderIntro).toContain(line)
  })

  it('is deterministic for the same key + seed', () => {
    const first = pickMentorLine('onboarding', 'place-123')
    const second = pickMentorLine('onboarding', 'place-123')
    expect(second).toBe(first)
  })

  it('falls back to "...the mist stirs." for a nonexistent pool key', () => {
    // @ts-expect-error deliberately testing an invalid key at runtime
    expect(pickMentorLine('doesNotExist')).toBe('...the mist stirs.')
  })
})

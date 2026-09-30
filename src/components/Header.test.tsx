import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup, screen, waitFor, fireEvent } from '@testing-library/react'
import Header from './Header'

let mockPathname = '/profile'
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signOut: vi.fn(async () => null),
  },
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  mockPathname = '/profile'
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ user: null }),
    }))
  )
})

/**
 * Validates: Requirements 1.9
 *
 * Header must render using --cn-nav-* cursed tokens instead of the
 * removed hardcoded rgba values / light-dark tokens.
 */
describe('Header token rendering', () => {
  it('does not reference the old hardcoded nav colors', async () => {
    const { container } = render(<Header />)

    await waitFor(() => {
      expect(container.querySelector('header')).toBeTruthy()
    })

    const html = container.innerHTML

    // Old hardcoded values that should no longer appear anywhere in the markup
    expect(html).not.toContain('rgba(15,23,42,0.9)')
    expect(html).not.toContain('rgba(15,23,42,0.96)')
    expect(html).not.toContain('#a5b4fc')
    expect(html).not.toContain('#fbbf24')
    expect(html).not.toContain('rgba(255,255,255,0.08)')
    expect(html).not.toContain('rgba(255,255,255,0.1)')
    expect(html).not.toContain('rgba(99,102,241,0.15)')
    expect(html).not.toContain('rgba(99,102,241,0.3)')
    expect(html).not.toContain('rgba(251,191,36')
  })

  it('applies --cn-nav-* tokens to the header background/border/shadow', async () => {
    const { container } = render(<Header />)

    await waitFor(() => {
      expect(container.querySelector('header')).toBeTruthy()
    })

    const header = container.querySelector('header') as HTMLElement
    expect(header.getAttribute('style')).toContain('var(--cn-nav-bg)')
    expect(header.getAttribute('style')).toContain('var(--cn-nav-border)')
    expect(header.getAttribute('style')).toContain('var(--cn-nav-shadow)')
  })

  it('uses the cursed purple accent token for active nav items', async () => {
    mockPathname = '/parking'
    const { container } = render(<Header />)

    await waitFor(() => {
      expect(container.querySelector('header')).toBeTruthy()
    })

    const html = container.innerHTML
    expect(html).toContain('var(--cn-accent-purple)')
  })

  it('applies the cn-glass utility class to the dropdown menu', async () => {
    vi.mocked(fetch).mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'USER', emailVerified: true },
      }),
    }) as unknown as Response)

    const { container } = render(<Header />)

    const userInitial = await screen.findByText('T')
    const trigger = userInitial.closest('button') as HTMLButtonElement
    fireEvent.click(trigger)

    const glassPanel = container.querySelector('.cn-glass')
    expect(glassPanel).toBeTruthy()
  })

  it('uses the cursed admin accent token for the admin nav item, not the old amber hex', async () => {
    vi.mocked(fetch).mockImplementation(async () => ({
      ok: true,
      json: async () => ({
        user: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN', emailVerified: true },
      }),
    }) as unknown as Response)

    const { container } = render(<Header />)

    await waitFor(() => {
      expect(container.querySelector('header')).toBeTruthy()
    })

    const html = container.innerHTML
    expect(html).not.toContain('#fbbf24')
  })
})

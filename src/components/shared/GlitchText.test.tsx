import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import GlitchText from './GlitchText'

afterEach(() => {
  cleanup()
})

describe('GlitchText', () => {
  it('renders the given children as text content', () => {
    const { container } = render(<GlitchText>THE VEIL</GlitchText>)
    expect(container.textContent).toBe('THE VEIL')
  })

  it('sets the data-text attribute to match the rendered text', () => {
    const { container } = render(<GlitchText>THE VEIL</GlitchText>)
    const el = container.querySelector('.glitch-text') as HTMLElement
    expect(el.getAttribute('data-text')).toBe('THE VEIL')
  })

  it('renders as a span by default', () => {
    const { container } = render(<GlitchText>THE VEIL</GlitchText>)
    expect(container.querySelector('span.glitch-text')).toBeTruthy()
  })

  it('renders as the custom element type when "as" is provided', () => {
    const { container } = render(<GlitchText as="h1">THE VEIL</GlitchText>)
    const heading = container.querySelector('h1')
    expect(heading).toBeTruthy()
    expect(heading?.classList.contains('glitch-text')).toBe(true)
    expect(heading?.getAttribute('data-text')).toBe('THE VEIL')
  })
})

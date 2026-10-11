// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CardMedia } from '@/components/CardMedia'

afterEach(cleanup)

describe('CardMedia', () => {
  it('should renders the card image', () => {
    const { container } = render(<CardMedia />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      './card.png'
    )
  })
})

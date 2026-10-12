// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Footer } from '@/components/Footer'

afterEach(cleanup)

describe('Footer', () => {
  it('should show the copyright notice', () => {
    render(<Footer />)
    expect(
      screen.getByText('© 2026 Digital bank limited. All rights reserved')
    ).toBeTruthy()
  })
})

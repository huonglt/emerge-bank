import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ErrorMessage } from '@/components/ErrorMessage'

afterEach(cleanup)

describe('ErrorMessage', () => {
  it('should show the message as an alert', () => {
    render(<ErrorMessage message="PINs do not match" />)
    expect(screen.getByRole('alert').textContent).toBe('PINs do not match')
  })

  it.each([
    ['no message', undefined],
    ['an empty message', ''],
  ])('should render nothing for %s', (_label, message) => {
    const { container } = render(<ErrorMessage message={message} />)
    expect(container.innerHTML).toBe('')
  })

  it('should add the given class to its own', () => {
    render(<ErrorMessage message="Something went wrong" className="pb-2" />)
    expect(screen.getByRole('alert').className).toBe(
      'text-left text-red-700 pb-2'
    )
  })
})

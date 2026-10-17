// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Card } from '@/components/Card'
import { makeUser } from '@/test/fixtures'

afterEach(cleanup)

describe('Card', () => {
  it('should shows the title and the masked card number', () => {
    render(<Card user={makeUser()} />)
    expect(screen.getByText('Your card')).toBeTruthy()
    expect(screen.getByText('•••• •••• •••• 4242')).toBeTruthy()
  })

  it('should shows the card number, not the account number', () => {
    render(<Card user={makeUser({ accountNumber: 'ACCOUNT-9999' })} />)
    expect(screen.queryByText('ACCOUNT-9999')).toBeNull()
    expect(screen.getByText('•••• •••• •••• 4242')).toBeTruthy()
  })

  it('should show the card name and number on the virtual card', () => {
    render(<Card user={makeUser()} />)
    const card = screen.getByRole('region', { name: 'Virtual card' })
    expect(within(card).getByText('ALICE TANE')).toBeTruthy()
    expect(within(card).getByText('•••• •••• •••• 4242')).toBeTruthy()
  })
})

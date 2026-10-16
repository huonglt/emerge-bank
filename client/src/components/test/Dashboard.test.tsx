import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Dashboard } from '@/components/Dashboard'
import { makeCard, makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

afterEach(cleanup)

const SETUP = 'We need to setup your card before you can use it'

describe('Dashboard', () => {
  it('should ask for the card name when the card has no name yet', () => {
    renderWithClient(
      <Dashboard
        user={makeUser({ card: makeCard({ name: null, isPINSet: false }) })}
      />
    )
    expect(screen.getByText('Setting up your virtual bank card')).toBeTruthy()
    expect(
      screen.getByText('We need a name for your virtual card')
    ).toBeTruthy()
    expect(screen.getByLabelText('Name')).toBeTruthy()
    // the PIN step comes only after the card is named
    expect(screen.queryByText('We need a PIN for your virtual card')).toBeNull()
  })

  it('should ask for the PIN once the card is named', () => {
    renderWithClient(
      <Dashboard user={makeUser({ card: makeCard({ isPINSet: false }) })} />
    )
    expect(screen.getByText('Setting up your virtual bank card')).toBeTruthy()
    expect(screen.getByText('We need a PIN for your virtual card')).toBeTruthy()
    expect(screen.getByLabelText('PIN')).toBeTruthy()
    expect(screen.getByLabelText('Confirmed PIN')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
    // the name step is already done
    expect(
      screen.queryByText('We need a name for your virtual card')
    ).toBeNull()
  })

  it('should show the account and the card, and no setup, when the card is fully set up', () => {
    renderWithClient(<Dashboard user={makeUser()} />)
    expect(screen.getByText('Your account')).toBeTruthy()
    expect(screen.getByText('Your card')).toBeTruthy()
    expect(screen.queryByText(SETUP)).toBeNull()
  })

  it("should show the user's account and card details", () => {
    renderWithClient(
      <Dashboard
        user={makeUser({
          name: 'Bob Chen',
          card: makeCard({ name: 'BOB CARD', maskedCardNumber: '***.123' }),
        })}
      />
    )
    expect(screen.getByText('Bob Chen')).toBeTruthy()
    expect(screen.getByText('BOB CARD')).toBeTruthy()
    expect(screen.getByText('***.123')).toBeTruthy()
  })
})

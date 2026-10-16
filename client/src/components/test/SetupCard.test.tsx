import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { SetupCard } from '@/components/SetupCard'
import { makeCard, makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

afterEach(cleanup)

describe('SetupCard', () => {
  it('should show why setup is needed', () => {
    renderWithClient(
      <SetupCard user={makeUser({ card: makeCard({ name: null }) })} />
    )
    expect(
      screen.getByText('We need to setup your card before you can use it')
    ).toBeTruthy()
  })

  it('should ask for the card name when the card has no name yet', () => {
    renderWithClient(
      <SetupCard
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
      <SetupCard user={makeUser({ card: makeCard({ isPINSet: false }) })} />
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
})

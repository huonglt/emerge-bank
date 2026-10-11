// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SetupCard } from '@/components/SetupCard'
import { makeCard, makeUser } from '@/test/fixtures'

vi.mock('@/components/CardName', () => ({
  CardName: () => <div data-testid="card-name" />,
}))
vi.mock('@/components/CardPIN', () => ({
  CardPIN: () => <div data-testid="card-pin" />,
}))

afterEach(cleanup)

const shown = () => ({
  name: !!screen.queryByTestId('card-name'),
  pin: !!screen.queryByTestId('card-pin'),
})

describe('SetupCard', () => {
  it('should show why setup is needed', () => {
    render(<SetupCard user={makeUser({ card: makeCard({ name: null }) })} />)
    expect(
      screen.getByText('We need to setup your card before you can use it')
    ).toBeTruthy()
  })

  it('should ask only for the PIN once the card is named', () => {
    render(
      <SetupCard user={makeUser({ card: makeCard({ isPINSet: false }) })} />
    )
    expect(shown()).toEqual({ name: false, pin: true })
  })
})

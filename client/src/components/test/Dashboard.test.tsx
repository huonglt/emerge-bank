// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Dashboard } from '@/components/Dashboard'
import { makeCard, makeUser, makeUserWithoutCard } from '@/test/fixtures'

vi.mock('@/components/SetupCard', () => ({
  SetupCard: ({ user }: { user: { name: string } }) => (
    <div data-testid="setup">{user.name}</div>
  ),
}))
vi.mock('@/components/Account', () => ({
  Account: ({ user }: { user: { name: string } }) => (
    <div data-testid="account">{user.name}</div>
  ),
}))
vi.mock('@/components/Card', () => ({
  Card: ({ user }: { user: { name: string } }) => (
    <div data-testid="card">{user.name}</div>
  ),
}))

afterEach(cleanup)

describe('Dashboard', () => {
  it.each([
    ['there is no card object', makeUserWithoutCard()],
    [
      'the card name is not set (null)',
      makeUser({ card: makeCard({ name: null }) }),
    ],
    [
      'the card name is an empty string',
      makeUser({ card: makeCard({ name: '' }) }),
    ],
    [
      'the card is named but has no PIN',
      makeUser({ card: makeCard({ isPINSet: false }) }),
    ],
    [
      'the card has neither a name nor a PIN',
      makeUser({ card: makeCard({ name: null, isPINSet: false }) }),
    ],
  ])(
    'should show card setup, and hides account and card, when %s',
    (_label, user) => {
      render(<Dashboard user={user} />)
      expect(screen.getByTestId('setup')).toBeTruthy()
      expect(screen.queryByTestId('account')).toBeNull()
      expect(screen.queryByTestId('card')).toBeNull()
    }
  )

  it('should show the account and the card, and no setup, when the card is fully set up', () => {
    render(<Dashboard user={makeUser()} />)
    expect(screen.getByTestId('account')).toBeTruthy()
    expect(screen.getByTestId('card')).toBeTruthy()
    expect(screen.queryByTestId('setup')).toBeNull()
  })

  it('should pass the same user down', () => {
    render(<Dashboard user={makeUser({ name: 'Bob Chen' })} />)
    expect(screen.getByTestId('account').textContent).toBe('Bob Chen')
    expect(screen.getByTestId('card').textContent).toBe('Bob Chen')
  })

  it('should show the account before the card', () => {
    const { container } = render(<Dashboard user={makeUser()} />)
    const ids = Array.from(container.querySelectorAll('[data-testid]')).map(
      (e) => e.getAttribute('data-testid')
    )
    expect(ids).toEqual(['account', 'card'])
  })
})

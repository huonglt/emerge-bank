// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Account } from '@/components/Account'
import { makeUser } from '@/test/fixtures'

afterEach(cleanup)

describe('Account', () => {
  it('should shows the title, the name, the masked account number and the balance', () => {
    render(<Account user={makeUser()} />)
    expect(screen.getByText('Your account')).toBeTruthy()
    expect(screen.getByText('Alice Tane')).toBeTruthy()
    expect(screen.getByText('•••••••••6789')).toBeTruthy()
    expect(screen.getByText('NZD 2450.75$')).toBeTruthy()
  })

  it('should shows a zero balance', () => {
    render(<Account user={makeUser({ accountBalance: 0 })} />)
    expect(screen.getByText('NZD 0$')).toBeTruthy()
  })

  it('should shows the account number exactly as the server sent it', () => {
    render(<Account user={makeUser({ accountNumber: '•••• 1234' })} />)
    expect(screen.getByText('•••• 1234')).toBeTruthy()
  })

  it('should offers the three actions', () => {
    render(<Account user={makeUser()} />)
    for (const name of ['Add money', 'Transfer', 'Pay']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })

  it('should shows the cash and coin icon', () => {
    const { container } = render(<Account user={makeUser()} />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      './cash-coin.svg'
    )
  })
})

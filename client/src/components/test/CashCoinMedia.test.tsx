// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CashCoinMedia } from '@/components/CashCoinMedia'

afterEach(cleanup)

describe('CashCoinMedia', () => {
  it('should render the cash and coin icon', () => {
    const { container } = render(<CashCoinMedia />)
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      './cash-coin.svg'
    )
  })
})

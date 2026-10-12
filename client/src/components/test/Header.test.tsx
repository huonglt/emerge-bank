// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/Header'

vi.mock('@/components/ProfileMenu', () => ({
  ProfileMenu: () => <div data-testid="profile-menu" />,
}))

afterEach(cleanup)

describe('Header', () => {
  it('should show the app name and the profile menu', () => {
    render(<Header />)
    expect(screen.getByText('Digital bank')).toBeTruthy()
    expect(screen.getByTestId('profile-menu')).toBeTruthy()
  })
})

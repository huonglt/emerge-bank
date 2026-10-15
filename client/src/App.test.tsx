import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { api } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
}))
// App only decides which screen to show: stand in for the screens themselves
vi.mock('@/components/Login', () => ({ LogIn: () => <div>login screen</div> }))
vi.mock('@/components/Dashboard', () => ({
  Dashboard: ({ user }: { user: { name: string } }) => (
    <div>dashboard for {user.name}</div>
  ),
}))
vi.mock('@/components/Header', () => ({ Header: () => null }))
vi.mock('@/components/Footer', () => ({ Footer: () => null }))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('App', () => {
  it('should show the login screen when no one is signed in', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Access token required.')
    )
    renderWithClient(<App />)
    expect(await screen.findByText('login screen')).toBeTruthy()
    expect(screen.queryByText(/dashboard/)).toBeNull()
  })

  it('should show the dashboard for the signed-in user', async () => {
    vi.mocked(api).mockResolvedValue({ user: makeUser({ name: 'Bob Chen' }) })
    renderWithClient(<App />)
    expect(await screen.findByText('dashboard for Bob Chen')).toBeTruthy()
    expect(screen.queryByText('login screen')).toBeNull()
  })

  it('should show an error, and neither screen, when the user data cannot be loaded', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(500, 'Something went wrong'))
    renderWithClient(<App />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Error to fetch user data'
    )
    expect(screen.queryByText('login screen')).toBeNull()
    expect(screen.queryByText(/dashboard/)).toBeNull()
  })
})

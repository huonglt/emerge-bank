import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { api, setAccessToken } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
}))

// a decodable access token: App reads only its expiry, to schedule the auto logout
const signIn = () => {
  const exp = Math.floor(Date.now() / 1000) + 300
  setAccessToken(`x.${btoa(JSON.stringify({ exp }))}.x`)
}

// which screen is showing, from what the user sees on it
const loginShown = () => !!screen.queryByText('Login to your account')
const dashboardShown = () => !!screen.queryByText('Your account')

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  setAccessToken('')
})

describe('App', () => {
  it('should show the login screen, without asking the server, when there is no access token', async () => {
    renderWithClient(<App />)
    expect(await screen.findByText('Login to your account')).toBeTruthy()
    expect(dashboardShown()).toBe(false)
    expect(api).not.toHaveBeenCalled()
  })

  it('should show the login screen when the server rejects the access token', async () => {
    signIn() // a token the server no longer accepts
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Token expired or invalid.')
    )
    renderWithClient(<App />)
    expect(await screen.findByText('Login to your account')).toBeTruthy()
    expect(api).toHaveBeenCalledWith('/me')
  })

  it('should show the dashboard for the signed-in user', async () => {
    signIn()
    vi.mocked(api).mockResolvedValue({ user: makeUser({ name: 'Bob Chen' }) })
    renderWithClient(<App />)
    expect(await screen.findByText('Your account')).toBeTruthy()
    expect(screen.getByText('Bob Chen')).toBeTruthy()
    expect(screen.getByText('Your card')).toBeTruthy()
    expect(screen.getByText('BC')).toBeTruthy() // profile menu in the header
    expect(loginShown()).toBe(false)
  })

  it('should show an error, and neither screen, when the user data cannot be loaded', async () => {
    signIn()
    vi.mocked(api).mockRejectedValue(new ApiError(500, 'Something went wrong'))
    renderWithClient(<App />)
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Error to fetch user data'
    )
    expect(loginShown()).toBe(false)
    expect(dashboardShown()).toBe(false)
  })
})

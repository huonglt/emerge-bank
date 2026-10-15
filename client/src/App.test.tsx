import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import { api, hasAccessToken, setAccessToken } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { createQueryClient } from '@/lib/queryClient'
import { testUser, makeUser } from '@/test/fixtures'
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

const validToken = () =>
  `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 }))}.x`

// which screen is showing, from what the user sees on it
const loginShown = () => !!screen.queryByText('Login to your account')
const dashboardShown = () => !!screen.queryByText('Your account')

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  setAccessToken('')
})

describe('App', () => {
  it('should sign in after a wrong password is corrected', async () => {
    // regression: the wrong password's 401 used to detach the app from the user query,
    // so the next, successful login never left the login screen
    vi.mocked(api).mockImplementation(async (_path, options) => {
      const { password } = options?.body as { password: string }
      if (password !== testUser.password) {
        throw new ApiError(401, 'Username or password is incorrect')
      }
      return {
        user: makeUser(),
        accessToken: validToken(),
        csrfToken: 'csrf-1',
      }
    })
    const { user } = renderWithClient(<App />, createQueryClient())
    const login = async (password: string) => {
      const name = screen.getByRole('textbox')
      const secret = document.querySelector(
        'input[type="password"]'
      ) as HTMLInputElement
      await user.clear(name)
      await user.type(name, testUser.userName)
      await user.clear(secret)
      await user.type(secret, password)
      await user.click(screen.getByRole('button', { name: 'Login' }))
    }

    await login('wrong-password')
    expect(
      await screen.findByText('Username or password is incorrect')
    ).toBeTruthy()

    await login(testUser.password)
    expect(await screen.findByText('Your account')).toBeTruthy()
    expect(loginShown()).toBe(false)
  })

  it('should show the login screen, without asking the server, when there is no access token', async () => {
    renderWithClient(<App />, createQueryClient())
    expect(await screen.findByText('Login to your account')).toBeTruthy()
    expect(dashboardShown()).toBe(false)
    expect(api).not.toHaveBeenCalled()
  })

  it('should show the login screen when the server rejects the access token', async () => {
    signIn() // a token the server no longer accepts
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Token expired or invalid.')
    )
    renderWithClient(<App />, createQueryClient())
    // the app's 401 handler signs the user out: the rejected token is dropped
    await waitFor(() => expect(hasAccessToken()).toBe(false))
    expect(api).toHaveBeenCalledWith('/me')
    expect(screen.getByText('Login to your account')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should show the dashboard for the signed-in user', async () => {
    signIn()
    vi.mocked(api).mockResolvedValue({ user: makeUser({ name: 'Bob Chen' }) })
    renderWithClient(<App />, createQueryClient())
    expect(await screen.findByText('Your account')).toBeTruthy()
    expect(screen.getByText('Bob Chen')).toBeTruthy()
    expect(screen.getByText('Your card')).toBeTruthy()
    expect(screen.getByText('BC')).toBeTruthy() // profile menu in the header
    expect(loginShown()).toBe(false)
  })

  it('should show an error, and neither screen, when the user data cannot be loaded', async () => {
    signIn()
    vi.mocked(api).mockRejectedValue(new ApiError(500, 'Something went wrong'))
    renderWithClient(<App />, createQueryClient())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Error to fetch user data'
    )
    expect(loginShown()).toBe(false)
    expect(dashboardShown()).toBe(false)
  })
})

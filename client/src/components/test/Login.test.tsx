import { cleanup, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogIn } from '@/components/Login'
import { api, setAccessToken, setCsrfToken } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { testUser, makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrfToken: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const fill = async (user: UserEvent) => {
  await user.type(screen.getByLabelText('Name'), testUser.userName)
  await user.type(screen.getByLabelText('Password'), testUser.password)
}
const login = () =>
  screen.getByRole('button', { name: 'Login' }) as HTMLButtonElement

describe('LogIn: signing in', () => {
  it('should send the user name and password to /login', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/login', {
        method: 'POST',
        body: testUser,
      })
    )
  })

  it('should keep both tokens and cache the user on success', async () => {
    const me = makeUser()
    vi.mocked(api).mockResolvedValue({
      user: me,
      accessToken: 'access-1',
      csrfToken: 'csrf-1',
    })
    const { user, qc } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await waitFor(() => expect(qc.getQueryData(['user'])).toEqual(me))
    expect(setAccessToken).toHaveBeenCalledWith('access-1')
    expect(setCsrfToken).toHaveBeenCalledWith('csrf-1')
  })

  it('should ask for both fields and send nothing when they are empty', async () => {
    const { user } = renderWithClient(<LogIn />)
    await user.click(login())
    const alerts = (await screen.findAllByRole('alert')).map(
      (a) => a.textContent
    )
    expect(alerts).toEqual([
      'User name should be more than 4 characters',
      'Password should be more than 4 characters',
    ])
    expect(api).not.toHaveBeenCalled()
  })
})

describe('LogIn: submit button', () => {
  it('should disables Login while the request is running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await waitFor(() => expect(login().disabled).toBe(true))
  })

  it('should sends only one request when Login is clicked twice', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.dblClick(login())
    await waitFor(() => expect(login().disabled).toBe(true))
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should enables Login again when the login fails', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Username or password is incorrect')
    )
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Username or password is incorrect'
    )
    expect(login().disabled).toBe(false)
  })
})

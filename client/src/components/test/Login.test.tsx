import { cleanup, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogIn } from '@/components/Login'
import { api, setAccessToken, setCsrfToken } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { testUser, makeUser } from '@/test/fixtures'
import { renderWithClient, storedMutationInputs } from '@/test/render'

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
      'User name must be at least 4 characters',
      'Password must be at least 4 characters',
    ])
    expect(api).not.toHaveBeenCalled()
  })

  it('should accept a user name and password of exactly 4 characters', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await user.type(screen.getByLabelText('Name'), 'abcd')
    await user.type(screen.getByLabelText('Password'), 'wxyz')
    await user.click(login())
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('should reject a user name and password longer than 24 characters', async () => {
    const { user } = renderWithClient(<LogIn />)
    await user.type(screen.getByLabelText('Name'), 'a'.repeat(25))
    await user.type(screen.getByLabelText('Password'), 'b'.repeat(25))
    await user.click(login())
    const alerts = (await screen.findAllByRole('alert')).map(
      (a) => a.textContent
    )
    expect(alerts).toEqual([
      'User name must be no more than 24 characters',
      'Password must be no more than 24 characters',
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

describe('LogIn: the password in memory', () => {
  it.each([
    [
      'the login succeeds',
      () =>
        vi.mocked(api).mockResolvedValue({
          user: makeUser(),
          accessToken: 'access-1',
          csrfToken: 'csrf-1',
        }),
    ],
    [
      'the login fails',
      () =>
        vi
          .mocked(api)
          .mockRejectedValue(
            new ApiError(401, 'Username or password is incorrect')
          ),
    ],
  ])('should not keep the plain password once %s', async (_label, answer) => {
    answer()
    const { user, qc } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(storedMutationInputs(qc)).not.toContain(testUser.password)
    )
    // the user name is not secret and stays
    expect(storedMutationInputs(qc)).toContain(testUser.userName)
  })

  it('should clear the password after submitting, and keep the user name', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Username or password is incorrect')
    )
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await screen.findByText('Username or password is incorrect')
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe(
      ''
    )
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(
      testUser.userName
    )
  })

  it('should ask for the password again after a failed login, and send nothing', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Username or password is incorrect')
    )
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await screen.findByText('Username or password is incorrect')
    await user.click(login())
    expect(
      await screen.findByText('Password must be at least 4 characters')
    ).toBeTruthy()
    expect(api).toHaveBeenCalledTimes(1)
  })
})

// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoLogout, useLogout } from '@/hooks/useLogout'
import { api, setAccessToken, setCsrf, tokenExpireIn } from '@/lib/api'
import type { User } from '@/types'
import { makeUser } from '@/test/fixtures'
import { makeClient, wrapperFor } from '@/test/render'
import { ApiError } from '@/lib/ApiError'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrf: vi.fn(),
  tokenExpireIn: vi.fn(),
}))

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

const EXPIRES_IN = 300_000 // 5 min token

const expectSessionWiped = (qc: ReturnType<typeof makeClient>) => {
  expect(setAccessToken).toHaveBeenCalledWith('')
  expect(setCsrf).toHaveBeenCalledWith('')
  expect(qc.getQueryData(['user'])).toBeUndefined()
}

describe('useLogout', () => {
  const setup = () => {
    const qc = makeClient()
    qc.setQueryData(['user'], makeUser())
    const hook = renderHook(() => useLogout(), { wrapper: wrapperFor(qc) })
    return { qc, ...hook }
  }

  it('should POST to /logout and wipe the session on logout()', async () => {
    vi.mocked(api).mockResolvedValue(undefined as never)
    const { qc, result } = setup()

    act(() => result.current.logout())

    await waitFor(() => expect(setAccessToken).toHaveBeenCalled())
    expect(api).toHaveBeenCalledWith('/logout', { method: 'POST' })
    expectSessionWiped(qc)
  })

  it('should still wipe the session when the logout request fails', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(500, 'Server error'))
    const { qc, result } = setup()

    act(() => result.current.logout())

    await waitFor(() => expect(setAccessToken).toHaveBeenCalled())
    expectSessionWiped(qc)
  })
})

describe('useAutoLogout', () => {
  /**
   * Mirrors the app: App runs useAutoLogout with the cached user,
   * while another component (ProfileMenu) has its own useLogout.
   */
  const setup = (
    user: User | null = makeUser(),
    expiresIn: number | null = EXPIRES_IN // null: no access token
  ) => {
    vi.useFakeTimers()
    vi.mocked(api).mockResolvedValue(undefined as never)
    vi.mocked(tokenExpireIn).mockReturnValue(expiresIn ?? undefined)

    const qc = makeClient()
    if (user) qc.setQueryData(['user'], user)

    const hook = renderHook(
      () => {
        const me = useQuery<User | null>({
          queryKey: ['user'],
          queryFn: () => null,
          enabled: false,
        })
        useAutoLogout(me.data?.id)
        return { menu: useLogout() }
      },
      { wrapper: wrapperFor(qc) }
    )
    return { qc, ...hook }
  }

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
  const logins = (qc: ReturnType<typeof makeClient>, user = makeUser()) =>
    act(() => qc.setQueryData(['user'], user))

  it('should not start a timer when no user is signed in', async () => {
    setup(null)

    await advance(EXPIRES_IN * 2)

    expect(tokenExpireIn).not.toHaveBeenCalled()
    expect(api).not.toHaveBeenCalled()
  })

  it('should not start a timer when there is no access token', async () => {
    setup(makeUser(), null)

    await advance(EXPIRES_IN * 2)

    expect(api).not.toHaveBeenCalled()
  })

  it('should log out when the token expires', async () => {
    const { qc } = setup()

    await advance(EXPIRES_IN - 1)
    expect(api).not.toHaveBeenCalled()

    await advance(1)
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/logout', { method: 'POST' })
    expectSessionWiped(qc)
  })

  it('should log out straight away when the token has already expired', async () => {
    setup(makeUser(), -1_000)

    await advance(0)

    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should cancel the timer when the user logs out from another component', async () => {
    const { result } = setup()

    await act(async () => {
      result.current.menu.logout()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api).toHaveBeenCalledTimes(1)

    await advance(EXPIRES_IN * 2)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should give a new login the full session after a manual logout', async () => {
    // regression: the old timer survived a manual logout and fired during the next session
    const { qc, result } = setup()

    await advance(60_000)
    await act(async () => {
      result.current.menu.logout()
      await vi.advanceTimersByTimeAsync(0)
    })
    await advance(60_000)
    vi.mocked(api).mockClear()

    await logins(qc) // same user, same token lifetime as before

    await advance(EXPIRES_IN - 1)
    expect(api).not.toHaveBeenCalled()

    await advance(1)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should keep the countdown when the user data is refetched', async () => {
    const { qc } = setup()

    await advance(EXPIRES_IN - 1_000)
    vi.mocked(tokenExpireIn).mockReturnValue(1_000)
    await logins(qc, makeUser({ accountBalance: 1 })) // e.g. after setting the card name

    await advance(1_000)
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should cancel the timer on unmount', async () => {
    const { unmount } = setup()

    unmount()
    await advance(EXPIRES_IN * 2)

    expect(api).not.toHaveBeenCalled()
  })
})

import { act, renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAutoLogout, useLogout } from '@/hooks/useLogout'
import { api, setAccessToken, setCsrfToken, tokenExpireIn } from '@/lib/api'
import type { User } from '@/types'
import { makeUser } from '@/test/fixtures'
import { makeClient, wrapperFor } from '@/test/render'
import { ApiError } from '@/lib/ApiError'
import { clearSession } from '@/lib/session'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrfToken: vi.fn(),
  tokenExpireIn: vi.fn(),
}))
// a spy that still runs the real clearSession, so the session really is wiped
vi.mock('@/lib/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/session')>()
  return { ...actual, clearSession: vi.fn(actual.clearSession) }
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

const EXPIRES_IN = 300_000 // 5 min token

const expectSessionWiped = (qc: ReturnType<typeof makeClient>) => {
  expect(setAccessToken).toHaveBeenCalledWith('')
  expect(setCsrfToken).toHaveBeenCalledWith('')
  // clearSession empties the whole cache, the user included
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
  const manualLogout = (result: {
    current: { menu: { logout: () => void } }
  }) =>
    act(async () => {
      result.current.menu.logout()
      await vi.advanceTimersByTimeAsync(0)
    })

  it('should not start a timer when no user is signed in', async () => {
    setup(null)

    await advance(EXPIRES_IN * 2)

    expect(tokenExpireIn).not.toHaveBeenCalled()
    expect(clearSession).not.toHaveBeenCalled()
  })

  it('should not start a timer when there is no access token', async () => {
    setup(makeUser(), null)

    await advance(EXPIRES_IN * 2)

    expect(clearSession).not.toHaveBeenCalled()
  })

  it('should clear the session locally when the token expires, without calling the server', async () => {
    const { qc } = setup()

    await advance(EXPIRES_IN - 1)
    expect(clearSession).not.toHaveBeenCalled()

    await advance(1)
    expect(clearSession).toHaveBeenCalledExactlyOnceWith(qc)
    expectSessionWiped(qc)
    // the token is already expired: calling /logout would only get a 401
    expect(api).not.toHaveBeenCalled()
  })

  it('should cancel the timer when the user logs out manually', async () => {
    const { result } = setup()

    await manualLogout(result)
    expect(api).toHaveBeenCalledWith('/logout', { method: 'POST' })
    vi.mocked(clearSession).mockClear()

    await advance(EXPIRES_IN * 2)
    expect(clearSession).not.toHaveBeenCalled()
  })

  it('should cancel the timer on unmount', async () => {
    const { unmount } = setup()

    unmount()
    await advance(EXPIRES_IN * 2)

    expect(clearSession).not.toHaveBeenCalled()
  })
})

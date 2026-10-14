// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLogout } from '@/hooks/useLogout'
import { api, setAccessToken, setCsrf } from '@/lib/api'
import { makeUser } from '@/test/fixtures'
import { makeClient, wrapperFor } from '@/test/render'
import { ApiError } from '@/lib/ApiError'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrf: vi.fn(),
}))

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

const setup = () => {
  const qc = makeClient()
  qc.setQueryData(['user'], makeUser())
  const hook = renderHook(() => useLogout(), { wrapper: wrapperFor(qc) })
  return { qc, ...hook }
}

const expectSessionWiped = (qc: ReturnType<typeof makeClient>) => {
  expect(setAccessToken).toHaveBeenCalledWith('')
  expect(setCsrf).toHaveBeenCalledWith('')
  expect(qc.getQueryData(['user'])).toBeUndefined()
}

describe('useLogout', () => {
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

  it('should not call the api before a timer is set', async () => {
    vi.useFakeTimers()
    setup()

    await act(() => vi.advanceTimersByTimeAsync(60_000))

    expect(api).not.toHaveBeenCalled()
  })

  it('should log out automatically once the timer expires', async () => {
    vi.useFakeTimers()
    vi.mocked(api).mockResolvedValue(undefined as never)
    const { qc, result } = setup()

    act(() => result.current.setTimer(5_000))

    await act(() => vi.advanceTimersByTimeAsync(4_999))
    expect(api).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(api).toHaveBeenCalledTimes(1)
    expect(api).toHaveBeenCalledWith('/logout', { method: 'POST' })
    expectSessionWiped(qc)
  })

  it('should restart the countdown when the timer is reset', async () => {
    vi.useFakeTimers()
    vi.mocked(api).mockResolvedValue(undefined as never)
    const { result } = setup()

    act(() => result.current.setTimer(5_000))
    await act(() => vi.advanceTimersByTimeAsync(4_000))
    act(() => result.current.setTimer(10_000))

    await act(() => vi.advanceTimersByTimeAsync(9_999))
    expect(api).not.toHaveBeenCalled()

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should not log out again after a manual logout clears the timer', async () => {
    vi.useFakeTimers()
    vi.mocked(api).mockResolvedValue(undefined as never)
    const { result } = setup()

    act(() => result.current.setTimer(5_000))
    await act(async () => {
      result.current.logout()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(api).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should cancel the pending auto logout on unmount', async () => {
    vi.useFakeTimers()
    const { result, unmount } = setup()

    act(() => result.current.setTimer(5_000))
    unmount()

    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(api).not.toHaveBeenCalled()
  })
})

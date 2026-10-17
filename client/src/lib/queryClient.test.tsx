// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hasAccessToken, setAccessToken, setCsrfToken } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { createQueryClient } from '@/lib/queryClient'
import { makeUser } from '@/test/fixtures'
import { wrapperFor } from '@/test/render'
import type { User } from '@/types'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  setAccessToken: vi.fn(),
  setCsrfToken: vi.fn(),
  hasAccessToken: vi.fn(),
}))

afterEach(() => vi.resetAllMocks())

/**
 * Mirrors the app: a component reading the signed in user (like App),
 * plus a mutation and a query that can fail
 */
// signed in (has a token) by default
const setup = (signedIn = true) => {
  vi.mocked(hasAccessToken).mockReturnValue(signedIn)
  const qc = createQueryClient()
  qc.setQueryData(['user'], makeUser())

  const hook = renderHook(
    () => ({
      user: useQuery<User | null>({
        queryKey: ['user'],
        queryFn: () => null,
        enabled: false,
      }).data,
      save: useMutation({
        mutationFn: (err: Error) => Promise.reject(err),
      }),
    }),
    { wrapper: wrapperFor(qc) }
  )
  return { qc, ...hook }
}

const expectSignedOut = () => {
  expect(setAccessToken).toHaveBeenCalledWith('')
  expect(setCsrfToken).toHaveBeenCalledWith('')
}

describe('createQueryClient', () => {
  it('should not sign out on a 401 when no one is signed in (a wrong password on login)', async () => {
    const { qc, result } = setup(false)
    qc.setQueryData(['user'], null)

    act(() =>
      result.current.save.mutate(
        new ApiError(401, 'Username or password is incorrect')
      )
    )

    await waitFor(() => expect(result.current.save.isError).toBe(true))
    expect(setAccessToken).not.toHaveBeenCalled()
  })

  it('should sign out when a mutation answers 401', async () => {
    const { result } = setup()

    act(() => result.current.save.mutate(new ApiError(401, 'Token expired')))

    // the component re-renders with no user (App shows the login screen)
    await waitFor(() => expect(result.current.user).toBeFalsy())
    expectSignedOut()
  })

  it('should sign out when a query answers 401', async () => {
    const { qc, result } = setup()

    await act(() =>
      qc
        .fetchQuery({
          queryKey: ['account'],
          queryFn: () => Promise.reject(new ApiError(401, 'Token expired')),
        })
        .catch(() => {})
    )

    await waitFor(() => expect(result.current.user).toBeFalsy())
    expectSignedOut()
  })

  it.each([
    ['409', new ApiError(409, 'Card name is already set')],
    ['500', new ApiError(500, 'Something went wrong')],
    ['network', new TypeError('Failed to fetch')],
  ])('should keep the user signed in on a %s error', async (_label, err) => {
    const { result } = setup()

    act(() => result.current.save.mutate(err))

    await waitFor(() => expect(result.current.save.isError).toBe(true))
    expect(result.current.user).toEqual(makeUser())
    expect(setAccessToken).not.toHaveBeenCalled()
    expect(setCsrfToken).not.toHaveBeenCalled()
  })

  it('should drop a finished mutation as soon as nothing uses it', async () => {
    const qc = createQueryClient()
    const { result, unmount } = renderHook(
      () => useMutation({ mutationFn: async (v: { password: string }) => v }),
      { wrapper: wrapperFor(qc) }
    )
    await act(() => result.current.mutateAsync({ password: 'secret' }))
    expect(qc.getMutationCache().getAll()).toHaveLength(1)
    unmount()
    await waitFor(() => expect(qc.getMutationCache().getAll()).toEqual([]))
  })
})

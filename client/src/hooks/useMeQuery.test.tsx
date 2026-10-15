import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMeQuery } from '@/hooks/useMeQuery'
import { api } from '@/lib/api'
import { makeUser } from '@/test/fixtures'
import { makeClient, wrapperFor } from '@/test/render'
import { ApiError } from '@/lib/ApiError'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: vi.fn(),
}))

afterEach(() => vi.resetAllMocks())

const setup = () => {
  const qc = makeClient()
  const hook = renderHook(() => useMeQuery(), { wrapper: wrapperFor(qc) })
  return { qc, ...hook }
}

describe('useMeQuery', () => {
  it('should return the user from /me, cached under the "user" key', async () => {
    const user = makeUser()
    vi.mocked(api).mockResolvedValue({ user } as never)
    const { qc, result } = setup()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(user)
    expect(api).toHaveBeenCalledWith('/me')
    expect(qc.getQueryData(['user'])).toEqual(user)
  })

  it('should treats 401 as signed out: null data, no error', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(401, 'Please sign in again'))
    const { result } = setup()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('should report other failures as an error', async () => {
    vi.mocked(api).mockRejectedValue(new ApiError(500, 'Something went wrong'))
    const { result } = setup()
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Something went wrong')
  })

  it('should starts in a loading state', () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { result } = setup()
    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
  })
})

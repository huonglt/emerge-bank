import { QueryObserver } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken, setCsrf } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { clearSession, isUnauthorized } from '@/lib/session'
import { testUser, makeUser } from '@/test/fixtures'
import { makeClient } from '@/test/render'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  setAccessToken: vi.fn(),
  setCsrf: vi.fn(),
}))

afterEach(() => vi.resetAllMocks())

// a signed in client: the user, other account data, and a finished login mutation
const signedInClient = async () => {
  const qc = makeClient()
  qc.setQueryData(['user'], makeUser())
  qc.setQueryData(['transactions'], [{ amount: 100 }])
  await qc
    .getMutationCache()
    .build(qc, { mutationFn: async () => ({ ok: true }) })
    .execute(testUser)
  return qc
}

describe('clearSession', () => {
  it('should wipe both tokens', async () => {
    clearSession(await signedInClient())
    expect(setAccessToken).toHaveBeenCalledWith('')
    expect(setCsrf).toHaveBeenCalledWith('')
  })

  it('should tell anything watching the user that it is now null, before clearing', async () => {
    const qc = await signedInClient()
    const seen: unknown[] = []
    // like App: a component subscribed to the user query
    const unsubscribe = new QueryObserver(qc, {
      queryKey: ['user'],
      enabled: false,
    }).subscribe((result) => seen.push(result.data))
    clearSession(qc)
    unsubscribe()
    await vi.waitFor(() => expect(seen).toContain(null))
  })

  it('should remove every cached query, the user included', async () => {
    const qc = await signedInClient()
    clearSession(qc)
    expect(qc.getQueryCache().getAll()).toEqual([])
    expect(qc.getQueryData(['user'])).toBeUndefined()
    expect(qc.getQueryData(['transactions'])).toBeUndefined()
  })

  it('should drop the stored mutations, whose inputs include the password', async () => {
    const qc = await signedInClient()
    expect(JSON.stringify(qc.getMutationCache().getAll()[0].state)).toContain(
      testUser.password
    )
    clearSession(qc)
    expect(qc.getMutationCache().getAll()).toEqual([])
  })
})

describe('isUnauthorized', () => {
  it('should be true for a 401 from the server', () => {
    expect(isUnauthorized(new ApiError(401, 'Token expired or invalid.'))).toBe(
      true
    )
  })

  it.each([
    ['another status', new ApiError(500, 'Something went wrong')],
    ['a network error', new TypeError('Failed to fetch')],
    ['a plain object with status 401', { status: 401 }],
    ['nothing', undefined],
  ])('should be false for %s', (_label, err) => {
    expect(isUnauthorized(err)).toBe(false)
  })
})

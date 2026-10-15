import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken, setCsrf } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { clearSession, isUnauthorized } from '@/lib/session'
import { makeUser } from '@/test/fixtures'
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
    .execute({ userName: 'helen', password: 'helen123' })
  return qc
}

describe('clearSession', () => {
  it('should wipe both tokens', async () => {
    clearSession(await signedInClient())
    expect(setAccessToken).toHaveBeenCalledWith('')
    expect(setCsrf).toHaveBeenCalledWith('')
  })

  it('should keep the user query, set to null, so the app stays subscribed to it', async () => {
    const qc = await signedInClient()
    clearSession(qc)
    expect(qc.getQueryCache().find({ queryKey: ['user'] })).toBeDefined()
    expect(qc.getQueryData(['user'])).toBeNull()
  })

  it('should remove every other cached query', async () => {
    const qc = await signedInClient()
    clearSession(qc)
    expect(qc.getQueryData(['transactions'])).toBeUndefined()
    expect(qc.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([
      ['user'],
    ])
  })

  it('should drop the stored mutations, whose inputs include the password', async () => {
    const qc = await signedInClient()
    expect(JSON.stringify(qc.getMutationCache().getAll()[0].state)).toContain(
      'helen123'
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

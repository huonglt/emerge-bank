// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, setAccessToken, setCsrf } from '@/lib/api'
import { ApiError } from './ApiError'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// A fresh Response per call, because a body can only be read once.
const mockFetch = (status: number, body: unknown) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => json(status, body))

const sent = (spy: ReturnType<typeof mockFetch>) => {
  const [url, init] = spy.mock.calls.at(-1) as [string, RequestInit]
  return { url, init, headers: new Headers(init.headers) }
}

afterEach(() => {
  vi.restoreAllMocks()
  setAccessToken('')
  setCsrf('')
})

describe('api: request', () => {
  it('should calls the server /api prefix with GET, JSON and no body by default', async () => {
    const spy = mockFetch(200, { ok: true })
    await api('/me')
    const { url, init, headers } = sent(spy)
    expect(url).toBe('https://localhost:3001/api/me')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('include')
    expect(init.body).toBeUndefined()
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('should sends the access token as a Bearer header', async () => {
    const spy = mockFetch(200, {})
    setAccessToken('tok-123')
    await api('/me')
    expect(sent(spy).headers.get('Authorization')).toBe('Bearer tok-123')
  })

  it('should uses the latest token after it changes', async () => {
    const spy = mockFetch(200, {})
    setAccessToken('first')
    await api('/me')
    setAccessToken('second')
    await api('/me')
    expect(sent(spy).headers.get('Authorization')).toBe('Bearer second')
  })

  it('should sends an empty Bearer value before sign-in (current behaviour)', async () => {
    const spy = mockFetch(200, {})
    await api('/me')
    expect(sent(spy).headers.get('Authorization')).toBe('Bearer')
  })

  it('should not send the CSRF header on GET', async () => {
    const spy = mockFetch(200, {})
    setCsrf('csrf-1')
    await api('/profile')
    expect(sent(spy).headers.get('X-CSRF-Token')).toBeNull()
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'should sends the CSRF header for %s',
    async (method) => {
      const spy = mockFetch(200, {})
      setCsrf('csrf-1')
      await api('/card/name', { method })
      expect(sent(spy).headers.get('X-CSRF-Token')).toBe('csrf-1')
    }
  )

  it('should serialises the body as JSON', async () => {
    const spy = mockFetch(200, {})
    await api('/card/name', { method: 'PUT', body: { name: 'Alice Tane' } })
    const { init } = sent(spy)
    expect(init.method).toBe('PUT')
    expect(init.body).toBe('{"name":"Alice Tane"}')
  })
})

describe('api: response', () => {
  it('should returns the parsed JSON on success', async () => {
    mockFetch(200, { user: { name: 'Alice' } })
    expect(await api('/me')).toEqual({ user: { name: 'Alice' } })
  })

  it('should throws an ApiError with the status and the server message', async () => {
    mockFetch(409, { error: 'Card name is already set' })
    const err = await api('/card/name', { method: 'PUT' }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
    expect((err as ApiError).status).toBe(409)
    expect((err as ApiError).message).toBe('Card name is already set')
  })

  it('shoould falls back to a generic message when the error body has no message', async () => {
    mockFetch(500, {})
    await expect(api('/me')).rejects.toMatchObject({
      status: 500,
      message: 'Something went wrong',
    })
  })
})

describe('api: token handling', () => {
  it('should keeps tokens out of browser storage and cookies', () => {
    setAccessToken('secret-access')
    setCsrf('secret-csrf')
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })
})

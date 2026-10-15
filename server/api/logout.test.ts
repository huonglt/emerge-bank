import { beforeEach, describe, expect, it } from 'vitest'
import { call, loginAs, resetState } from '../test/http'
import { ctx } from '../test/mocks'
import { logout } from './logout'
import { sessions } from './sessions'

beforeEach(resetState)

describe('logout (handler)', () => {
  it("removes the user's session and answers ok", () => {
    sessions.set('u1', { accessToken: 'a', csrfToken: 'c', nonce: undefined, exp: Date.now() + 60_000 })
    const { req, res, spies } = ctx({}, { userId: 'u1' })
    logout(req, res)
    expect(sessions.has('u1')).toBe(false)
    expect(spies.json).toHaveBeenCalledWith({ ok: true })
  })

  it("leaves other users' sessions alone", () => {
    sessions.set('u1', { accessToken: 'a', csrfToken: 'c', nonce: undefined, exp: Date.now() + 60_000 })
    sessions.set('u2', { accessToken: 'a', csrfToken: 'c', nonce: undefined, exp: Date.now() + 60_000 })
    const { req, res } = ctx({}, { userId: 'u1' })
    logout(req, res)
    expect(sessions.has('u2')).toBe(true)
  })
})

describe('POST /api/logout', () => {
  const testUser1 = {
    userName: 'testUser1',
    password: 'password1',
  }
  const testUser2 = {
    userName: 'testUser2',
    password: 'password2',
  }
  it('answers 200 and ends the session', async () => {
    const c = await loginAs(testUser1)
    const res = await call('post', '/api/logout', c)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(sessions.has(c.id)).toBe(false)
  })

  // 401 (not 404) sso the client treats it as signed out and shows the login screen
  it('makes the old access token useless, even though the token has not expired', async () => {
    const c = await loginAs(testUser1)
    await call('post', '/api/logout', c)
    const res = await call('get', '/api/me', c)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Session user not found' })
  })

  it('needs an access token', async () => {
    expect((await call('post', '/api/logout')).status).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs(testUser1)
    const res = await call('post', '/api/logout', c, {
      csrf: 'x'.repeat(c.csrf.length),
    })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Request blocked' })
    expect(sessions.has(c.id)).toBe(true)
  })

  it('only ends the session of the user who logs out', async () => {
    const u1 = await loginAs(testUser1)
    const u2 = await loginAs(testUser2)
    await call('post', '/api/logout', u1)
    expect(sessions.has(u2.id)).toBe(true)
    expect((await call('get', '/api/me', u2)).status).toBe(200)
  })
})

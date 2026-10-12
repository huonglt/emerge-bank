import { beforeEach, describe, expect, it, vi } from 'vitest'
import { call, loginAs, resetState } from '../test/http'
import { ctx } from '../test/mocks'
import { logout } from './logout'
import { sessions } from './sessions'

beforeEach(resetState)

describe('logout (handler)', () => {
  it("removes the user's session, destroys the express session and answers ok", () => {
    sessions.set('u1', { accessToken: 'a', csrfToken: 'c', nonce: undefined })
    const destroy = vi.fn()
    const { req, res, spies } = ctx({ session: { userId: 'u1', destroy } })
    logout(req, res)
    expect(sessions.has('u1')).toBe(false)
    expect(destroy).toHaveBeenCalledWith(expect.any(Function))
    expect(spies.json).toHaveBeenCalledWith({ ok: true })
  })

  it("leaves other users' sessions alone", () => {
    sessions.set('u1', { accessToken: 'a', csrfToken: 'c', nonce: undefined })
    sessions.set('u2', { accessToken: 'a', csrfToken: 'c', nonce: undefined })
    const { req, res } = ctx({ session: { userId: 'u1', destroy: vi.fn() } })
    logout(req, res)
    expect(sessions.has('u2')).toBe(true)
  })
})

describe('POST /api/logout', () => {
  it('answers 200 and ends the session', async () => {
    const c = await loginAs()
    const res = await call('post', '/api/logout', c)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(sessions.has(c.id)).toBe(false)
  })

  it('makes the old access token useless, even though the token has not expired', async () => {
    const c = await loginAs()
    await call('post', '/api/logout', c)
    const res = await call('get', '/api/me', c)
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Session user not found' })
  })

  it('also blocks writes with the old token', async () => {
    const c = await loginAs()
    await call('post', '/api/logout', c)
    expect(
      (await call('put', '/api/card/name', c).send({ name: 'Helen Card' }))
        .status
    ).toBe(401)
  })

  it('cannot be repeated with the same token', async () => {
    const c = await loginAs()
    await call('post', '/api/logout', c)
    expect((await call('post', '/api/logout', c)).status).toBe(404)
  })

  it('needs an access token', async () => {
    expect((await call('post', '/api/logout')).status).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs()
    const res = await call('post', '/api/logout', c, {
      csrf: 'x'.repeat(c.csrf.length),
    })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Request blocked' })
    expect(sessions.has(c.id)).toBe(true)
  })

  it("does not accept another user's CSRF token", async () => {
    const helen = await loginAs()
    const jane = await loginAs('jane', 'jan123')
    const res = await call('post', '/api/logout', helen, { csrf: jane.csrf })
    expect(res.status).toBe(401)
    expect(sessions.has(helen.id)).toBe(true)
  })

  it('only ends the session of the user who logs out', async () => {
    const helen = await loginAs()
    const jane = await loginAs('jane', 'jan123')
    await call('post', '/api/logout', helen)
    expect(sessions.has(jane.id)).toBe(true)
    expect((await call('get', '/api/me', jane)).status).toBe(200)
  })

  it.todo('answers 401, not 404, when the session is gone')
})

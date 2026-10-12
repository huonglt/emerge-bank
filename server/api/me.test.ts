import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toDisplayUser } from '../lib/util'
import {
  call,
  forgeToken,
  ghost,
  loginAs,
  resetState,
  user,
} from '../test/http'

beforeEach(resetState)

describe('GET /api/me', () => {
  const testUser1 = {
    userName: 'testUser1',
    password: 'password1',
  }
  const testUser2 = {
    userName: 'testUser2',
    password: 'password2',
  }
  it('returns the signed-in user', async () => {
    const c = await loginAs(testUser1)
    const res = await call('get', '/api/me', c)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ user: toDisplayUser(user(testUser1.userName)) })
  })

  it('returns the right user for each token', async () => {
    const u1 = await loginAs(testUser1)
    const u2 = await loginAs(testUser2)
    expect((await call('get', '/api/me', u1)).body.user.name).toBe(
      testUser1.userName
    )
    expect((await call('get', '/api/me', u2)).body.user.name).toBe(
      testUser2.userName
    )
  })

  it('never returns the password hash, the salt or the PIN record', async () => {
    const c = await loginAs(testUser1)
    const res = await call('get', '/api/me', c)
    expect(JSON.stringify(res.body)).not.toMatch(
      /salt|hashedPassword|"pin"|"mac"/
    )
  })

  it('needs an access token', async () => {
    expect((await call('get', '/api/me')).status).toBe(401)
  })

  it('rejects an expired token', async () => {
    await loginAs(testUser1)
    const res = await call('get', '/api/me', {
      token: forgeToken(user(testUser1.userName).id, { expiresIn: -10 }),
      csrf: '',
      id: '',
    })
    expect(res.status).toBe(401)
  })

  it('answers 404 when there is a session but the user no longer exists', async () => {
    const res = await call('get', '/api/me', ghost())
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })

  it('answers 404 when the token is valid but the user never logged in', async () => {
    const res = await call('get', '/api/me', {
      token: forgeToken(user('helen')?.id),
      csrf: '',
      id: '',
    })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Session user not found' })
  })
})

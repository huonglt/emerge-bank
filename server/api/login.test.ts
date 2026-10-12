import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../app'
import { JWT_SECRET } from '../config'
import { toDisplayUser } from '../lib/util'
import { call, loginAs, resetState, user } from '../test/http'
import { sessions } from './sessions'

const post = (body: unknown) =>
  request(app)
    .post('/api/login')
    .send(body as object)
const GENERIC = { error: 'Username or password is incorrect' }

beforeEach(resetState)

describe('POST /api/login: bad credentials', () => {
  it.each([
    ['an unknown user', { userName: 'nobody', password: 'helen123' }],
    ['a wrong password', { userName: 'helen', password: 'wrong-password' }],
    [
      'a user name in the wrong case',
      { userName: 'Helen', password: 'helen123' },
    ],
    [
      'a password with a trailing space',
      { userName: 'helen', password: 'helen123 ' },
    ],
    ["another user's password", { userName: 'helen', password: 'jan123' }],
  ])('answers 401 with the same message for %s', async (_label, body) => {
    const res = await post(body)
    expect(res.status).toBe(401)
    expect(res.body).toEqual(GENERIC)
  })

  it.each([
    ['an empty body', {}],
    ['no password', { userName: 'helen' }],
    ['no user name', { password: 'helen123' }],
    ['numbers instead of strings', { userName: 1234, password: 5678 }],
    [
      'a user name that is too short',
      { userName: 'hel', password: 'helen123' },
    ],
    ['a password that is too short', { userName: 'helen', password: 'abc' }],
    [
      'a password that is too long',
      { userName: 'helen', password: 'x'.repeat(40) },
    ],
  ])('answers 401 with the same message for %s', async (_label, body) => {
    const res = await post(body)
    expect(res.status).toBe(401)
    expect(res.body).toEqual(GENERIC)
  })

  it('creates no session and returns no tokens', async () => {
    const res = await post({ userName: 'helen', password: 'wrong-password' })
    expect(sessions.size).toBe(0)
    expect(res.body).not.toHaveProperty('accessToken')
    expect(res.body).not.toHaveProperty('csrfToken')
  })
})

describe('POST /api/login: success', () => {
  it('answers 200 with the user, a CSRF token and an access token', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual([
      'accessToken',
      'csrfToken',
      'user',
    ])
    expect(res.body.user).toEqual(toDisplayUser(user('helen')))
  })

  it('works for the other user too', async () => {
    const res = await post({ userName: 'jane', password: 'jan123' })
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('jane')
    expect(res.body.user.card.name).toBe('Jane Doe')
  })

  it('returns an access token for this user that lasts 5 minutes', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    const decoded = jwt.verify(
      res.body.accessToken,
      JWT_SECRET
    ) as jwt.JwtPayload
    expect(decoded.sub).toBe(user('helen').id)
    expect(decoded.exp! - decoded.iat!).toBe(300)
  })

  it('returns a random 32-byte CSRF token, different every time', async () => {
    const a = await post({ userName: 'helen', password: 'helen123' })
    const b = await post({ userName: 'helen', password: 'helen123' })
    expect(a.body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a.body.csrfToken).not.toBe(b.body.csrfToken)
  })

  it("stores the tokens in the user's session, with no nonce", async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(sessions.get(user('helen').id)).toEqual({
      accessToken: res.body.accessToken,
      csrfToken: res.body.csrfToken,
      nonce: undefined,
    })
  })

  it('never returns the password hash, the salt or the PIN record', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(JSON.stringify(res.body)).not.toMatch(
      /salt|hashedPassword|"pin"|"mac"|helen123/
    )
  })

  it('trims the user name', async () => {
    expect(
      (await post({ userName: '  helen  ', password: 'helen123' })).status
    ).toBe(200)
  })

  it('does not set a cookie (the app relies on the tokens)', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('asks for no caching', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(res.headers['cache-control']).toBe('no-store')
  })
})

describe('POST /api/login: logging in twice', () => {
  it('replaces the first session: the first CSRF token stops working but the second works', async () => {
    const first = await loginAs()
    const second = await loginAs()
    expect(sessions.size).toBe(1)
    expect(
      (await call('put', '/api/card/name', first).send({ name: 'Helen Card' }))
        .status
    ).toBe(401)
    expect(
      (await call('put', '/api/card/name', second).send({ name: 'Helen Card' }))
        .status
    ).toBe(200)
  })

  it('still accepts the first access token for reading (it stays valid until it expires)', async () => {
    const first = await loginAs()
    await loginAs()
    expect((await call('get', '/api/me', first)).status).toBe(200)
  })

  it("keeps two users' sessions separate", async () => {
    const helen = await loginAs()
    const jane = await loginAs('jane', 'jan123')
    expect(sessions.size).toBe(2)
    expect(sessions.get(helen.id)?.csrfToken).toBe(helen.csrf)
    expect(sessions.get(jane.id)?.csrfToken).toBe(jane.csrf)
  })
})

describe('POST /api/login: gaps', () => {
  it.todo('limits repeated failed logins (rate limit or lockout)')
  it.todo(
    'takes as long for an unknown user as for a wrong password (hash a dummy password), so timing does not reveal user names'
  )
})

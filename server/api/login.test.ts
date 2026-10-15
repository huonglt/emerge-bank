import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../app'
import { toDisplayUser } from '../lib/util'
import { resetState, user } from '../test/http'
import { testUser1, testUser2 } from '../test/users'
import { sessions } from './sessions'

const post = (body: unknown) =>
  request(app)
    .post('/api/login')
    .send(body as object)
const GENERIC = { error: 'Username or password is incorrect' }

beforeEach(resetState)

describe('POST /api/login: success', () => {
  it('answers 200 with the user, a CSRF token and an access token', async () => {
    const res = await post(testUser1)
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual([
      'accessToken',
      'csrfToken',
      'user',
    ])
    expect(res.body.user).toEqual(toDisplayUser(user(testUser1.userName)))
  })

  it("issues an access token for this user and stores it in the user's session", async () => {
    const res = await post(testUser1)
    const { sub, exp } = jwt.decode(res.body.accessToken) as jwt.JwtPayload
    expect(sub).toBe(user(testUser1.userName).id)
    expect(sessions.get(sub!)).toEqual({
      accessToken: res.body.accessToken,
      csrfToken: res.body.csrfToken,
      nonce: undefined,
      exp: exp! * 1000, // expires with the access token
    })
  })

  it('ignores spaces around the user name', async () => {
    const res = await post({ ...testUser1, userName: '  testUser1  ' })
    expect(res.status).toBe(200)
  })

  it('gives each login a new CSRF token', async () => {
    const first = await post(testUser1)
    const second = await post(testUser1)
    expect(second.body.csrfToken).not.toBe(first.body.csrfToken)
  })

  it('asks for no caching', async () => {
    const res = await post(testUser1)
    expect(res.headers['cache-control']).toBe('no-store')
  })
})

describe('POST /api/login: fail', () => {
  it.each([
    ['the password is wrong', { ...testUser1, password: testUser2.password }],
    ['the user does not exist', { userName: 'nobody', password: testUser1.password }],
    ['the user name has the wrong case', { ...testUser1, userName: 'TESTUSER1' }],
    ['the password is too short', { ...testUser1, password: 'abc' }],
    ['the password is missing', { userName: testUser1.userName }],
    ['the body is empty', {}],
  ])(
    'answers 401 with the same generic message when %s',
    async (_label, body) => {
      const res = await post(body)
      expect(res.status).toBe(401)
      expect(res.body).toEqual(GENERIC)
    }
  )

  it('creates no session', async () => {
    await post({ ...testUser1, password: testUser2.password })
    expect(sessions.size).toBe(0)
  })
})

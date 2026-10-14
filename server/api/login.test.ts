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

const testUser1 = {
  userName: 'testUser1',
  password: 'password1',
}
const testUser2 = {
  userName: 'testUser2',
  password: 'password2',
}

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

  it('works for the other user too', async () => {
    const res = await post(testUser2)
    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe(testUser2.userName)
    expect(res.body.user.card.name).toBe(user(testUser2.userName).card.name)
  })

  it('returns an access token for this user that lasts 5 minutes', async () => {
    const res = await post(testUser1)
    const decoded = jwt.verify(
      res.body.accessToken,
      JWT_SECRET
    ) as jwt.JwtPayload
    expect(decoded.sub).toBe(user(testUser1.userName).id)
    expect(decoded.exp! - decoded.iat!).toBe(300)
  })

  it("stores the tokens in the user's session, with no nonce", async () => {
    const res = await post(testUser1)
    expect(sessions.get(user(testUser1.userName).id)).toEqual({
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

  it('asks for no caching', async () => {
    const res = await post({ userName: 'helen', password: 'helen123' })
    expect(res.headers['cache-control']).toBe('no-store')
  })
})

describe('POST /api/login: fail', () => {
  it('answers 200 with the user, a CSRF token and an access token', async () => {
    const res = await post({ userName: 'x', password: 'x' })
    expect(res.status).toBe(401)
  })
})

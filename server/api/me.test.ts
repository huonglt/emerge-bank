import { beforeEach, describe, expect, it } from 'vitest'
import { toDisplayUser } from '../lib/util'
import { call, forgeToken, ghost, loginAs, resetState, user } from '../test/http'

beforeEach(resetState)

describe('GET /api/me', () => {
  it('returns the signed-in user', async () => {
    const c = await loginAs()
    const res = await call('get', '/api/me', c)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ user: toDisplayUser(user('helen')) })
  })

  it('returns the right user for each token', async () => {
    const helen = await loginAs()
    const jane = await loginAs('jane', 'jan123')
    expect((await call('get', '/api/me', helen)).body.user.name).toBe('helen')
    expect((await call('get', '/api/me', jane)).body.user.name).toBe('jane')
  })

  it('ignores a query asking for another user', async () => {
    const helen = await loginAs()
    const res = await call('get', `/api/me?id=${user('jane').id}&name=jane`, helen)
    expect(res.body.user.name).toBe('helen')
  })

  it('shows card changes straight away', async () => {
    const c = await loginAs()
    expect((await call('get', '/api/me', c)).body.user.card).toEqual({ name: null, isPINSet: false, maskedAccountNumber: '***.***.***.123' })
    user('helen').card.name = 'Helen Card'
    expect((await call('get', '/api/me', c)).body.user.card.name).toBe('Helen Card')
  })

  it('never returns the password hash, the salt or the PIN record', async () => {
    const c = await loginAs()
    const res = await call('get', '/api/me', c)
    expect(JSON.stringify(res.body)).not.toMatch(/salt|hashedPassword|"pin"|"mac"/)
  })

  it('needs an access token', async () => {
    expect((await call('get', '/api/me')).status).toBe(401)
  })

  it('rejects an expired token', async () => {
    await loginAs()
    const res = await call('get', '/api/me', { token: forgeToken(user('helen').id, { expiresIn: -10 }), csrf: '', id: '' })
    expect(res.status).toBe(401)
  })

  it('answers 404 when there is a session but the user no longer exists', async () => {
    const res = await call('get', '/api/me', ghost())
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })

  it('answers 404 when the token is valid but the user never logged in', async () => {
    const res = await call('get', '/api/me', { token: forgeToken(user('helen').id), csrf: '', id: '' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Session user not found' })
  })
})

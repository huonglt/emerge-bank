import jwt from 'jsonwebtoken'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sessions } from './sessions'
import { JWT_SECRET } from '../config'
import {
  auth,
  csrf,
  errorHandler,
  noCacheControl,
  sessionCheck,
} from './middleware'
import request from 'supertest'
import { app } from '../app'
import { ctx } from '../test/mocks'

const sign = (payload: object = { sub: 'u1' }, opts: jwt.SignOptions = {}) =>
  jwt.sign(payload, JWT_SECRET, opts)
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
const addSession = (id: string, csrfToken = 'csrf-token') =>
  sessions.set(id, { accessToken: 'a', csrfToken, nonce: undefined })

beforeEach(() => sessions.clear())

describe('noCacheControl', () => {
  it('asks browsers and proxies not to store the response, then continues', () => {
    const { req, res, next, spies } = ctx()
    noCacheControl(req, res, next)
    expect(spies.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(spies.next).toHaveBeenCalledTimes(1)
  })
})

describe('errorHandler', () => {
  afterEach(() => vi.restoreAllMocks())

  const handle = (err: unknown, headersSent = false) => {
    const c = ctx()
    Object.assign(c.res, { headersSent })
    errorHandler(err, c.req, c.res, c.next)
    return c.spies
  }

  it('answers 500 with a generic message and logs only the message', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const spies = handle(new Error('db password is hunter2'))
    expect(spies.status).toHaveBeenCalledWith(500)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Something went wrong' })
    expect(log).toHaveBeenCalledWith('db password is hunter2') // the message only, never the error object or stack
  })

  it.each([500, 502, 503])('answers 500 for status %i', (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const spies = handle(Object.assign(new Error('x'), { status }))
    expect(spies.status).toHaveBeenCalledWith(500)
  })

  it.each([
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [413, 'Payload Too Large'],
    [415, 'Unsupported Media Type'],
  ])(
    'keeps client error %i with the standard message "%s", without logging',
    (status, message) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      const spies = handle(
        Object.assign(new Error('secret detail'), { status })
      )
      expect(spies.status).toHaveBeenCalledWith(status)
      expect(spies.json).toHaveBeenCalledWith({ error: message })
      expect(log).not.toHaveBeenCalled()
    }
  )

  it('reads statusCode as well as status', () => {
    const spies = handle(Object.assign(new Error('x'), { statusCode: 413 }))
    expect(spies.status).toHaveBeenCalledWith(413)
  })

  it.each([
    ['a non error value', 'boom'],
    ['null', null],
    [
      'a status that is not an http error',
      Object.assign(new Error('x'), { status: 200 }),
    ],
    [
      'a status that is not a number',
      Object.assign(new Error('x'), { status: 'bad' }),
    ],
  ])('answers 500 for %s', (_label, err) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const spies = handle(err)
    expect(spies.status).toHaveBeenCalledWith(500)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Something went wrong' })
  })

  it('never sends the error message to the client', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const spies = handle(new Error('internal detail'))
    expect(JSON.stringify(spies.json.mock.calls)).not.toContain(
      'internal detail'
    )
  })

  it('hands over to Express when the response has already started', () => {
    const err = new Error('late failure')
    const spies = handle(err, true)
    expect(spies.next).toHaveBeenCalledWith(err)
    expect(spies.status).not.toHaveBeenCalled()
    expect(spies.json).not.toHaveBeenCalled()
  })

  describe('through the app', () => {
    it('answers 413 for a body over the 10kb limit', async () => {
      const res = await request(app)
        .post('/api/login')
        .set('Content-Type', 'application/json')
        .send(
          JSON.stringify({ userName: 'x'.repeat(11 * 1024), password: 'p' })
        )
      expect(res.status).toBe(413)
      expect(res.body).toEqual({ error: 'Payload Too Large' })
    })

    it('answers 400 for malformed JSON without echoing the body', async () => {
      const res = await request(app)
        .post('/api/login')
        .set('Content-Type', 'application/json')
        .send('{"userName": "helen", "password": hunter2')
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'Bad Request' })
      expect(res.text).not.toContain('hunter2')
    })
  })
})

describe('auth', () => {
  const run = (headers: Record<string, string> = {}) => {
    const c = ctx({ headers })
    auth(c.req, c.res, c.next)
    return c
  }
  const rejected = async (c: ReturnType<typeof ctx>, message: string) => {
    await vi.waitFor(() => expect(c.spies.status).toHaveBeenCalledWith(401))
    expect(c.spies.json).toHaveBeenCalledWith({ error: message })
    expect(c.spies.next).not.toHaveBeenCalled()
  }

  it('accepts a valid token, stores the user id and token in res.locals, and continues', async () => {
    const c = run({
      authorization: `Bearer ${sign({ sub: 'u1' }, { expiresIn: '5m' })}`,
    })
    await vi.waitFor(() => expect(c.spies.next).toHaveBeenCalledTimes(1))
    expect(c.res.locals.userId).toBe('u1')
    expect(c.res.locals.accessToken).toBe(
      c.req.headers.authorization!.split(' ')[1]
    )
    expect(c.spies.status).not.toHaveBeenCalled()
  })

  it('requires a token', async () => {
    await rejected(run(), 'Access token required.')
  })
  it('requires something after "Bearer"', async () => {
    await rejected(run({ authorization: 'Bearer' }), 'Access token required.')
  })
  it('rejects garbage', async () => {
    await rejected(
      run({ authorization: 'Bearer not.a.jwt' }),
      'Token expired or invalid.'
    )
  })
  it('rejects an expired token', async () => {
    await rejected(
      run({
        authorization: `Bearer ${sign({ sub: 'u1' }, { expiresIn: -10 })}`,
      }),
      'Token expired or invalid.'
    )
  })
  it('rejects a token signed with another secret', async () => {
    const token = jwt.sign({ sub: 'u1' }, 'another-secret', { expiresIn: '5m' })
    await rejected(
      run({ authorization: `Bearer ${token}` }),
      'Token expired or invalid.'
    )
  })
  it('rejects a tampered payload', async () => {
    const [h, , s] = sign({ sub: 'u1' }, { expiresIn: '5m' }).split('.')
    const forged = `${h}.${b64({ sub: 'admin', exp: 9999999999 })}.${s}`
    await rejected(
      run({ authorization: `Bearer ${forged}` }),
      'Token expired or invalid.'
    )
  })
  it('rejects an unsigned token ("alg": "none")', async () => {
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'u1', exp: 9999999999 })}.`
    await rejected(
      run({ authorization: `Bearer ${unsigned}` }),
      'Token expired or invalid.'
    )
  })
  it('does not set a user id when the token is bad', async () => {
    const c = run({ authorization: 'Bearer not.a.jwt' })
    await vi.waitFor(() => expect(c.spies.status).toHaveBeenCalled())
    expect(c.res.locals.userId).toBeUndefined()
  })

  it.each(['HS384', 'HS512'] as const)(
    'rejects a token signed with %s, even with the right secret',
    async (algorithm) => {
      await rejected(
        run({
          authorization: `Bearer ${sign({ sub: 'u1' }, { algorithm, expiresIn: '5m' })}`,
        }),
        'Token expired or invalid.'
      )
    }
  )

  it('accepts a token signed with HS256', async () => {
    const c = run({
      authorization: `Bearer ${sign({ sub: 'u1' }, { algorithm: 'HS256', expiresIn: '5m' })}`,
    })
    await vi.waitFor(() => expect(c.spies.next).toHaveBeenCalledTimes(1))
  })
})

describe('csrf', () => {
  const run = (userId: string | undefined, token: string | undefined) =>
    ctx(
      { headers: token === undefined ? {} : { 'x-csrf-token': token } },
      { userId }
    )

  it('continues when the token matches the one stored for the user', () => {
    addSession('u1', 'good-token')
    const { req, res, next, spies } = run('u1', 'good-token')
    csrf(req, res, next)
    expect(spies.next).toHaveBeenCalledTimes(1)
    expect(spies.status).not.toHaveBeenCalled()
  })

  it.each([
    ['a different token of the same length', 'bad--token'],
    ['a shorter token', 'good'],
    ['a longer token', 'good-token-and-more'],
  ])('blocks %s', (_label, token) => {
    addSession('u1', 'good-token')
    const { req, res, next, spies } = run('u1', token)
    csrf(req, res, next)
    expect(spies.status).toHaveBeenCalledWith(401)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Request blocked' })
    expect(spies.next).not.toHaveBeenCalled()
  })

  it('blocks a token that belongs to another user', () => {
    addSession('u1', 'token-of-user-1')
    addSession('u2', 'token-of-user-2')
    const { req, res, next, spies } = run('u1', 'token-of-user-2')
    csrf(req, res, next)
    expect(spies.status).toHaveBeenCalledWith(401)
    expect(spies.next).not.toHaveBeenCalled()
  })

  it('blocks a request whose user has no session', () => {
    const { req, res, next, spies } = run('nobody', 'some-token')
    csrf(req, res, next)
    expect(spies.status).toHaveBeenCalledWith(401)
    expect(spies.next).not.toHaveBeenCalled()
  })

  it('answers 401 instead of throwing when the CSRF header is missing', () => {
    addSession('u1', 'good-token')
    const { req, res, next, spies } = run('u1', undefined)
    expect(() => csrf(req, res, next)).not.toThrow()
    expect(spies.status).toHaveBeenCalledWith(401)
  })

  // A bug, described as the wanted behaviour. It passes only because it is marked `fails`.
  // Reject an empty token (or run sessionCheck before csrf), then delete the `.fails`.
  it.fails(
    'blocks an empty token when the user has no session (empty equals empty today)',
    () => {
      const { req, res, next, spies } = run('nobody', '')
      csrf(req, res, next)
      expect(spies.next).not.toHaveBeenCalled()
    }
  )
})

describe('sessionCheck', () => {
  const run = (userId: string | undefined, accessToken?: string) => {
    const c = ctx({}, { userId, accessToken })
    sessionCheck(c.req, c.res, c.next)
    return c.spies
  }

  it('continues when the token is the one issued at login', () => {
    addSession('u1')
    const spies = run('u1', 'a')
    expect(spies.next).toHaveBeenCalledTimes(1)
    expect(spies.status).not.toHaveBeenCalled()
  })

  it.each([
    ['the user has no session', 'u9'],
    ['there is no user id', undefined],
  ])('answers 401 when %s', (_label, userId) => {
    const spies = run(userId, 'a')
    expect(spies.status).toHaveBeenCalledWith(401)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Session user not found' })
    expect(spies.next).not.toHaveBeenCalled()
  })

  it.each([
    ['an older token', 'old-token'],
    ['no token', undefined],
    ['an empty token', ''],
  ])('answers 401 when the request carries %s', (_label, token) => {
    addSession('u1')
    const spies = run('u1', token)
    expect(spies.status).toHaveBeenCalledWith(401)
    expect(spies.json).toHaveBeenCalledWith({
      error: 'Token expired or invalid.',
    })
    expect(spies.next).not.toHaveBeenCalled()
  })
})

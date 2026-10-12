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

  it('answers 500 with a generic message and logs only the message', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { req, res, next, spies } = ctx()
    errorHandler(new Error('db password is hunter2'), req, res, next)
    expect(spies.status).toHaveBeenCalledWith(500)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Something went wrong' })
    expect(log).toHaveBeenCalledWith('db password is hunter2') // the message only, never the error object or stack
  })

  it.each([500, 502, 503])('answers 500 for status %i', (status) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { req, res, next, spies } = ctx()
    errorHandler(Object.assign(new Error('x'), { status }), req, res, next)
    expect(spies.status).toHaveBeenCalledWith(500)
  })

  it.each([400, 401, 403, 404, 413])(
    'answers 400 "Bad request" for client error %i, without logging',
    (status) => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { req, res, next, spies } = ctx()
      errorHandler(
        Object.assign(new Error('secret detail'), { status }),
        req,
        res,
        next
      )
      expect(spies.status).toHaveBeenCalledWith(400)
      expect(spies.json).toHaveBeenCalledWith({ error: 'Bad request' })
      expect(log).not.toHaveBeenCalled()
    }
  )

  it('never sends the error message to the client', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { req, res, next, spies } = ctx()
    errorHandler(new Error('internal detail'), req, res, next)
    expect(JSON.stringify(spies.json.mock.calls)).not.toContain(
      'internal detail'
    )
  })

  it.todo(
    'keeps the original client status (for example 413 for a body that is too large) instead of 400'
  )
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

  it('accepts a valid token, remembers the user id, and continues', async () => {
    const c = run({
      authorization: `Bearer ${sign({ sub: 'u1' }, { expiresIn: '5m' })}`,
    })
    await vi.waitFor(() => expect(c.spies.next).toHaveBeenCalledTimes(1))
    expect((c.req.session as unknown as { userId: string }).userId).toBe('u1')
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
    expect(
      (c.req.session as unknown as { userId?: string }).userId
    ).toBeUndefined()
  })

  // The algorithm is not pinned, so HS384 and HS512 tokens signed with the same secret are accepted.
  // Describes the wanted behaviour; passes only because it is marked `fails`. Pass
  // `{ algorithms: ['HS256'] }` to jwt.verify, then delete the `.fails`.
  it.fails('accepts only HS256 tokens', async () => {
    const c = run({
      authorization: `Bearer ${sign({ sub: 'u1' }, { algorithm: 'HS512', expiresIn: '5m' })}`,
    })
    await vi.waitFor(() => expect(c.spies.status).toHaveBeenCalledWith(401), {
      timeout: 300,
    })
  })
})

describe('csrf', () => {
  const run = (userId: string | undefined, token: string | undefined) =>
    ctx({
      session: { userId },
      headers: token === undefined ? {} : { 'x-csrf-token': token },
    })

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

  // Two bugs, described as the wanted behaviour. Both pass only because they are marked `fails`.
  // Fix csrf to read the header safely (`String(req.headers['x-csrf-token'] ?? '')`) and to reject an
  // empty token, then delete the `.fails`.
  it.fails(
    'answers 401 instead of throwing when the CSRF header is missing',
    () => {
      addSession('u1', 'good-token')
      const { req, res, next, spies } = run('u1', undefined)
      expect(() => csrf(req, res, next)).not.toThrow()
      expect(spies.status).toHaveBeenCalledWith(401)
    }
  )

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
  it('continues when the user has a session', () => {
    addSession('u1')
    const { req, res, next, spies } = ctx({ session: { userId: 'u1' } })
    sessionCheck(req, res, next)
    expect(spies.next).toHaveBeenCalledTimes(1)
    expect(spies.status).not.toHaveBeenCalled()
  })

  it.each([
    ['the user has no session', 'u9'],
    ['there is no user id', undefined],
  ])('answers 404 when %s', (_label, userId) => {
    const { req, res, next, spies } = ctx({ session: { userId } })
    sessionCheck(req, res, next)
    expect(spies.status).toHaveBeenCalledWith(404)
    expect(spies.json).toHaveBeenCalledWith({ error: 'Session user not found' })
    expect(spies.next).not.toHaveBeenCalled()
  })
})

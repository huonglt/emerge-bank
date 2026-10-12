import { beforeEach, describe, expect, it } from 'vitest'
import { NONCE_MS } from '../config'
import { verifyPin } from '../lib/pin'
import {
  call,
  encryptPayload,
  ghost,
  loginAs,
  requestNonce,
  resetState,
  submitPin,
  user,
} from '../test/http'
import { sessions } from './sessions'

beforeEach(resetState)

const nameBody = (name = 'Helen Card') => ({ name })
const EXPIRED = { error: 'PIN request expired. Please try again' }

describe('PUT /api/card/name', () => {
  it('sets the card name', async () => {
    const c = await loginAs()
    const res = await call('put', '/api/card/name', c).send(nameBody())
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(user('helen').card.name).toBe('Helen Card')
  })

  it('trims the name', async () => {
    const c = await loginAs()
    await call('put', '/api/card/name', c).send(nameBody('  Helen Card  '))
    expect(user('helen').card.name).toBe('Helen Card')
  })

  it('shows the name in /api/me', async () => {
    const c = await loginAs()
    await call('put', '/api/card/name', c).send(nameBody())
    expect((await call('get', '/api/me', c)).body.user.card.name).toBe(
      'Helen Card'
    )
  })

  it.each([
    ['empty', { name: '' }],
    ['too short', { name: 'Alice' }],
    ['too long', { name: 'a'.repeat(25) }],
    ['missing', {}],
    ['a number', { name: 1234567 }],
  ])('rejects a name that is %s, and changes nothing', async (_label, body) => {
    const c = await loginAs()
    const res = await call('put', '/api/card/name', c).send(body)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ ok: false, error: 'Card name invalid' })
    expect(user('helen').card.name).toBeNull()
  })

  it('refuses to change a name that is already set', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await call('put', '/api/card/name', c).send(
      nameBody('Another Name')
    )
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ ok: false, error: 'Card name is already set' })
    expect(user('jane').card.name).toBe('Jane Doe')
  })

  it('refuses a second change by the same user', async () => {
    const c = await loginAs()
    await call('put', '/api/card/name', c).send(nameBody('First Name'))
    expect(
      (await call('put', '/api/card/name', c).send(nameBody('Second Name')))
        .status
    ).toBe(400)
    expect(user('helen').card.name).toBe('First Name')
  })

  it("only changes the signed-in user's card", async () => {
    const c = await loginAs()
    await call('put', '/api/card/name', c).send(nameBody())
    expect(user('jane').card.name).toBe('Jane Doe')
  })

  it('needs an access token', async () => {
    expect((await call('put', '/api/card/name').send(nameBody())).status).toBe(
      401
    )
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs()
    const res = await call('put', '/api/card/name', c, {
      csrf: 'x'.repeat(c.csrf.length),
    }).send(nameBody())
    expect(res.status).toBe(401)
    expect(user('helen').card.name).toBeNull()
  })

  it('answers 404 when the user no longer exists', async () => {
    const res = await call('put', '/api/card/name', ghost()).send(nameBody())
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })

  it('lets exactly one of many simultaneous requests win', async () => {
    const c = await loginAs()
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        call('put', '/api/card/name', c).send(nameBody(`Card name ${i}x`))
      )
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 400)).toHaveLength(9)
    const winner = results.findIndex((r) => r.status === 200)
    expect(user('helen').card.name).toBe(`Card name ${winner}x`)
  })
})

describe('GET /api/card/pinNonce', () => {
  it('gives a public key and a nonce', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(200)
    expect(Object.keys(res.body).sort()).toEqual(['nonce', 'publicKey'])
    expect(res.body.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(res.body.publicKey.kty).toBe('RSA')
  })

  it('never includes private key parts', async () => {
    const c = await loginAs('jane', 'jan123')
    const { publicKey } = (await call('get', '/api/card/pinNonce', c)).body
    for (const part of ['d', 'p', 'q', 'dp', 'dq', 'qi'])
      expect(publicKey).not.toHaveProperty(part)
  })

  it("keeps the nonce in the user's session, expiring in 5 minutes", async () => {
    const c = await loginAs('jane', 'jan123')
    const before = Date.now()
    const { nonce } = (await call('get', '/api/card/pinNonce', c)).body
    const stored = sessions.get(c.id)!.nonce!
    expect(stored.value).toBe(nonce)
    expect(stored.exp).toBeGreaterThanOrEqual(before + NONCE_MS)
    expect(stored.exp).toBeLessThanOrEqual(Date.now() + NONCE_MS)
  })

  it('replaces the earlier nonce each time', async () => {
    const c = await loginAs('jane', 'jan123')
    const a = await requestNonce(c)
    const b = await requestNonce(c)
    expect(a).not.toBe(b)
    expect(sessions.get(c.id)!.nonce!.value).toBe(b)
  })

  it('does not need a CSRF token (it only reads)', async () => {
    const c = await loginAs('jane', 'jan123')
    expect(
      (await call('get', '/api/card/pinNonce', { ...c, csrf: '' })).status
    ).toBe(200)
  })

  it('refuses until the card has a name', async () => {
    const c = await loginAs()
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PIN cannot be set right now' })
  })

  it('refuses once a PIN is set', async () => {
    const c = await loginAs('jane', 'jan123')
    await submitPin(c, '4821')
    expect((await call('get', '/api/card/pinNonce', c)).status).toBe(409)
  })

  it('needs an access token', async () => {
    expect((await call('get', '/api/card/pinNonce')).status).toBe(401)
  })

  it.todo('limits how often a nonce can be requested')
})

describe('PUT /api/card/pin: success', () => {
  it('stores a keyed hash of the PIN that verifies the right PIN only', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, '4821')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const record = user('jane').card.pin!
    expect(verifyPin(record, '4821')).toBe(true)
    expect(verifyPin(record, '4822')).toBe(false)
  })

  it('never stores or returns the PIN in readable form', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, '4821')
    expect(JSON.stringify(user('jane').card)).not.toContain('4821')
    expect(JSON.stringify(res.body)).not.toContain('4821')
  })

  it('uses the nonce up', async () => {
    const c = await loginAs('jane', 'jan123')
    await submitPin(c, '4821')
    expect(sessions.get(c.id)!.nonce).toBeUndefined()
  })

  it('is shown as set in /api/me', async () => {
    const c = await loginAs('jane', 'jan123')
    await submitPin(c, '4821')
    expect((await call('get', '/api/me', c)).body.user.card.isPINSet).toBe(true)
  })

  it('works after the name step for a new user', async () => {
    const c = await loginAs()
    await call('put', '/api/card/name', c).send(nameBody())
    expect((await submitPin(c, '4821')).status).toBe(200)
  })
})

describe('PUT /api/card/pin: the nonce', () => {
  it('rejects a request made without asking for a nonce first', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await call('put', '/api/card/pin', c).send({
      encrypted: encryptPayload({
        pin: '4821',
        confirmPin: '4821',
        nonce: 'made-up',
      }),
    })
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
    expect(user('jane').card.pin).toBeNull()
  })

  it('rejects a wrong nonce', async () => {
    const c = await loginAs('jane', 'jan123')
    await requestNonce(c)
    const res = await submitPin(c, '4821', '4821', 'not-the-nonce')
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
  })

  it('rejects an expired nonce', async () => {
    const c = await loginAs('jane', 'jan123')
    const nonce = await requestNonce(c)
    sessions.get(c.id)!.nonce!.exp = Date.now() - 1
    const res = await submitPin(c, '4821', '4821', nonce)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
    expect(user('jane').card.pin).toBeNull()
  })

  it('uses the nonce up even when the PIN is rejected, so the same request cannot be replayed', async () => {
    const c = await loginAs('jane', 'jan123')
    const nonce = await requestNonce(c)
    const encrypted = encryptPayload({ pin: '4821', confirmPin: '4822', nonce })
    expect(
      (await call('put', '/api/card/pin', c).send({ encrypted })).status
    ).toBe(409)
    const replay = await call('put', '/api/card/pin', c).send({ encrypted })
    expect(replay.status).toBe(400)
    expect(replay.body).toEqual(EXPIRED)
  })

  it("does not let one user use another user's nonce", async () => {
    const jane = await loginAs('jane', 'jan123')
    const helen = await loginAs()
    user('helen').card.name = 'Helen Card'
    const janeNonce = await requestNonce(jane)
    const res = await submitPin(helen, '4821', '4821', janeNonce)
    expect(res.status).toBe(400)
    expect(user('helen').card.pin).toBeNull()
    expect(sessions.get(jane.id)!.nonce!.value).toBe(janeNonce) // jane's nonce is untouched
  })
})

describe('PUT /api/card/pin: the request body', () => {
  const badBodies = [
    ['empty', () => ({})],
    ['encrypted is not a string', () => ({ encrypted: 123 })],
    ['encrypted is too long', () => ({ encrypted: 'A'.repeat(1025) })],
    ['encrypted is empty', () => ({ encrypted: '' })],
    [
      'encrypted is garbage',
      () => ({ encrypted: 'not-a-valid-encrypted-string' }),
    ],
  ] as const

  it.each(badBodies)('rejects a body that is %s', async (_label, make) => {
    const c = await loginAs('jane', 'jan123')
    await requestNonce(c)
    const res = await call('put', '/api/card/pin', c).send(make())
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
    expect(user('jane').card.pin).toBeNull()
  })

  it('rejects tampered ciphertext', async () => {
    const c = await loginAs('jane', 'jan123')
    const nonce = await requestNonce(c)
    const buf = Buffer.from(
      encryptPayload({ pin: '4821', confirmPin: '4821', nonce }),
      'base64'
    )
    buf[10] ^= 0xff
    const res = await call('put', '/api/card/pin', c).send({
      encrypted: buf.toString('base64'),
    })
    expect(res.status).toBe(400)
    expect(user('jane').card.pin).toBeNull()
  })

  it('rejects a payload with a missing field', async () => {
    const c = await loginAs('jane', 'jan123')
    const nonce = await requestNonce(c)
    const encrypted = encryptPayload({ pin: '4821', nonce })
    expect(
      (await call('put', '/api/card/pin', c).send({ encrypted })).status
    ).toBe(400)
  })

  it('rejects a body larger than 10 KB', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await call('put', '/api/card/pin', c).send({
      encrypted: 'A'.repeat(11_000),
    })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Bad request' })
  })
})

describe('PUT /api/card/pin: the PIN', () => {
  it('rejects a PIN that does not match its confirmation', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, '4821', '4822')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PINs do not match' })
    expect(user('jane').card.pin).toBeNull()
  })

  it.each(['12ab', '48211', '123', ''])('rejects the PIN %j', async (pin) => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, pin)
    expect(res.status).toBe(409)
    expect(user('jane').card.pin).toBeNull()
  })

  it('says "harder to guess" for a wrongly formatted PIN (the message does not match the reason)', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, '12ab')
    expect(res.body).toEqual({ error: 'PIN must be exactly 4 digits' })
  })

  // pinSchema never calls isWeakPin, so 1234 is accepted today. Describes the wanted behaviour and
  // passes only because it is marked `fails`. After the schema rejects weak PINs, delete the `.fails`.
  it.fails('rejects a weak PIN such as 1234', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await submitPin(c, '1234')
    expect(res.status).toBe(409)
    expect(user('jane').card.pin).toBeNull()
  })

  it.todo(
    'uses a clear message for a wrongly formatted PIN, and 400 rather than 409 for bad input'
  )
})

describe('PUT /api/card/pin: who and when', () => {
  it('needs the card to have a name first', async () => {
    const c = await loginAs()
    const res = await call('put', '/api/card/pin', c).send({})
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ ok: false, error: 'Name your card first' })
  })

  it('refuses to change a PIN that is already set', async () => {
    const c = await loginAs('jane', 'jan123')
    await submitPin(c, '4821')
    const before = user('jane').card.pin
    const res = await call('put', '/api/card/pin', c).send({
      encrypted: 'whatever',
    })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ ok: false, error: 'PIN is already set' })
    expect(user('jane').card.pin).toBe(before)
  })

  it('needs an access token', async () => {
    expect((await call('put', '/api/card/pin').send({})).status).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs('jane', 'jan123')
    const res = await call('put', '/api/card/pin', c, {
      csrf: 'x'.repeat(c.csrf.length),
    }).send({})
    expect(res.status).toBe(401)
  })

  it('answers 404 when the user no longer exists', async () => {
    const res = await call('put', '/api/card/pin', ghost()).send({})
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })

  it("only sets the signed-in user's PIN", async () => {
    const c = await loginAs('jane', 'jan123')
    await submitPin(c, '4821')
    expect(user('helen').card.pin).toBeNull()
  })
})

describe('PUT /api/card/pin: concurrency', () => {
  it('lets exactly one of many identical simultaneous requests win', async () => {
    const c = await loginAs('jane', 'jan123')
    const nonce = await requestNonce(c)
    const encrypted = encryptPayload({ pin: '4821', confirmPin: '4821', nonce })
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        call('put', '/api/card/pin', c).send({ encrypted })
      )
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(4)
    expect(results.every((r) => r.status < 500)).toBe(true)
  })

  it('lets two users set their PINs at the same time without mixing them up', async () => {
    const helen = await loginAs()
    const jane = await loginAs('jane', 'jan123')
    user('helen').card.name = 'Helen Card'
    const [a, b] = await Promise.all([
      submitPin(helen, '4821'),
      submitPin(jane, '7391'),
    ])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    expect(verifyPin(user('helen').card.pin!, '4821')).toBe(true)
    expect(verifyPin(user('helen').card.pin!, '7391')).toBe(false)
    expect(verifyPin(user('jane').card.pin!, '7391')).toBe(true)
  })
})

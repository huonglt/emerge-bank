import { beforeEach, describe, expect, it } from 'vitest'
import { verifyPin } from '../lib/pin'
import {
  call,
  type Creds,
  ghost,
  loginAs,
  requestNonce,
  resetState,
  submitPin,
  user,
} from '../test/http'
import { testUser1 } from '../test/users'
import { sessions } from './sessions'

beforeEach(resetState)

const EXPIRED = { error: 'PIN request expired. Please try again' }

const submitCardName = (c: Creds, name: unknown) =>
  call('put', '/api/card/name', c).send({ name })

// logged in, with a named card: ready to set the PIN
const readyForPin = async () => {
  const c = await loginAs(testUser1)
  await submitCardName(c, 'Everyday')
  return c
}

describe('PUT /api/card/name', () => {
  it('sets the card name, without the spaces around it', async () => {
    const c = await loginAs(testUser1)
    const res = await submitCardName(c, '  Helen Card  ')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(user(testUser1.userName).card.name).toBe('Helen Card')
  })

  it.each([
    ['too short', 'Alice'],
    ['too long', 'x'.repeat(25)],
    ['only spaces', '        '],
    ['missing', undefined],
    ['not a string', 123456],
  ])('answers 400 when the name is %s', async (_label, name) => {
    const c = await loginAs(testUser1)
    const res = await submitCardName(c, name)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Card name invalid' })
    expect(user(testUser1.userName).card.name).toBeNull()
  })

  it('refuses a second change by the same user', async () => {
    const c = await loginAs(testUser1)
    await submitCardName(c, 'First Name')
    const res = await submitCardName(c, 'Second Name')
    expect(res.status).toBe(409)
    expect(user(testUser1.userName).card.name).toBe('First Name')
  })

  it('needs an access token', async () => {
    expect(
      (await call('put', '/api/card/name').send({ name: 'Everyday' })).status
    ).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs(testUser1)
    const res = await call('put', '/api/card/name', c, {
      csrf: 'x'.repeat(c.csrf.length),
    }).send({ name: 'Everyday' })
    expect(res.status).toBe(401)
    expect(user(testUser1.userName).card.name).toBeNull()
  })

  it('answers 404 when the user no longer exists', async () => {
    const res = await submitCardName(ghost(), 'Everyday')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })
})

describe('GET /api/card/pinNonce', () => {
  it('gives a public key and a nonce', async () => {
    const c = await readyForPin()
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(200)
    expect(res.body.nonce).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(res.body.publicKey.kty).toBe('RSA')
  })

  it('gives a new nonce each time', async () => {
    const c = await readyForPin()
    expect(await requestNonce(c)).not.toBe(await requestNonce(c))
  })

  it('refuses until the card has a name', async () => {
    const c = await loginAs(testUser1)
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PIN cannot be set right now' })
  })

  it('refuses once a PIN is set', async () => {
    const c = await readyForPin()
    expect((await submitPin(c, '4821')).status).toBe(200)
    expect((await call('get', '/api/card/pinNonce', c)).status).toBe(409)
  })

  it('needs an access token', async () => {
    expect((await call('get', '/api/card/pinNonce')).status).toBe(401)
  })
})

describe('PUT /api/card/pin: success', () => {
  it('stores a keyed hash of the PIN that verifies the right PIN only', async () => {
    const c = await readyForPin()
    const res = await submitPin(c, '4821')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const record = user(testUser1.userName).card.pin!
    expect(verifyPin(record, '4821')).toBe(true)
    expect(verifyPin(record, '4822')).toBe(false)
  })

  it('never stores or returns the PIN in readable form', async () => {
    const c = await readyForPin()
    const res = await submitPin(c, '4821')
    expect(JSON.stringify(user(testUser1.userName).card)).not.toContain('4821')
    expect(JSON.stringify(res.body)).not.toContain('4821')
  })
})

describe('PUT /api/card/pin: the PIN', () => {
  it('rejects a PIN that does not match its confirmation', async () => {
    const c = await readyForPin()
    const res = await submitPin(c, '4821', '4822')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PINs do not match' })
    expect(user(testUser1.userName).card.pin).toBeNull()
  })

  it.each(['123', '12345', '12a4', ''])(
    'rejects %j, which is not exactly 4 digits',
    async (pin) => {
      const c = await readyForPin()
      const res = await submitPin(c, pin)
      expect(res.status).toBe(409)
      expect(res.body).toEqual({ error: 'PIN must be exactly 4 digits' })
      expect(user(testUser1.userName).card.pin).toBeNull()
    }
  )
})

describe('PUT /api/card/pin: the nonce', () => {
  it('can be used only once', async () => {
    const c = await readyForPin()
    const nonce = await requestNonce(c)
    await submitPin(c, '4821', '4822', nonce) // fails, but uses up the nonce
    const res = await submitPin(c, '4821', '4821', nonce)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
    expect(user(testUser1.userName).card.pin).toBeNull()
  })

  it('is rejected when it does not match the one issued', async () => {
    const c = await readyForPin()
    await requestNonce(c)
    const res = await submitPin(c, '4821', '4821', 'not-the-issued-nonce')
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
  })

  it('is rejected once it has expired', async () => {
    const c = await readyForPin()
    const nonce = await requestNonce(c)
    sessions.get(c.id)!.nonce!.exp = Date.now() - 1
    const res = await submitPin(c, '4821', '4821', nonce)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
  })

  it('is required: a PIN sent without asking for a nonce is rejected', async () => {
    const c = await readyForPin()
    const res = await submitPin(c, '4821', '4821', 'any-nonce')
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
  })

  it.each([
    ['missing', {}],
    [
      'not encrypted with the server key',
      { encrypted: 'bm90IGVuY3J5cHRlZA==' },
    ],
    ['too long', { encrypted: 'A'.repeat(1025) }],
  ])('rejects a body whose encrypted PIN is %s', async (_label, body) => {
    const c = await readyForPin()
    await requestNonce(c)
    const res = await call('put', '/api/card/pin', c).send(body)
    expect(res.status).toBe(400)
    expect(res.body).toEqual(EXPIRED)
  })
})

describe('PUT /api/card/pin: who and when', () => {
  it('needs the card to have a name first', async () => {
    const c = await loginAs(testUser1)
    const res = await call('put', '/api/card/pin', c).send({})
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'Name your card first' })
  })

  it('refuses to change a PIN that is already set', async () => {
    const c = await readyForPin()
    await submitPin(c, '4821')
    const before = user(testUser1.userName).card.pin
    const res = await submitPin(c, '1357')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PIN is already set' })
    expect(user(testUser1.userName).card.pin).toBe(before)
  })

  it('needs an access token', async () => {
    expect((await call('put', '/api/card/pin').send({})).status).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await readyForPin()
    const nonce = await requestNonce(c)
    const res = await call('put', '/api/card/pin', c, {
      csrf: 'x'.repeat(c.csrf.length),
    }).send({ encrypted: 'whatever', nonce })
    expect(res.status).toBe(401)
    expect(user(testUser1.userName).card.pin).toBeNull()
  })
})

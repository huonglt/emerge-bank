import { beforeEach, describe, expect, it } from 'vitest'
import { verifyPin } from '../lib/pin'
import { call, ghost, loginAs, resetState, submitPin, user } from '../test/http'

beforeEach(resetState)

const nameBody = (name: string) => ({ name })

const testUser1 = {
  userName: 'testUser1',
  password: 'password1',
}
const testUser2 = {
  userName: 'testUser2',
  password: 'password2',
}

describe('PUT /api/card/name', () => {
  it('sets the card name', async () => {
    const c = await loginAs(testUser1)
    const res = await call('put', '/api/card/name', c).send(
      nameBody('Helen Card')
    )
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(user(testUser1.userName).card.name).toBe('Helen Card')
  })

  it('trims the name', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('  Helen Card  '))
    expect(user(testUser1.userName).card.name).toBe('Helen Card')
  })

  it('shows the name in /api/me', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('Family'))
    expect((await call('get', '/api/me', c)).body.user.card.name).toBe('Family')
  })

  it('refuses a second change by the same user', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('First Name'))
    expect(
      (await call('put', '/api/card/name', c).send(nameBody('Second Name')))
        .status
    ).toBe(409)
    expect(user(testUser1.userName).card.name).toBe('First Name')
  })

  it('needs an access token', async () => {
    expect(
      (await call('put', '/api/card/name').send(nameBody('a new card name')))
        .status
    ).toBe(401)
  })

  it('needs the right CSRF token', async () => {
    const c = await loginAs(testUser1)
    const res = await call('put', '/api/card/name', c, {
      csrf: 'x'.repeat(c.csrf.length),
    }).send(nameBody('everyday'))
    expect(res.status).toBe(401)
    expect(user(testUser1.userName).card.name).toBeNull()
  })

  it('return 404 when the user no longer exists', async () => {
    const res = await call('put', '/api/card/name', ghost()).send(
      nameBody('everyday')
    )
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Could not find user' })
  })
})

describe('GET /api/card/pinNonce', () => {
  it('gives a public key and a nonce', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('First Name'))
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(200)
    expect(res.body.nonce).toMatch(/[A-Za-z0-9_-]{22}$/)
    expect(res.body.publicKey.kty).toBe('RSA')
  })

  it('refuses until the card has a name', async () => {
    const c = await loginAs(testUser1)
    const res = await call('get', '/api/card/pinNonce', c)
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PIN cannot be set right now' })
  })

  it('refuses once a PIN is set', async () => {
    const c = await loginAs(testUser1)
    await submitPin(c, '4821')
    expect((await call('get', '/api/card/pinNonce', c)).status).toBe(409)
  })

  it('needs an access token', async () => {
    expect((await call('get', '/api/card/pinNonce')).status).toBe(401)
  })
})

describe('PUT /api/card/pin: success', () => {
  it('stores a keyed hash of the PIN that verifies the right PIN only', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('Everyday'))
    const res = await submitPin(c, '4821')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    const record = user(testUser1.userName).card.pin!
    expect(verifyPin(record, '4821')).toBe(true)
    expect(verifyPin(record, '4822')).toBe(false)
  })

  it('never stores or returns the PIN in readable form', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('Everyday'))
    const res = await submitPin(c, '4821')
    expect(JSON.stringify(user(testUser1.userName).card)).not.toContain('4821')
    expect(JSON.stringify(res.body)).not.toContain('4821')
  })
})

describe('PUT /api/card/pin: the PIN', () => {
  it('rejects a PIN that does not match its confirmation', async () => {
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('Everyday'))
    const res = await submitPin(c, '4821', '4822')
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PINs do not match' })
    expect(user(testUser1.userName).card.pin).toBeNull()
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
    const c = await loginAs(testUser1)
    await call('put', '/api/card/name', c).send(nameBody('Everyday'))
    await submitPin(c, '4821')
    const before = user(testUser1.userName).card.pin
    const res = await call('put', '/api/card/pin', c).send({
      encrypted: 'whatever',
    })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PIN is already set' })
    expect(user(testUser1.userName).card.pin).toBe(before)
  })

  it('needs an access token', async () => {
    expect((await call('put', '/api/card/pin').send({})).status).toBe(401)
  })
})

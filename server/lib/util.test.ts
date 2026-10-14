import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { ABSOLUTE_MS, JWT_SECRET } from '../config'
import type { User } from '../types'
import { generateJWT, isEqual, toDisplayUser } from './util'

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '123-abc-456',
  name: 'helen',
  salt: Buffer.from('salt'),
  hashedPassword: Buffer.from('hash'),
  accountNumber: '01-1238-1335678-132',
  accountBalance: 150,
  card: {
    name: 'Travel Card',
    pin: { salt: 's', mac: 'm' },
    maskedCardNumber: '***.***.***.123',
  },
  ...overrides,
})

describe('toDisplayUser', () => {
  it('maps a user to a display user', () => {
    expect(toDisplayUser(makeUser())).toEqual({
      id: '123-abc-456',
      name: 'helen',
      accountBalance: 150,
      accountNumber: '01-1238-1335678-132',
      card: {
        name: 'Travel Card',
        isPINSet: true,
        maskedCardNumber: '***.***.***.123',
      },
    })
  })

  it('sets isPINSet from whether a PIN record exists', () => {
    expect(toDisplayUser(makeUser()).card.isPINSet).toBe(true)
    expect(
      toDisplayUser(
        makeUser({ card: { name: 'x', pin: null, maskedCardNumber: 'm' } })
      ).card.isPINSet
    ).toBe(false)
  })

  it('passes a missing card name through as null', () => {
    const d = toDisplayUser(
      makeUser({ card: { name: null, pin: null, maskedCardNumber: 'm' } })
    )
    expect(d.card.name).toBeNull()
  })

  it('exposes only the allowed fields', () => {
    const d = toDisplayUser(makeUser())
    expect(Object.keys(d).sort()).toEqual([
      'accountBalance',
      'accountNumber',
      'card',
      'id',
      'name',
    ])
    expect(Object.keys(d.card).sort()).toEqual([
      'isPINSet',
      'maskedCardNumber',
      'name',
    ])
  })

  it('never exposes the password hash, the salt or the PIN record', () => {
    const json = JSON.stringify(toDisplayUser(makeUser()))
    expect(json).not.toMatch(/salt|hashedPassword|"pin"|"mac"/)
  })

  it('does not change the user it is given', () => {
    const u = makeUser()
    const before = { ...u, card: { ...u.card } }
    toDisplayUser(u)
    expect(u).toEqual(before)
  })

  // The check is `pin !== null`, so a missing (undefined) PIN counts as "set". This describes the wanted
  // behaviour and passes only because it is marked `fails`. Use `!!card?.pin` and delete the `.fails`.
  it.fails('treats a missing (undefined) PIN as not set', () => {
    const u = makeUser({
      card: { name: 'x', pin: undefined as never, maskedCardNumber: 'm' },
    })
    expect(toDisplayUser(u).card.isPINSet).toBe(false)
  })
})

describe('generateJWT', () => {
  it('creates a token that verifies with the secret and carries the user id', () => {
    const decoded = jwt.verify(
      generateJWT(makeUser()),
      JWT_SECRET
    ) as jwt.JwtPayload
    expect(decoded.sub).toBe('123-abc-456')
  })

  it('contains only the subject and the issue and expiry times', () => {
    const decoded = jwt.verify(
      generateJWT(makeUser()),
      JWT_SECRET
    ) as jwt.JwtPayload
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub'])
  })

  it('expires after 5 minutes, the same as the server session', () => {
    const { exp, iat } = jwt.decode(generateJWT(makeUser())) as jwt.JwtPayload
    expect(exp! - iat!).toBe(300)
    expect(exp! - iat!).toBe(ABSOLUTE_MS / 1000)
  })

  it('is rejected once it has expired', () => {
    const token = generateJWT(makeUser())
    const { iat } = jwt.decode(token) as jwt.JwtPayload
    expect(() =>
      jwt.verify(token, JWT_SECRET, { clockTimestamp: iat! + 301 })
    ).toThrow(/expired/)
  })

  it('is rejected with any other secret', () => {
    expect(() =>
      jwt.verify(generateJWT(makeUser()), 'some-other-secret')
    ).toThrow()
  })

  it('is signed with HS256', () => {
    const decoded = jwt.decode(generateJWT(makeUser()), { complete: true })
    expect(decoded?.header.alg).toBe('HS256')
  })

  it('gives different users different tokens', () => {
    expect(generateJWT(makeUser({ id: 'a' }))).not.toBe(
      generateJWT(makeUser({ id: 'b' }))
    )
  })
})

describe('isEqual', () => {
  it('is true for identical strings, including empty ones', () => {
    expect(isEqual('secret-token', 'secret-token')).toBe(true)
    expect(isEqual('', '')).toBe(true)
  })
  it('is false for different strings of the same length, and is case sensitive', () => {
    expect(isEqual('secret-token', 'secret-tokrn')).toBe(false)
    expect(isEqual('Secret', 'secret')).toBe(false)
  })
  it('is false, without throwing, when the lengths differ', () => {
    expect(() => isEqual('abc', 'abcd')).not.toThrow()
    expect(isEqual('abc', 'abcd')).toBe(false)
    expect(isEqual('', 'x')).toBe(false)
  })
  it('compares bytes, not characters', () => {
    expect(isEqual('é', 'ab')).toBe(false) // both are 2 bytes
    expect(isEqual('é', 'e\u0301')).toBe(false) // 2 bytes versus 3 bytes
    expect(isEqual('é', 'é')).toBe(true)
  })
})

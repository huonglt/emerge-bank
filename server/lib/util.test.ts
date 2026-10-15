import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { JWT_SECRET } from '../config'
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

  it('never exposes the password hash, the salt or the PIN record', () => {
    const json = JSON.stringify(toDisplayUser(makeUser()))
    expect(json).not.toMatch(/salt|hashedPassword|"pin"|"mac"/)
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('reports no PIN and no card name when they are %s', (_label, value) => {
    const d = toDisplayUser(
      makeUser({
        card: { name: null, pin: value as never, maskedCardNumber: 'm' },
      })
    )
    expect(d.card.isPINSet).toBe(false)
    expect(d.card.name).toBeNull()
  })
})

describe('generateJWT', () => {
  it('signs with HS256, the only algorithm auth accepts', () => {
    const { header } = jwt.decode(generateJWT(makeUser()), { complete: true })!
    expect(header.alg).toBe('HS256')
  })

  it('creates a token that verifies with the secret and carries only the user id and times', () => {
    const decoded = jwt.verify(
      generateJWT(makeUser()),
      JWT_SECRET
    ) as jwt.JwtPayload
    expect(decoded.sub).toBe('123-abc-456')
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'iat', 'sub'])
  })

  it('expires after 5 minutes', () => {
    const { exp, iat } = jwt.decode(generateJWT(makeUser())) as jwt.JwtPayload
    expect(exp! - iat!).toBe(300)
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

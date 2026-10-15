import {
  constants,
  createPublicKey,
  generateKeyPairSync,
  publicEncrypt,
  type KeyObject,
} from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createPinRecord,
  decryptPinPayload,
  publicKeyJwk,
  verifyPin,
} from './pin'

const OAEP = {
  padding: constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256',
} as const
const encryptWith = (key: KeyObject, data: unknown) =>
  publicEncrypt(
    { key, ...OAEP },
    Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))
  ).toString('base64')
const serverKey = createPublicKey({ key: publicKeyJwk, format: 'jwk' })
const valid = { pin: '1234', confirmPin: '1234', nonce: 'test-nonce-123' }

describe('publicKeyJwk', () => {
  it('is an RSA public key with a modulus and exponent', () => {
    expect(publicKeyJwk.kty).toBe('RSA')
    expect(publicKeyJwk.n).toBeTruthy()
    expect(publicKeyJwk.e).toBeTruthy()
  })
  it('contains no private key parts', () => {
    for (const part of ['d', 'p', 'q', 'dp', 'dq', 'qi'])
      expect(publicKeyJwk).not.toHaveProperty(part)
  })
  it('is 2048 bits', () => {
    expect(Buffer.from(publicKeyJwk.n!, 'base64url').length).toBe(256)
  })
})

describe('createPinRecord and verifyPin', () => {
  it('creates a record that verifies the right PIN and rejects a wrong one', () => {
    const record = createPinRecord('4829')
    expect(verifyPin(record, '4829')).toBe(true)
    expect(verifyPin(record, '9999')).toBe(false)
  })

  it('never contains the PIN', () => {
    expect(JSON.stringify(createPinRecord('4829'))).not.toContain('4829')
  })

  it('gives the same PIN a different record each time (random salt)', () => {
    expect(createPinRecord('4829')).not.toEqual(createPinRecord('4829'))
  })
})

describe('PIN_HMAC_KEY', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('keeps records valid across a restart when a key is configured', async () => {
    vi.stubEnv('PIN_HMAC_KEY', 'ab'.repeat(32))
    vi.resetModules()
    const record = (await import('./pin')).createPinRecord('4829')
    vi.resetModules()
    expect((await import('./pin')).verifyPin(record, '4829')).toBe(true)
  })

  it('does not verify with a different key', async () => {
    vi.stubEnv('PIN_HMAC_KEY', 'ab'.repeat(32))
    vi.resetModules()
    const record = (await import('./pin')).createPinRecord('4829')
    vi.stubEnv('PIN_HMAC_KEY', 'cd'.repeat(32))
    vi.resetModules()
    expect((await import('./pin')).verifyPin(record, '4829')).toBe(false)
  })
})

describe('decryptPinPayload', () => {
  it('decrypts a valid payload', () => {
    expect(decryptPinPayload(encryptWith(serverKey, valid))).toEqual(valid)
  })

  it.each([
    ['confirmPin is missing', { pin: '1234', nonce: 'n' }],
    ['nonce is missing', { pin: '1234', confirmPin: '1234' }],
    ['pin is missing', { confirmPin: '1234', nonce: 'n' }],
    ['pin is a number', { pin: 1234, confirmPin: '1234', nonce: 'n' }],
    ['nonce is a number', { pin: '1234', confirmPin: '1234', nonce: 5 }],
    ['the body is null', null],
    ['the body is an empty object', {}],
    ['the body is not JSON', 'just some text'],
  ])('returns null when %s', (_label, body) => {
    expect(decryptPinPayload(encryptWith(serverKey, body))).toBeNull()
  })

  it('returns null for tampered ciphertext', () => {
    const buf = Buffer.from(encryptWith(serverKey, valid), 'base64')
    buf[10] ^= 0xff
    expect(decryptPinPayload(buf.toString('base64'))).toBeNull()
  })

  it('returns null for data encrypted with a different key', () => {
    const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey
    expect(decryptPinPayload(encryptWith(other, valid))).toBeNull()
  })

  it.each([
    '',
    'not-a-valid-encrypted-string',
    '!!!',
    'AAAA',
    'A'.repeat(2000),
  ])('returns null, without throwing, for %j', (input) => {
    expect(() => decryptPinPayload(input)).not.toThrow()
    expect(decryptPinPayload(input)).toBeNull()
  })
})

import {
  constants,
  createHmac,
  generateKeyPairSync,
  privateDecrypt,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { PinRecord } from '../types'

/**
 * Transport: the browser encrypts the PIN with this public key (RSA-OAEP, SHA-256).
 * Demo: key pair lives in memory. Production: the card issuer/processor, or an HSM/KMS.
 */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
})
export const publicKeyJwk = publicKey.export({ format: 'jwk' })

/**
 * decrypt the pin sent from browser
 */
export const decryptPinPayload = (
  b64: string
): { pin: string; confirmPin: string; nonce: string } | null => {
  try {
    const plain = privateDecrypt(
      {
        key: privateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(b64, 'base64')
    )
    const data = JSON.parse(plain.toString('utf8'))
    plain.fill(0)
    return typeof data?.pin === 'string' &&
      typeof data?.confirmPin === 'string' &&
      typeof data?.nonce === 'string'
      ? data
      : null
  } catch {
    return null // never reveal why decryption failed
  }
}

/**
 * Storage: a PIN has only 10,000 values, so a plain or slow hash is crackable offline.
 * Use a KEYED hash (HMAC) with a secret the database does not hold, plus a per-card salt.
 * Production: key in a KMS/HSM, and verification inside that boundary.
 */
const PIN_KEY = process.env.PIN_HMAC_KEY
  ? Buffer.from(process.env.PIN_HMAC_KEY, 'hex')
  : randomBytes(32)

const macOf = (salt: Buffer, pin: string) =>
  createHmac('sha256', PIN_KEY).update(salt).update(pin).digest()

export const createPinRecord = (pin: string): PinRecord => {
  const salt = randomBytes(16)
  return { salt: salt.toString('hex'), mac: macOf(salt, pin).toString('hex') }
}

export const verifyPin = (rec: PinRecord, pin: string): boolean => {
  return timingSafeEqual(
    Buffer.from(rec.mac, 'hex'),
    macOf(Buffer.from(rec.salt, 'hex'), pin)
  )
}

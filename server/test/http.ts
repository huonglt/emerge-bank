import { constants, createPublicKey, publicEncrypt } from 'node:crypto'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { sessions } from '../api/sessions'
import { app } from '../app'
import { JWT_SECRET } from '../config'
import { publicKeyJwk } from '../lib/pin'
import { usersDB } from '../users'
import { testUser1, testUser2 } from './users'

export type Creds = { token: string; csrf: string; id: string }
type Method = 'get' | 'post' | 'put'

// The seed data changes during tests (card name, PIN, sessions). Put it back before each test.
export const resetState = () => {
  sessions.clear()

  for (const seed of [testUser1, testUser2]) {
    const u = usersDB.getById(seed.id)!
    u.card.pin = null
    u.card.name = seed.cardName
  }
}

export const user = (name: string) => usersDB.getByName(name)!

export const loginAs = async (user: {
  userName: string
  password: string
}): Promise<Creds> => {
  const res = await request(app).post('/api/login').send(user)
  if (res.status !== 200) throw new Error(`login failed with ${res.status}`)
  return {
    token: res.body.accessToken,
    csrf: res.body.csrfToken,
    id: res.body.user.id,
  }
}

// Builds an authenticated request. Pass { csrf: null } to leave the CSRF header out.
export const call = (
  method: Method,
  path: string,
  c?: Creds,
  o: { csrf?: string | null } = {}
) => {
  let r = request(app)[method](path)
  if (c) r = r.set('Authorization', `Bearer ${c.token}`)
  const csrf = o.csrf === undefined ? c?.csrf : o.csrf
  if (csrf && method !== 'get') r = r.set('X-CSRF-Token', csrf)
  return r
}

export const forgeToken = (sub: string, opts: jwt.SignOptions = {}) =>
  jwt.sign({ sub }, JWT_SECRET, { expiresIn: '5m', ...opts })

// A valid token and session for a user id that does not exist in the users list.
export const ghost = (): Creds => {
  const token = forgeToken('ghost')
  sessions.set('ghost', {
    accessToken: token,
    csrfToken: 'csrf-for-ghost',
    nonce: undefined,
    exp: Date.now() + 60_000,
  })
  return { token, csrf: 'csrf-for-ghost', id: 'ghost' }
}

// What the browser does: encrypt with the server's public key (RSA-OAEP, SHA-256).
export const encryptPayload = (data: unknown) =>
  publicEncrypt(
    {
      key: createPublicKey({ key: publicKeyJwk, format: 'jwk' }),
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))
  ).toString('base64')

export const requestNonce = async (c: Creds) =>
  (await call('get', '/api/card/pinNonce', c)).body.nonce as string

export const submitPin = async (
  c: Creds,
  pin: string,
  confirm = pin,
  nonce?: string
) => {
  const n = nonce ?? (await requestNonce(c))
  return call('put', '/api/card/pin', c).send({
    encrypted: encryptPayload({ pin, confirmPin: confirm, nonce: n }),
  })
}

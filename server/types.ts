declare module 'express-session' {
  interface SessionData {
    userId: string
    pinNonce?: { value: string; exp: number }
  }
}
export type Session = {
  userId: string
  created: number
  pinNonce?: { value: string; exp: number }
}
export type DisplayUser = {
  id: string
  name: string
  accountBalance: number
  maskedAccountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
  }
}

/**
 * user can be uniquely identified by either id or name
 */
export type User = {
  id: string // an v4 uuid
  name: string
  salt: Buffer
  hashedPassword: Buffer
  maskedAccountNumber: string
  accountBalance: number
  card: { name: string | null; pin: PinRecord | null }
  nonce?: Nonce
}
export type PinRecord = { salt: string; mac: string }
export type Nonce = {
  value: string
  exp: number
}

/**
 * per request data set by the auth middleware (res.locals)
 */
declare global {
  namespace Express {
    interface Locals {
      userId?: string
      accessToken?: string
    }
  }
}
export type UserSessionData = {
  accessToken: string
  csrfToken: string
  nonce: Nonce | undefined
  exp: number // ms since epoch: the moment the access token expires
}
export type DisplayUser = {
  id: string
  name: string
  accountBalance: number
  accountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
    maskedCardNumber: string
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
  accountNumber: string
  accountBalance: number
  card: { name: string | null; pin: PinRecord | null; maskedCardNumber: string }
  nonce?: Nonce
}
export type PinRecord = { salt: string; mac: string }
export type Nonce = {
  value: string
  exp: number
}

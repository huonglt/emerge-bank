export type Session = {
  user: DisplayUser
  csrf: string
  created: number
  last: number
  pinNonce?: { value: string; exp: number }
}
export type DisplayUser = {
  userName: string
  accountBalance: number
  maskedAccountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
  }
}

export type User = {
  userName: string // uniquely identify an user
  salt: Buffer
  hashedPassword: Buffer
  maskedAccountNumber: string
  accountBalance: number
  card: { name: string | null; pin: PinRecord | null }
}
export type PinRecord = { salt: string; mac: string }

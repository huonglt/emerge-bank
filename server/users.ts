import { randomBytes, scryptSync } from 'node:crypto'

type User = {
  userName: string // uniquely identify an user
  salt: Buffer
  hashedPassword: Buffer
  maskedAccountNumber: string
  accountBalance: number
  card: { name: string | null; pin: PinRecord | null }
}
export type PinRecord = { salt: string; mac: string }

// Demo users. Production: a database, Argon2id hashes, and real account data.
function seed(
  userName: string,
  password: string,
  maskedAccountNumber: string,
  accountBalance: number,
  cardName: string | null
): User {
  const salt = randomBytes(16)
  return {
    userName,
    salt,
    hashedPassword: scryptSync(password, salt, 32),
    maskedAccountNumber,
    accountBalance,
    card: { name: cardName, pin: null },
  }
}
export const users = new Map<string, User>()
users.set('hle', seed('hle', 'helen123', '***.***.***.123', 100, null))
users.set('jan', seed('jan', 'jan123', '***.***.***.134', 200, 'Jane Doe'))

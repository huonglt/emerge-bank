import { randomBytes, scryptSync } from 'node:crypto'

type User = {
  userID: string
  userName: string
  salt: Buffer
  hashedPassword: Buffer
  maskedAccountNumber: string
  accountBalance: number
  card: { name: string | null; pin: PinRecord | null }
}
type Session = {
  userID: string
  csrf: string
  created: number
  last: number
  pinNonce?: { value: string; exp: number }
}
export type PinRecord = { salt: string; mac: string }

// Demo users. Production: a database, Argon2id hashes, and real account data.
function seed(
  userID: string,
  userName: string,
  password: string,
  maskedAccountNumber: string,
  accountBalance: number,
  cardName: string | null
): User {
  const salt = randomBytes(16)
  return {
    userID,
    userName,
    salt,
    hashedPassword: scryptSync(password, salt, 32),
    maskedAccountNumber,
    accountBalance,
    card: { name: cardName, pin: null },
  }
}
export const users = new Map<string, User>([
  ['u01', seed('u01', 'Helen', 'helen123', '***.***.***.123', 100, null)],
  ['u02', seed('u02', 'Jane', 'bob123', '***.***.***.134', 200, 'Jane Doe')],
])

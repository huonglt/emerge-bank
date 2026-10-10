import { randomBytes, scryptSync } from 'node:crypto'
import { User } from './types'

// Demo users. Production: a database, Argon2id hashes, and real account data.
function seed(
  id: string,
  name: string,
  password: string,
  maskedAccountNumber: string,
  accountBalance: number,
  cardName: string | null
): User {
  const salt = randomBytes(16)
  return {
    id,
    name,
    salt,
    hashedPassword: scryptSync(password, salt, 32),
    maskedAccountNumber,
    accountBalance,
    card: { name: cardName, pin: null },
  }
}
const user1: User = seed(
  crypto.randomUUID(),
  'helen',
  'helen123',
  '***.***.***.123',
  100,
  null
)
const user2: User = seed(
  crypto.randomUUID(),
  'jan',
  'jan123',
  '***.***.***.134',
  200,
  'Jane Doe'
)

class UsersDB {
  users: User[]
  constructor(users: User[]) {
    this.users = users
  }
  getByName(name: string) {
    const user = this.users.find((u) => u.name === name)
    return user
  }
  getById(id: string) {
    const user = this.users.find((u) => u.id === id)
    return user
  }
}

export const usersDB = new UsersDB([user1, user2])

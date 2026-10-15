import { vi } from 'vitest'
import type { User } from './types'

/**
 * Replace the demo users with two known test users
 * Real crypto: a wrong password must fail, and tokens, nonces and salts must be random
 */
vi.mock('./users', async () => {
  const { randomBytes, scryptSync } = await import('node:crypto')
  const { testUser1, testUser2 } = await import('./test/users')

  const testUser = ({
    id,
    userName: name,
    password,
    cardName,
  }: typeof testUser1 | typeof testUser2): User => {
    const salt = randomBytes(16)
    return {
      id,
      name,
      salt,
      hashedPassword: scryptSync(password, salt, 32),
      accountNumber: `acc-${id}`,
      accountBalance: 100,
      card: { name: cardName, pin: null, maskedCardNumber: `***${id}` },
    }
  }

  const users = [
    testUser(testUser1),
    testUser(testUser2),
  ]

  return {
    usersDB: {
      users,
      getByName: (name: string) => users.find((u) => u.name === name),
      getById: (id: string) => users.find((u) => u.id === id),
    },
  }
})

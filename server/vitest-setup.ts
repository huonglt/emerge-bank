import { vi } from 'vitest'
import { User } from './types'
//import { scryptSync } from 'node:crypto'

const { randomBytes, scryptSync } = vi.hoisted(() => {
  return {
    randomBytes: vi
      .fn()
      .mockReturnValue(Buffer.from('mocked-random-bytes-buffer')),
    scryptSync: vi.fn().mockReturnValue(Buffer.from('hoisted-mock-hash')),
  }
})

// 2. Mock the node:crypto module using your hoisted function
vi.mock('node:crypto', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:crypto')>()
  return {
    ...original,
    randomBytes,
    scryptSync,
  }
})
const { users } = vi.hoisted(() => {
  const salt = randomBytes(16)
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

  const testUser1: User = {
    id: '1',
    name: 'testUser1',
    salt,
    hashedPassword: scryptSync('password1', salt, 32),
    accountNumber: '123',
    accountBalance: 100,
    card: { name: null, pin: null, maskedCardNumber: '123' },
  }
  const testUser2: User = {
    id: '2',
    name: 'testUser2',
    salt,
    hashedPassword: scryptSync('password2', salt, 32),
    accountNumber: '345',
    accountBalance: 200,
    card: { name: 'Everyday', pin: null, maskedCardNumber: '345' },
  }
  return {
    users: new UsersDB([testUser1, testUser2]),
  }
})
vi.mock('./users', () => ({
  usersDB: users,
}))

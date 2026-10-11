import type { User } from '@/types'

export const makeCard = (overrides: Partial<User['card']> = {}): User['card'] => ({
  name: 'ALICE TANE',
  isPINSet: true,
  maskedAccountNumber: '•••• •••• •••• 4242',
  ...overrides,
})

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  name: 'Alice Tane',
  accountNumber: '•••••••••6789',
  accountBalance: 2450.75,
  card: makeCard(),
  ...overrides,
})

// The User type says `card` is always present, but Dashboard and SetupCard guard against it
// being missing (user.card?.name), so the tests cover that case too.
export const makeUserWithoutCard = (): User => ({ ...makeUser(), card: undefined }) as unknown as User

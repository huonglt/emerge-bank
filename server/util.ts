import { User, DisplayUser } from './types'

export const toDisplayUser = (user: User): DisplayUser => {
  const { userName, accountBalance, maskedAccountNumber, card } = user
  return {
    userName,
    accountBalance,
    maskedAccountNumber,
    card: {
      name: card?.name,
      isPINSet: card?.pin !== null,
    },
  }
}

import { timingSafeEqual } from 'node:crypto'
import { JWT_SECRET } from '../config'
import { User, DisplayUser } from '../types'
import jwt from 'jsonwebtoken'

export const toDisplayUser = (user: User): DisplayUser => {
  const { id, name, accountBalance, accountNumber, card } = user
  return {
    id,
    name,
    accountBalance,
    accountNumber,
    card: {
      name: card?.name,
      isPINSet: card?.pin !== null,
      maskedAccountNumber: card.maskedCardNumber,
    },
  }
}

export const generateJWT = (user: User) => {
  return jwt.sign({ sub: user.id }, JWT_SECRET, {
    expiresIn: '5m',
  })
}

export const isEqual = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

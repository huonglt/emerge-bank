import { timingSafeEqual } from 'node:crypto'
import { JWT_ALGORITHM, JWT_EXPIRES_IN, JWT_SECRET } from '../config'
import { User, DisplayUser } from '../types'
import jwt from 'jsonwebtoken'

/**
 * transform user data to be safely used on the FE
 * all sensitive data is removed
 * using masked data when needed
 */
export const toDisplayUser = (user: User): DisplayUser => {
  const { id, name, accountBalance, accountNumber, card } = user
  return {
    id,
    name,
    accountBalance,
    accountNumber,
    card: {
      name: card?.name,
      isPINSet: !!card?.pin,
      maskedCardNumber: card.maskedCardNumber,
    },
  }
}

/**
 * generate JWT token
 */
export const generateJWT = (user: User) => {
  return jwt.sign({ sub: user.id }, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
  })
}

/**
 * Checking two tokens for equal
 */
export const isEqual = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

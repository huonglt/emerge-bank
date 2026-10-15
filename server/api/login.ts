import { type Request, type Response } from 'express'
import { usersDB } from '../users'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { generateJWT, toDisplayUser } from '../lib/util'
import { loginSchema } from '../schema'
import { sessions } from './sessions'

const loginFail = (res: Response) =>
  res.status(401).json({ error: 'Username or password is incorrect' })

/**
 * handle user login
 * create csrfToken and JWT accessToken for user
 */
export const login = (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return loginFail(res)
  }
  const { userName, password } = parsed.data
  const user = usersDB.getByName(userName)
  if (!user) {
    return loginFail(res)
  }
  const hash = scryptSync(password, user.salt, 32)
  if (!timingSafeEqual(hash, user.hashedPassword)) {
    return loginFail(res)
  }

  const accessToken = generateJWT(user)
  const csrfToken = randomBytes(32).toString('base64url')

  /**
   * the session expires at the same moment as its access token
   * exp in seconsd
   */
  const { exp } = jwt.decode(accessToken) as JwtPayload
  sessions.set(user.id, {
    accessToken,
    csrfToken,
    exp: exp! * 1000,
    nonce: undefined,
  })
  return res
    .status(200)
    .json({ user: toDisplayUser(user), csrfToken, accessToken })
}

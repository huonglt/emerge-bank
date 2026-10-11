import { type Request, type Response } from 'express'
import { usersDB } from '../users'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { generateJWT, toDisplayUser } from '../lib/util'
import { loginSchema } from '../schema'

const loginFail = (res: Response) =>
  res.status(401).json({ error: 'Username or password is incorrect' })

export const login = (req: Request, res: Response) => {
  console.log(`login running`)
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return loginFail(res)
  }
  const { userName, password } = parsed.data
  const user = usersDB.getByName(userName)
  if (!user) {
    return loginFail(res)
  }
  const hash = scryptSync(password, user.salt, 32) // same work either way
  if (!timingSafeEqual(hash, user.hashedPassword)) {
    return loginFail(res)
  }

  const accessToken = generateJWT(user)
  const csrfToken = randomBytes(32).toString('base64url')
  req.session.userId = user.id
  return res
    .status(200)
    .json({ user: toDisplayUser(user), csrfToken, accessToken })
}

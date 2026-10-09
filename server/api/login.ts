import { type Request, type Response, NextFunction } from 'express'
import { z } from 'zod'
import { users } from '../users'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

import { toDisplayUser } from '../util'
import { sessions } from '../api'
import { Session } from '../types'
import { cookieOpts } from './config'
// One schema, used by the form (UX) AND the server (the real check).
export const loginSchema = z.object({
  userName: z.string().trim().min(1, 'Enter your username').max(64),
  password: z.string().min(1, 'Enter your password').max(128),
})
const loginFail = (res: Response) =>
  res.status(401).json({ error: 'Username or password is incorrect' })

export const login = (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return loginFail(res)
  }
  const { userName, password } = parsed.data
  const user = users.get(userName)
  if (!user) {
    return loginFail(res)
  }
  const hash = scryptSync(password, user.salt, 32) // same work either way
  if (!timingSafeEqual(hash, user.hashedPassword)) {
    return loginFail(res)
  }
  const old = req.cookies.sid as string | undefined
  if (old) sessions.delete(old)
  const sid = randomBytes(32).toString('base64url') // fresh ID at login: prevents fixation
  const now = Date.now()

  const session: Session = {
    user: toDisplayUser(user),
    csrf: randomBytes(32).toString('base64url'),
    created: now,
    last: now,
  }
  sessions.set(sid, session)
  res
    .cookie('sid', sid, cookieOpts)
    .json({ user: session.user, csrfToken: session.csrf })
}

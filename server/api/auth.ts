import { type Request, type Response, NextFunction } from 'express'
import { sessions } from '../sessions'
import { ABSOLUTE_MS, IDLE_MS } from './config'
import { users } from '../users'

const authFail = (res: Response) =>
  res.status(401).json({ error: 'Please sign in again' })

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const sid = req.cookies['sid'] as string | undefined
  const s = sid ? sessions.get(sid) : undefined
  const now = Date.now()
  if (!sid || !s || now - s.last > IDLE_MS || now - s.created > ABSOLUTE_MS) {
    if (sid) sessions.delete(sid)
    return authFail(res)
  }

  const user = users.get(s.user.userName)
  // could not find user
  if (!user) {
    return authFail(res)
  }

  s.last = now
  res.locals.sid = sid
  res.locals.session = s

  next()
}

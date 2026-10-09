import { type Request, type Response } from 'express'
import { sessions } from '../api'
import { cookieOpts } from './config'

export const logout = (_req: Request, res: Response) => {
  sessions.delete(res.locals.sid)
  res
    .clearCookie('sid', { ...cookieOpts, maxAge: undefined })
    .json({ ok: true })
}

import { type Request, type Response } from 'express'
import { cookieOpts } from '../config'

export const logout = (req: Request, res: Response) => {
  req.session.destroy(() => {})
  return res
    .clearCookie('connect.sid', { ...cookieOpts, maxAge: undefined })
    .json({ ok: true })
}

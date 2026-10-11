import { type Request, type Response } from 'express'
import { cookieOpts } from '../config'

export const logout = (req: Request, res: Response) => {
  req.session.destroy(() => {})
  return res.json({ ok: true })
}

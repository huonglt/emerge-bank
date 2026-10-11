import { type Request, type Response } from 'express'
import { sessions } from './sessions'

export const logout = (req: Request, res: Response) => {
  sessions.delete(req.session.userId!)
  req.session.destroy(() => {})
  return res.json({ ok: true })
}

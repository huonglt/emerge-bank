import { type Request, type Response } from 'express'
import { sessions } from './sessions'

/**
 * clear all session data when logout
 */
export const logout = (req: Request, res: Response) => {
  sessions.delete(res.locals.userId!)
  req.session.destroy(() => {})
  return res.json({ ok: true })
}

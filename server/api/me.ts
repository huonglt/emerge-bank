import { type Request, type Response } from 'express'
import { Session } from '../types'

export const me = (_req: Request, res: Response) => {
  const s = res.locals.session as Session
  res.json({ user: s.user, csrfToken: s.csrf })
}

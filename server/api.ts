import { type Request, type Response } from 'express'
import { Session } from './middleware'

export const me = (_req: Request, res: Response) => {
  const s = res.locals.session as Session
  res.json({ user: res.locals.user, csrfToken: s.csrf })
}

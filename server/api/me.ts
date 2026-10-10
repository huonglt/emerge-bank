import { type Request, type Response } from 'express'
import { usersDB } from '../users'
import { toDisplayUser } from '../util'

export const me = (req: Request, res: Response) => {
  const userId = req.session.userId as string
  const user = usersDB.getById(userId)
  // could not find user
  if (!user) {
    return res.status(401).json({ error: 'Could not find user' })
  }

  res.json({ user: toDisplayUser(user) })
}

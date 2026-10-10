import { type Request, type Response } from 'express'

export const logout = (req: Request, res: Response) => {
  req.session.destroy(() => {})
  res.json({ ok: true })
}

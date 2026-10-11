import { type Request, type Response, NextFunction } from 'express'
import { JWT_SECRET } from '../config'
import jwt, { VerifyErrors } from 'jsonwebtoken'
import { usersDB } from '../users'

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Access token required.' })

  jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Token expired or invalid.' })
    }

    req.session.userId = decoded.sub
    next()
  })
}

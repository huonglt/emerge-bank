import { type NextFunction, type Request, type Response } from 'express'

import { timingSafeEqual } from 'node:crypto'
import { sessions } from './sessions'

import jwt, { VerifyErrors } from 'jsonwebtoken'
import { JWT_SECRET } from '../config'

/**
 * Browsers, and proxy dont cache any part of the request or response
 */
export const noCacheControl = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.set('Cache-Control', 'no-store')
  next()
}

/**
 * catch all error handler
 */
export const errorHandler = (
  err: Error & { status?: number },
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status && err.status < 500 ? 400 : 500
  if (status === 500) {
    console.error(err.message) // message only: never log request bodies
  }
  res
    .status(status)
    .json({ error: status === 400 ? 'Bad request' : 'Something went wrong' })
}

/**
 * middlware checking for csrf token
 */
export const csrf = (req: Request, res: Response, next: NextFunction) => {
  const reqCSRFToken = Buffer.from(req.headers['x-csrf-token'] as string)
  const userId = req.session.userId

  const userSesssion = sessions.get(userId!)
  const serverCSRFToken = Buffer.from(userSesssion?.csrfToken || '')

  if (
    reqCSRFToken.length !== serverCSRFToken.length ||
    !timingSafeEqual(reqCSRFToken, serverCSRFToken)
  ) {
    return res.status(401).json({ error: 'Request blocked' })
  }
  next()
}
/**
 * middleware checking for access token
 */
export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({ error: 'Access token required.' })

  jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Token expired or invalid.' })
    }

    req.session.userId = decoded.sub
    next()
  })
}

/**
 * middleware checking for server session
 */
export const sessionCheck = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.session.userId
  const userSession = sessions.get(userId!)
  if (!userSession) {
    return res.status(404).json({ error: 'Session user not found' })
  }
  next()
}

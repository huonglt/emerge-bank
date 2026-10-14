import { type NextFunction, type Request, type Response } from 'express'

import { timingSafeEqual } from 'node:crypto'
import { STATUS_CODES } from 'node:http'
import { sessions } from './sessions'

import jwt, { VerifyErrors } from 'jsonwebtoken'
import { JWT_ALGORITHM, JWT_SECRET } from '../config'
import { isEqual } from '../lib/util'

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
 * http status of a thrown value, 500 when it has none
 * body-parser and http-errors set `status` (e.g. 400 bad JSON, 413 body too large)
 */
const statusOf = (err: unknown): number => {
  const e = err as { status?: unknown; statusCode?: unknown } | null
  const status = Number(e?.status ?? e?.statusCode)
  return Number.isInteger(status) && status >= 400 && status <= 599
    ? status
    : 500
}

/**
 * catch all error handler
 * client errors (4xx) keep their status, server errors become 500
 * the client only ever gets a fixed message: err.message can hold internals,
 * and a JSON parse error message contains part of the request body
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // the response has already started: let Express close the connection
  if (res.headersSent) {
    return next(err)
  }

  const status = statusOf(err)
  if (status >= 500) {
    // message only: never log the error object, stack or request body
    console.error(err instanceof Error ? err.message : String(err))
    return res.status(500).json({ error: 'Something went wrong' })
  }

  // standard reason phrase, e.g. 'Bad Request', 'Payload Too Large'
  return res.status(status).json({ error: STATUS_CODES[status] ?? 'Bad Request' })
}

/**
 * middlware checking for csrf token
 */
export const csrf = (req: Request, res: Response, next: NextFunction) => {
  const reqCSRFToken = Buffer.from(String(req.headers['x-csrf-token'] ?? ''))
  const userId = res.locals.userId

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

  // pin the algorithm: accept only tokens signed the way generateJWT signs them
  const options = { algorithms: [JWT_ALGORITHM] }
  jwt.verify(token, JWT_SECRET, options, (err: VerifyErrors | null, decoded: any) => {
    if (err) {
      return res.status(401).json({ error: 'Token expired or invalid.' })
    }

    /**
     * store userid, and accessToken in res.local
     */
    res.locals.userId = decoded.sub
    res.locals.accessToken = token
    next()
  })
}

/**
 * middleware checking for server session
 * the access token must be the one issued at the user's latest login,
 * so older tokens stop working as soon as the user logs in again
 */
export const sessionCheck = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = res.locals.userId
  const userSession = sessions.get(userId!)
  if (!userSession) {
    return res.status(401).json({ error: 'Session user not found' })
  }
  const accessToken = res.locals.accessToken ?? ''
  if (!isEqual(accessToken, userSession.accessToken)) {
    return res.status(401).json({ error: 'Token expired or invalid.' })
  }
  next()
}

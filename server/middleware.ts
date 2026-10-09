import { type NextFunction, type Request, type Response } from 'express'
import { users } from './users'
export const setCSP = (_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    // Off by default: browsers remember HSTS per host, and localhost is shared with your other projects.
    ...(process.env.HSTS === '1' && {
      'Strict-Transport-Security': 'max-age=63072000',
    }),
  })
  next()
}

export const noCacheControl = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res.set('Cache-Control', 'no-store')
  next()
}

export const errorHandler = (
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
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
 *
 * Blocks state-changing requests (POST, PUT, DELETE and so on) unless they come from your own site.
 * Read-only ("safe") methods skip the check. They shouldn't change anything, so a forged cross-site request can't do harm
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const csrfDefence = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next()
  }
  try {
    const o = req.get('origin')
    if (o && new URL(o).host === req.get('host')) {
      return next()
    }
  } catch {}
  res.status(403).json({ error: 'Request blocked' })
}

const SID = '__Host-sid' // __Host- prefix: Secure, Path=/, no Domain, so it cannot be set by sibling hosts

export type Session = {
  userId: string
  csrf: string
  created: number
  last: number
  pinNonce?: { value: string; exp: number }
}
const sessions = new Map<string, Session>()
const IDLE_MS = 15 * 60_000
const ABSOLUTE_MS = 8 * 60 * 60_000

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const sid = req.cookies[SID] as string | undefined
  const s = sid ? sessions.get(sid) : undefined
  const now = Date.now()
  if (!sid || !s || now - s.last > IDLE_MS || now - s.created > ABSOLUTE_MS) {
    if (sid) sessions.delete(sid)
    return res.status(401).json({ error: 'Please sign in again' })
  }

  s.last = now
  res.locals.sid = sid
  res.locals.session = s
  res.locals.user = users.get(s.userId)

  next()
}

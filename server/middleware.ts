import { type NextFunction, type Request, type Response } from 'express'

export const setCSP = (_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
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

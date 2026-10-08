import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express'
import cookieParser from 'cookie-parser'
import https from 'node:https'
import fs from 'node:fs'
import { promisify } from 'node:util'

const PROD = process.env.NODE_ENV === 'production'
const PORT = 3001
const SID = '__Host-sid' // __Host- prefix: Secure, Path=/, no Domain, so it cannot be set by sibling hosts
const IDLE_MS = 15 * 60_000
const ABSOLUTE_MS = 8 * 60 * 60_000
const NONCE_MS = 2 * 60_000

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.use((_req, res, next) => {
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
})
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  try {
    const o = req.get('origin')
    if (o && new URL(o).host === req.get('host')) return next()
  } catch {}
  res.status(403).json({ error: 'Request blocked' })
})

function auth(req: Request, res: Response, next: NextFunction) {
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
  res.locals.user = users.get(s.username)
  next()
}
function csrf(req: Request, res: Response, next: NextFunction) {
  if (
    !same(req.get('x-csrf-token') ?? '', (res.locals.session as Session).csrf)
  )
    return res.status(403).json({ error: 'Request blocked' })
  next()
}

const attempts = new Map<string, { n: number; reset: number }>()
function limit(max: number): RequestHandler {
  return (req, res, next) => {
    const key = `${req.path}:${req.ip}`,
      now = Date.now(),
      a = attempts.get(key)
    if (!a || now > a.reset) attempts.set(key, { n: 1, reset: now + 60_000 })
    else if (++a.n > max)
      return res
        .status(429)
        .json({ error: 'Too many attempts. Try again in a minute' })
    next()
  }
}

const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ABSOLUTE_MS,
}


if (PROD) {
  app.use(express.static('dist'))
  app.get('*', (_req, res) => res.sendFile('index.html', { root: 'dist' }))
}

app.use(
  (
    err: Error & { status?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    const status = err.status && err.status < 500 ? 400 : 500
    if (status === 500) console.error(err.message) // message only: never log request bodies
    res
      .status(status)
      .json({ error: status === 400 ? 'Bad request' : 'Something went wrong' })
  }
)

const keyFile = 'certs/localhost-key.pem',
  certFile = 'certs/localhost.pem'
if (!fs.existsSync(keyFile) || !fs.existsSync(certFile)) {
  console.error('TLS certificate not found. Run: npm run certs')
  process.exit(1)
}
https
  .createServer(
    {
      key: fs.readFileSync(keyFile),
      cert: fs.readFileSync(certFile),
      minVersion: 'TLSv1.2',
    },
    app
  )
  .listen(PORT, 'localhost', () =>
    console.log(`API on https://localhost:${PORT}`)
  )

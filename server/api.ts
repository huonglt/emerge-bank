import { type Request, type Response, NextFunction } from 'express'
import { User, users } from './users'
const SID = '__Host-sid' // __Host- prefix: Secure, Path=/, no Domain, so it cannot be set by sibling hosts

import { z } from 'zod'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// One schema, used by the form (UX) AND the server (the real check).
export const loginSchema = z.object({
  userName: z.string().trim().min(1, 'Enter your username').max(64),
  password: z.string().min(1, 'Enter your password').max(128),
})

export type Session = {
  user: DisplayUser
  csrf: string
  created: number
  last: number
  pinNonce?: { value: string; exp: number }
}
type DisplayUser = {
  userName: string
  accountBalance: number
  maskedAccountNumber: string
  card: {
    name: string | null
    isPINSet: boolean
  }
}
const sessions = new Map<string, Session>()
const IDLE_MS = 15 * 60000
const ABSOLUTE_MS = 8 * 60 * 60000

const toDisplayUser = (user: User): DisplayUser => {
  const { userName, accountBalance, maskedAccountNumber, card } = user
  return {
    userName,
    accountBalance,
    maskedAccountNumber,
    card: {
      name: card?.name,
      isPINSet: card?.pin !== null,
    },
  }
}
export const auth = (req: Request, res: Response, next: NextFunction) => {
  const sid = req.cookies['sid'] as string | undefined
  const s = sid ? sessions.get(sid) : undefined
  const now = Date.now()
  if (!sid || !s || now - s.last > IDLE_MS || now - s.created > ABSOLUTE_MS) {
    if (sid) sessions.delete(sid)
    return res.status(401).json({ error: 'Please sign in again' })
  }

  const user = users.get(s.user.userName)
  if (!user) {
    // could not find user
    return res.status(401).json({ error: 'Please sign in again' })
  }

  s.last = now
  res.locals.sid = sid
  res.locals.session = s

  next()
}

const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ABSOLUTE_MS,
}
const loginFail = (res: Response) =>
  res.status(401).json({ error: 'Username or password is incorrect' })

export const login = (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return loginFail(res)
  }
  const { userName, password } = parsed.data
  const user = users.get(userName)
  if (!user) {
    return loginFail(res)
  }
  const hash = scryptSync(password, user.salt, 32) // same work either way
  if (!timingSafeEqual(hash, user.hashedPassword)) {
    return loginFail(res)
  }
  const old = req.cookies.sid as string | undefined
  if (old) sessions.delete(old)
  const sid = randomBytes(32).toString('base64url') // fresh ID at login: prevents fixation
  const now = Date.now()

  const session: Session = {
    user: toDisplayUser(user),
    csrf: randomBytes(32).toString('base64url'),
    created: now,
    last: now,
  }
  sessions.set(sid, session)
  res
    .cookie('sid', sid, cookieOpts)
    .json({ user: session.user, csrfToken: session.csrf })
}

export const me = (_req: Request, res: Response) => {
  const s = res.locals.session as Session
  res.json({ user: s.user, csrfToken: s.csrf })
}

export const csrf = (req: Request, res: Response, next: NextFunction) => {
  const given = Buffer.from(req.body['x-csrf-token'] ?? '')
  const expected = Buffer.from((res.locals.session as Session).csrf)
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return res.status(403).json({ error: 'Request blocked' })
  next()
}

export const logout = (_req: Request, res: Response) => {
  sessions.delete(res.locals.sid)
  res
    .clearCookie('sid', { ...cookieOpts, maxAge: undefined })
    .json({ ok: true })
}

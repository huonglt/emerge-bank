import { UserSessionData } from '../types'

// simple map to manage session on server
export const sessions = new Map<string, UserSessionData>()

export const isExpired = (session: UserSessionData, now = Date.now()) =>
  now >= session.exp

/**
 * remove sessions whose access token has expired
 */
export const removeExpiredSessions = (now = Date.now()) => {
  for (const [userId, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(userId)
    }
  }
}

/**
 * remove expired sessions every minute
 * unref() so the timer never keeps the process alive
 */
export const startSessionCleanup = (intervalMs = 60_000) =>
  setInterval(() => removeExpiredSessions(), intervalMs).unref()

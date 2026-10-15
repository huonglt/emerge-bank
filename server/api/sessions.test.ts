import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isExpired,
  removeExpiredSessions,
  sessions,
  startSessionCleanup,
} from './sessions'

const add = (userId: string, exp: number) =>
  sessions.set(userId, { accessToken: 'a', csrfToken: 'c', nonce: undefined, exp })

beforeEach(() => sessions.clear())
afterEach(() => vi.useRealTimers())

describe('isExpired', () => {
  const session = { accessToken: 'a', csrfToken: 'c', nonce: undefined, exp: 1_000 }

  it('is not expired before exp', () => {
    expect(isExpired(session, 999)).toBe(false)
  })

  it('is expired from exp onwards', () => {
    expect(isExpired(session, 1_000)).toBe(true)
    expect(isExpired(session, 1_001)).toBe(true)
  })
})

describe('removeExpiredSessions', () => {
  it('removes only the expired sessions', () => {
    add('expired', 1_000)
    add('expires-now', 2_000)
    add('active', 3_000)

    removeExpiredSessions(2_000)

    expect([...sessions.keys()]).toEqual(['active'])
  })

  it('does nothing when there are no sessions', () => {
    expect(() => removeExpiredSessions()).not.toThrow()
    expect(sessions.size).toBe(0)
  })
})

describe('startSessionCleanup', () => {
  it('removes a session once it has expired, on the next sweep', () => {
    vi.useFakeTimers({ now: 0 })
    add('u1', 90_000) // expires 1.5 minutes from now
    const timer = startSessionCleanup(60_000)
    try {
      vi.advanceTimersByTime(60_000) // first sweep: still active
      expect(sessions.has('u1')).toBe(true)

      vi.advanceTimersByTime(60_000) // second sweep: expired
      expect(sessions.has('u1')).toBe(false)
    } finally {
      clearInterval(timer)
    }
  })

  it('does not keep the process alive', () => {
    const timer = startSessionCleanup()
    expect(timer.hasRef()).toBe(false)
    clearInterval(timer)
  })
})

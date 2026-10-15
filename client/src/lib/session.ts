import type { QueryClient } from '@tanstack/react-query'
import { setAccessToken, setCsrf } from './api'
import { ApiError } from './ApiError'

/**
 * Wipe all user data on the client
 * The user query is set to null, not removed: App stays subscribed to it, so it
 * drop every other cached query, and the mutations (their inputs include the password)
 */
export const clearSession = (qc: QueryClient) => {
  setAccessToken('')
  setCsrf('')
  qc.setQueryData(['user'], null)
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'user' })
  qc.getMutationCache().clear()
}

/**
 * The server answers 401 when the access token is expired, replaced by a newer login,
 * or its session is gone
 */
export const isUnauthorized = (err: unknown) =>
  err instanceof ApiError && err.status === 401

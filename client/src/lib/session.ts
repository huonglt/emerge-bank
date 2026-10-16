import type { QueryClient } from '@tanstack/react-query'
import { setAccessToken, setCsrf } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'

/**
 * Wipe all user data on the client
 */
export const clearSession = (qc: QueryClient) => {
  setAccessToken('')
  setCsrf('')
  qc.setQueryData(['user'], null)
  qc.clear()
}

/**
 * The server answers 401 when the access token is expired, replaced by a newer login,
 * or its session is gone
 */
export const isUnauthorized = (err: unknown) =>
  err instanceof ApiError && err.status === 401

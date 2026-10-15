import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { hasAccessToken } from './api'
import { clearSession, isUnauthorized } from './session'

/**
 * App query client
 * Session expired mid-use, clear the session
 */
export const createQueryClient = () => {
  const onError = (err: unknown) => {
    // a 401 with no token is not an expired session, e.g. a wrong password on /login
    if (isUnauthorized(err) && hasAccessToken()) {
      clearSession(qc)
    }
  }

  const qc: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 60_000 } }, // short cache for sensitive data
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
  })
  return qc
}

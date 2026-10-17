import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { hasAccessToken } from '@/lib/api'
import { clearSession, isUnauthorized } from '@/lib/session'

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

  /**
   * setup query client
   * cache query for 1m (short cache)
   * clear the mutation including its stored values from inputs when it finishes
   */
  const qc: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 60_000 },
      mutations: { gcTime: 0 },
    },
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
  })
  return qc
}

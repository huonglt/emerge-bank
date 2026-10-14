import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { clearSession, isUnauthorized } from './session'

/**
 * App query client
 * Session expired mid-use (any query or mutation answers 401):
 * drop everything sensitive and show sign-in
 */
export const createQueryClient = () => {
  const onError = (err: unknown) => {
    if (isUnauthorized(err)) {
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

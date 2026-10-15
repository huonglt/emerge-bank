import { api, hasAccessToken } from '@/lib/api'
import type { Me } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/ApiError'

/**
 * query user data
 */
const queryMe = async () => {
  // exit when no token (fresh page load, or after logout)
  if (!hasAccessToken()) {
    return null
  }
  try {
    const m = await api<Me>('/me')
    return m.user
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

/**
 * hook to conveniently get user data
 */
export const useMeQuery = () => {
  const me = useQuery({
    queryKey: ['user'],
    queryFn: queryMe,
  })
  return me
}

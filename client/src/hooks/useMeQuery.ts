import { api, hasAccessToken } from '@/lib/api'
import type { Me } from '@/types'
import { useQuery } from '@tanstack/react-query'

/**
 * query user data
 */
const queryMe = async () => {
  // exit when no token (fresh page load, or after logout)
  if (!hasAccessToken()) {
    return null
  }
  // a 401 (token expired or replaced) is handled globally: queryClient signs the user out
  const m = await api<Me>('/me')
  return m.user
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

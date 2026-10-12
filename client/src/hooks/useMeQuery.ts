import { api } from '@/lib/api'
import type { Me } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '@/lib/ApiError'
const queryMe = async () => {
  try {
    const m = await api<Me>('/me')
    return m.user
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export const useMeQuery = () => {
  const me = useQuery({
    queryKey: ['user'],
    queryFn: queryMe,
  })
  return me
}

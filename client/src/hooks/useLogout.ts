import { api, setAccessToken, setCsrf } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/**
 * Hook to handler logout
 * Having set timer to logout automatically
 */
export const useLogout = () => {
  const [timer, setTimer] = useState<number | undefined>()
  const qc = useQueryClient()

  const logout = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSettled: () => {
      // wipe all user data
      setAccessToken('')
      setCsrf('')
      qc.setQueryData(['user'], null)
      qc.clear()
    },
  })

  useEffect(() => {
    if (!timer) {
      return
    }

    const id = setTimeout(() => {
      logout.mutate()
    }, timer)

    return () => clearTimeout(id)
  }, [timer, logout])

  return {
    setTimer,
    logout: () => logout.mutate(),
  }
}

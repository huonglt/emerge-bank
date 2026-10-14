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

  const { mutate } = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSettled: () => {
      // wipe all user data & clear the auto logout timer
      setAccessToken('')
      setCsrf('')
      setTimer(undefined)
      qc.setQueryData(['user'], null)
      qc.clear()
    },
  })

  useEffect(() => {
    if (!timer) {
      return
    }

    const id = setTimeout(() => mutate(), timer)

    return () => clearTimeout(id)
  }, [timer, mutate])

  return {
    setTimer,
    logout: () => mutate(),
  }
}

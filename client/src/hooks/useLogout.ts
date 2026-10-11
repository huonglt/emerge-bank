import { api, setAccessToken, setCsrf } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
export const useLogout = () => {
  const [timer, setTimer] = useState<number | undefined>()
  const qc = useQueryClient()

  const logout = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    onSettled: () => {
      // wipe all user data
      setAccessToken('')
      setCsrf('')
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
  }, [timer])

  return {
    setLogoutIn: setTimer,
    logout: () => logout.mutate(),
  }
}

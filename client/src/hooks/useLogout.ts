import { api, tokenExpireIn } from '@/lib/api'
import { clearSession } from '@/lib/session'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

/**
 * Hook to handle logout
 */
export const useLogout = () => {
  const qc = useQueryClient()

  const { mutate } = useMutation({
    mutationFn: () => api('/logout', { method: 'POST' }),
    // wipe all user data
    onSettled: () => clearSession(qc),
  })

  return { logout: useCallback(() => mutate(), [mutate]) }
}

/**
 * Log out automatically when the access token expires
 * The timer is tied to the signed in user: any logout (manual, auto, 401)
 * sets the user to null will clears the timer
 * a new login starts a fresh new timer.
 */
export const useAutoLogout = (userId: string | undefined) => {
  const qc = useQueryClient()

  useEffect(() => {
    if (!userId) {
      return
    }
    const ms = tokenExpireIn()
    if (ms === undefined) {
      return
    }

    /**
     * the token will be expired on the server when this timer run
     * so no need to invoke /logout on server to avoid 401 error on auth
     * clear the session locally instead
     */
    const id = setTimeout(() => clearSession(qc), ms)

    return () => clearTimeout(id)
  }, [userId, qc])
}

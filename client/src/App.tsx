import { Dashboard } from '@/components/Dashboard'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LogIn } from '@/components/Login'
import { useMeQuery } from '@/hooks/useMeQuery'
import { tokenExpireIn } from './lib/api'
import { useLogout } from './hooks/useLogout'
import { useQueryClient } from '@tanstack/react-query'

export const App = () => {
  const me = useMeQuery()
  const qc = useQueryClient()
  const { setLogoutIn } = useLogout()

  /**
   * set timer to auto logout when token expires
   */
  const onLoginSuccess = () => {
    const timer = tokenExpireIn()
    setLogoutIn(timer)
    qc.invalidateQueries({ queryKey: ['user'] })
  }
  const user = me.data
  return (
    <div className="app">
      <Header />
      <div className="main">
        <div className="content">
          {user ? (
            <Dashboard user={user} />
          ) : (
            <LogIn onSuccess={onLoginSuccess} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

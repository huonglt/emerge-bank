import { Dashboard } from '@/components/Dashboard'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LogIn } from '@/components/Login'
import { useMeQuery } from '@/hooks/useMeQuery'
import { tokenExpireIn } from './lib/api'
import { useLogout } from './hooks/useLogout'

export const App = () => {
  const me = useMeQuery()
  const { setTimer } = useLogout()

  /**
   * set timer to auto logout when token expires
   */
  const onLoginSuccess = () => {
    const timer = tokenExpireIn()
    setTimer(timer)
  }

  const user = me.data
  const showError = me.isError
  const showLogin = !me.isError && !user
  const showDashboard = !me.isError && user

  return (
    <div className="app">
      <Header />
      <div className="main">
        <div className="content">
          {showError && (
            <span role="alert" className="text-red-700 ">
              Error to fetch user data
            </span>
          )}
          {showLogin && <LogIn onSuccess={onLoginSuccess} />}
          {showDashboard && <Dashboard user={user!} />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

import { Dashboard } from '@/components/Dashboard'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LogIn } from '@/components/Login'
import { useMeQuery } from '@/hooks/useMeQuery'
import { useAutoLogout } from './hooks/useLogout'

export const App = () => {
  const me = useMeQuery()
  // auto logout when the access token expires
  useAutoLogout(me.data?.id)

  const user = me.data
  const showLogin = !me.isError && !user
  const showDashboard = !me.isError && user

  return (
    <div className="app">
      <Header />
      <div className="main">
        <div className="content">
          {showLogin && <LogIn />}
          {showDashboard && <Dashboard user={user!} />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

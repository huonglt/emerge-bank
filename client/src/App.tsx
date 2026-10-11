import { Dashboard } from '@/components/Dashboard'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { LogIn } from '@/components/Login'

import { useMeQuery } from '@/hooks/useMeQuery'
/*const queryMe = async () => {
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
}*/
export const App = () => {
  const me = useMeQuery()

  if (me.isPending)
    return (
      <main>
        <p>Loading…</p>
      </main>
    )

  const user = me.data
  return (
    <div className="app">
      <Header />
      <div className="main">
        <div className="content">
          {user ? <Dashboard user={user} /> : <LogIn />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

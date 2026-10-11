import { api, ApiError } from './api'
import { Dashboard } from './Dashboard'
import { Footer } from './Footer'
import { Header } from './Header'
import { LogIn } from './Login'
import type { Me } from './types'
import { useQuery } from '@tanstack/react-query'
const queryMe = async () => {
  try {
    const m = await api<Me>('/me')
    return m.user
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null
    throw e
  }
}

export const App = () => {
  const me = useQuery({
    queryKey: ['user'],
    staleTime: 60 * 1000, // 1m
    queryFn: queryMe,
  })

  if (me.isPending)
    return (
      <main>
        <p>Loading…</p>
      </main>
    )

  console.log(`me = ${JSON.stringify(me)}`)
  return (
    <div className="app">
      <Header />
      <div className="main">
        <div className="content">
          {me.data ? <Dashboard user={me.data} /> : <LogIn />}
        </div>
      </div>
      <Footer />
    </div>
  )
}

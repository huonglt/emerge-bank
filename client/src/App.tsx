import './App.css'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError, setCsrf } from './api'
import type { Me } from './types'
import { Dashboard } from './Dashboard'
import { Login } from './Login'

function App() {
  const me = useQuery({
    queryKey: ['me'],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        const m = await api<Me>('/me')
        setCsrf(m.csrfToken) // restore CSRF token after a page reload
        return m
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
  })

  if (me.isPending)
    return (
      <main>
        <p>Loading…</p>
      </main>
    )

  return (
    <>
      <section className="mt-8 mb-8">
        <h2>Mini Virtual Bank</h2>
      </section>

      <section>
        <div className="w-full flex items-center">
          <main className="w-full flex">
            {me.data ? <Dashboard user={me.data.user} /> : <Login />}
          </main>
        </div>
      </section>
    </>
  )
}

export default App

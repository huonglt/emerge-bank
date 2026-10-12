import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/index.css'
import { App } from './App.tsx'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { setAccessToken, setCsrf } from './lib/api.ts'
import { ApiError } from './lib/ApiError.ts'

const queryClient: QueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 60_000 } }, // short cache for sensitive data
  queryCache: new QueryCache({
    onError: (err) => {
      // Session expired mid-use: drop everything sensitive and show sign-in.
      if (err instanceof ApiError && err.status === 401) {
        setAccessToken('')
        setCsrf('')
        queryClient.clear()
        queryClient.setQueryData(['me'], null)
      }
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)

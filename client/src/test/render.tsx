import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement, ReactNode } from 'react'

// No retries, so a failing request fails the test immediately instead of after backoff delays.
export const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

export const wrapperFor = (qc: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return Wrapper
}

export function renderWithClient(ui: ReactElement, qc = makeClient()) {
  const user = userEvent.setup()
  return { user, qc, ...render(ui, { wrapper: wrapperFor(qc) }) }
}

// everything the mutation cache still holds as mutation inputs, as text
export const storedMutationInputs = (qc: QueryClient) =>
  JSON.stringify(
    qc
      .getMutationCache()
      .getAll()
      .map((m) => m.state.variables)
  )

// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LogIn } from '@/components/Login'
import { api } from '@/lib/api'
import { ApiError } from '@/lib/ApiError'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrf: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

// The labels are not linked to the inputs (no id), so find the fields directly.
const fill = async (user: UserEvent) => {
  await user.type(screen.getByRole('textbox'), 'helen')
  await user.type(
    document.querySelector('input[type="password"]') as HTMLInputElement,
    'helen123'
  )
}
const login = () =>
  screen.getByRole('button', { name: 'Login' }) as HTMLButtonElement

describe('LogIn: submit button', () => {
  it('should disables Login while the request is running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    await waitFor(() => expect(login().disabled).toBe(true))
  })

  it('should sends only one request when Login is clicked twice', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.dblClick(login())
    await waitFor(() => expect(login().disabled).toBe(true))
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should enables Login again when the login fails', async () => {
    vi.mocked(api).mockRejectedValue(
      new ApiError(401, 'Username or password is incorrect')
    )
    const { user } = renderWithClient(<LogIn />)
    await fill(user)
    await user.click(login())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Username or password is incorrect'
    )
    expect(login().disabled).toBe(false)
  })
})

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileMenu } from '@/components/ProfileMenu'
import { useMeQuery } from '@/hooks/useMeQuery'
import { api, setAccessToken, setCsrf } from '@/lib/api'
import { makeUser } from '@/test/fixtures'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', () => ({
  api: vi.fn(),
  setAccessToken: vi.fn(),
  setCsrf: vi.fn(),
}))
vi.mock('@/hooks/useMeQuery', () => ({ useMeQuery: vi.fn() }))
const signedInAs = (user: unknown) =>
  vi.mocked(useMeQuery).mockReturnValue({ data: user } as never)

beforeEach(() => {
  signedInAs(makeUser())
  vi.mocked(api).mockResolvedValue({ ok: true })
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

type UserEvent = ReturnType<typeof renderWithClient>['user']
// the menu opens from the avatar button, like a user clicking it
const openMenu = async (user: UserEvent) => {
  await user.click(screen.getByRole('button', { name: 'AT' }))
  return screen.findByRole('menu')
}

describe('ProfileMenu: display', () => {
  it('should show the initials of the signed-in user', () => {
    renderWithClient(<ProfileMenu />)
    expect(screen.getByText('AT')).toBeTruthy()
  })

  it('should keep the menu closed until the avatar is clicked', () => {
    renderWithClient(<ProfileMenu />)
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('should show My Account and Log out once opened', async () => {
    const { user } = renderWithClient(<ProfileMenu />)
    await openMenu(user)
    expect(screen.getByText('My Account')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeTruthy()
  })
})

describe('ProfileMenu: log out', () => {
  const logOut = async (user: UserEvent) => {
    await openMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Log out' }))
  }

  it('should send logout request to server', async () => {
    const { user } = renderWithClient(<ProfileMenu />)
    await logOut(user)
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/logout', { method: 'POST' })
    )
  })

  it('should wipe both tokens once the request finishes', async () => {
    const { user } = renderWithClient(<ProfileMenu />)
    await logOut(user)
    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith(''))
    expect(setCsrf).toHaveBeenCalledWith('')
  })
})

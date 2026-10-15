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
// The real dropdown opens in a popup that is awkward in jsdom, so use a flat stand-in.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ render }: { render: React.ReactNode }) => render,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode
    onClick?: () => void
  }) => (
    <button role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
}))

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

describe('ProfileMenu: display', () => {
  it('should show the initials of the signed-in user', () => {
    renderWithClient(<ProfileMenu />)
    expect(screen.getByText('AT')).toBeTruthy()
  })

  it('should show My Account and Log out', () => {
    renderWithClient(<ProfileMenu />)
    expect(screen.getByText('My Account')).toBeTruthy()

    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeTruthy()
  })

  it.each([
    ['no one is signed in', null],
    ['the user is still loading', undefined],
  ])('should render nothing when %s', (_label, user) => {
    signedInAs(user)
    const { container } = renderWithClient(<ProfileMenu />)
    expect(container.innerHTML).toBe('')
  })
})

describe('ProfileMenu: log out', () => {
  const logOut = async (user: ReturnType<typeof renderWithClient>['user']) =>
    user.click(screen.getByRole('menuitem', { name: 'Log out' }))

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

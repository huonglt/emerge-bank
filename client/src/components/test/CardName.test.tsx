// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CardName } from '@/components/CardName'
import { api } from '@/lib/api'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))

const TOO_SHORT = 'Card name should be more than 6 characters'
const TOO_LONG = 'Card name should be no more than 24 characters'

beforeEach(() => vi.mocked(api).mockResolvedValue({ ok: true }))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

// The label is not linked to the input (no id), so find the field by its role.
const nameInput = () => screen.getByRole('textbox') as HTMLInputElement
const save = () =>
  screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement

describe('CardName: the form', () => {
  it('should explains what it is asking for', () => {
    renderWithClient(<CardName />)
    expect(screen.getByText('Setting up virtual bank card')).toBeTruthy()
    expect(
      screen.getByText('We need a name for your virtual card')
    ).toBeTruthy()
  })

  it('should starts without errors', () => {
    renderWithClient(<CardName />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('CardName: validation', () => {
  it('should rejects an empty name with the "more than 6" message and sends nothing', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(TOO_SHORT)
    expect(api).not.toHaveBeenCalled()
  })

  it('should rejects a name with 5 characters', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Alice')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(TOO_SHORT)
    expect(api).not.toHaveBeenCalled()
  })

  it('should does not count spaces around the name', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), '   Alice   ')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(TOO_SHORT)
    expect(api).not.toHaveBeenCalled()
  })

  it('should rejects a name with 25 characters', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'a'.repeat(25))
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(TOO_LONG)
    expect(api).not.toHaveBeenCalled()
  })

  it.each([6, 24])(
    'should accepts a name with %i characters',
    async (length) => {
      const { user } = renderWithClient(<CardName />)
      await user.type(nameInput(), 'a'.repeat(length))
      await user.click(save())
      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    }
  )

  it('should removes the error once the name is fixed', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Alice')
    await user.click(save())
    await screen.findByRole('alert')
    await user.type(nameInput(), ' Tane')
    await user.click(save())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(api).toHaveBeenCalledTimes(1)
  })
})

describe('CardName: saving', () => {
  it('should sends the name to the server', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Alice Tane')
    await user.click(save())
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/card/name', {
        method: 'PUT',
        body: { name: 'Alice Tane' },
      })
    )
  })

  it('should sends the name trimmed', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), '  Alice Tane  ')
    await user.click(save())
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith('/card/name', {
        method: 'PUT',
        body: { name: 'Alice Tane' },
      })
    )
  })

  it('shoould be submitted with the Enter key', async () => {
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Alice Tane{enter}')
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
  })

  it('should refreshes the user data after a successful save', async () => {
    const { user, qc } = renderWithClient(<CardName />)
    const spy = vi.spyOn(qc, 'invalidateQueries')
    await user.type(nameInput(), 'Alice Tane')
    await user.click(save())
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ['user'] })
    )
  })

  it('should disables Save while the request is running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Everyday')
    await user.click(save())
    await waitFor(() => expect(save().disabled).toBe(true))
  })

  it('should sends only one request when Save is clicked twice', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Everyday')
    await user.dblClick(save())
    await waitFor(() => expect(save().disabled).toBe(true))
    expect(api).toHaveBeenCalledTimes(1)
  })

  it('should enables Save again when the request fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Card name is already set'))
    const { user } = renderWithClient(<CardName />)
    await user.type(nameInput(), 'Everyday')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Card name is already set'
    )
    expect(save().disabled).toBe(false)
  })
})

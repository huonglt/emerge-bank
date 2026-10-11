// @vitest-environment jsdom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CardPIN } from '@/components/CardPIN'
import { api } from '@/lib/api'
import { encryptPin } from '@/lib/utils'
import { renderWithClient } from '@/test/render'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  encryptPin: vi.fn(),
}))

const FORMAT = 'PIN must be exactly 4 digits'
const MISMATCH = 'PINs do not match'

beforeEach(() => {
  vi.mocked(api).mockResolvedValue({ ok: true })
  vi.mocked(encryptPin).mockResolvedValue('ENCRYPTED')
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

// The labels are not linked to the inputs (no id), so find the fields by type.
const fields = () => {
  const [pin, confirm] = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="password"]')
  )
  return { pin, confirm }
}
const save = () =>
  screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement

async function fill(
  user: ReturnType<typeof renderWithClient>['user'],
  pin: string,
  confirm: string
) {
  const f = fields()
  if (pin) await user.type(f.pin, pin)
  if (confirm) await user.type(f.confirm, confirm)
}

describe('CardPIN: the form', () => {
  it('should explains what it is asking for', () => {
    renderWithClient(<CardPIN />)
    expect(screen.getByText('Setting up your virtual bank card')).toBeTruthy()
    expect(screen.getByText('We need a PIN for your virtual card')).toBeTruthy()
  })

  it('should has two masked, numeric, non-autofilled inputs limited to 4 characters', () => {
    renderWithClient(<CardPIN />)
    const { pin, confirm } = fields()
    for (const input of [pin, confirm]) {
      expect(input.type).toBe('password')
      expect(input.inputMode).toBe('numeric')
      expect(input.autocomplete).toBe('off')
      expect(input.maxLength).toBe(4)
    }
  })

  it('should not accept more than 4 characters', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await user.type(fields().pin, '482199')
    expect(fields().pin.value).toBe('4821')
  })

  it('should starts without errors', () => {
    renderWithClient(<CardPIN />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('CardPIN: validation', () => {
  it('should blocks mismatched PINs, says so, and sends nothing', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4822')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(MISMATCH)
    expect(encryptPin).not.toHaveBeenCalled()
    expect(api).not.toHaveBeenCalled()
  })

  it('should treats a missing confirmation as a mismatch', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(MISMATCH)
    expect(api).not.toHaveBeenCalled()
  })

  it('should checks the format before checking the match', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '12', '13')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(FORMAT)
  })

  it('should clears an earlier error on the next valid submit', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4822')
    await user.click(save())
    await screen.findByRole('alert')
    await user.clear(fields().confirm)
    await user.type(fields().confirm, '4821')
    await user.click(save())
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})

describe('CardPIN: saving', () => {
  it('should encrypts the PIN and its confirmation, and sends only the encrypted value', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(api).toHaveBeenCalled())
    expect(encryptPin).toHaveBeenCalledWith('4821', '4821')
    expect(api).toHaveBeenCalledWith('/card/pin', {
      method: 'PUT',
      body: { encrypted: 'ENCRYPTED' },
    })
  })

  it('should never sends the PIN in readable form', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(api).toHaveBeenCalled())
    expect(JSON.stringify(vi.mocked(api).mock.calls)).not.toContain('4821')
  })

  it('should clears both fields straight after submitting', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    expect(fields().pin.value).toBe('')
    expect(fields().confirm.value).toBe('')
  })

  it('should keeps the PIN out of browser storage', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(api).toHaveBeenCalled())
    expect(localStorage.length + sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('should disables Save while the request is running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(save().disabled).toBe(true))
  })

  it('should refreshes the user data after a successful save', async () => {
    const { user, qc } = renderWithClient(<CardPIN />)
    const spy = vi.spyOn(qc, 'invalidateQueries')
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({ queryKey: ['user'] })
    )
  })
})

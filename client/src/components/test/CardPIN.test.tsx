import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CardPIN } from '@/components/CardPIN'
import { api } from '@/lib/api'
import { encryptPin } from '@/lib/utils'
import { renderWithClient, storedMutationInputs } from '@/test/render'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))
vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  encryptPin: vi.fn(),
}))

const FORMAT = 'PIN must be exactly 4 digits'
const CONFIRM_FORMAT = 'Confirm PIN must be exactly 4 digits'
const MISMATCH = 'PINs do not match'
// each field shows its own error under it
const alerts = async () =>
  (await screen.findAllByRole('alert')).map((a) => a.textContent)

beforeEach(() => {
  vi.mocked(api).mockResolvedValue({ ok: true })
  vi.mocked(encryptPin).mockResolvedValue('ENCRYPTED')
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const fields = () => ({
  pin: screen.getByLabelText('PIN') as HTMLInputElement,
  confirm: screen.getByLabelText('Confirmed PIN') as HTMLInputElement,
})
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

  it('should ask for the confirmation when it is missing', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '')
    await user.click(save())
    expect(await alerts()).toEqual([CONFIRM_FORMAT])
    expect(api).not.toHaveBeenCalled()
  })

  it('should rejects a PIN and confirmation with a letter in them', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '12a4', '12a4')
    await user.click(save())
    expect(await alerts()).toEqual([FORMAT, CONFIRM_FORMAT])
    expect(api).not.toHaveBeenCalled()
  })

  it('should show the format error, not the mismatch, when the confirmation is not 4 digits', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '12', '13')
    await user.click(save())
    expect(await alerts()).toEqual([FORMAT, CONFIRM_FORMAT])
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

  it('should clears both fields straight after submitting', async () => {
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    expect(fields().pin.value).toBe('')
    expect(fields().confirm.value).toBe('')
  })

  it('should disables Save while the request is running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(save().disabled).toBe(true))
  })

  it('should show the server error and enable Save again when saving fails', async () => {
    vi.mocked(api).mockRejectedValue(
      new Error('PIN request expired. Please try again')
    )
    const { user } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    expect((await screen.findByRole('alert')).textContent).toBe(
      'PIN request expired. Please try again'
    )
    expect(save().disabled).toBe(false)
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

describe('CardPIN: the PIN in memory', () => {
  it('should drop the plain PIN once it is encrypted, while the request is still running', async () => {
    vi.mocked(api).mockReturnValue(new Promise(() => {}))
    const { user, qc } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await waitFor(() => expect(api).toHaveBeenCalled())
    expect(storedMutationInputs(qc)).not.toContain('4821')
  })

  it('should drop the plain PIN when the encryption fails', async () => {
    vi.mocked(encryptPin).mockRejectedValue(
      new Error('PIN cannot be set right now')
    )
    const { user, qc } = renderWithClient(<CardPIN />)
    await fill(user, '4821', '4821')
    await user.click(save())
    await screen.findByText('PIN cannot be set right now')
    expect(storedMutationInputs(qc)).not.toContain('4821')
  })
})

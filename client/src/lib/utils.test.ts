// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/lib/api'
import { encryptPin, formaCurrency, getInitials } from '@/lib/utils'

vi.mock('@/lib/api', () => ({ api: vi.fn() }))

describe('formatNZD', () => {
  it.each([
    [2450.75, '$2,450.75'],
    [0, '$0.00'],
    [100, '$100.00'],
    [1234567.5, '$1,234,567.50'],
    [0.005, '$0.01'],
    [-5, '-$5.00'],
  ])('should format %d as %s', (amount, expected) => {
    expect(formaCurrency(amount)).toBe(expected)
  })
})

describe('getInitials', () => {
  it.each([
    ['Alice Tane', 'AT'],
    ['Alice', 'A'],
    ['Mary Jane Watson', 'MJW'],
    ['Alice   Tane', 'AT'],
    ['  Alice Tane  ', 'AT'],
    ['alice tane', 'at'],
    ['', ''],
    ['   ', ''],
  ])('%j gives %j', (name, expected) => {
    expect(getInitials(name)).toBe(expected)
  })
})

describe('encryptPin', () => {
  let privateKey: CryptoKey
  let publicJwk: JsonWebKey

  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    )
    privateKey = pair.privateKey
    publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  })

  beforeEach(() => {
    vi.mocked(api).mockReset()
    vi.mocked(api).mockResolvedValue({
      publicKey: publicJwk,
      nonce: 'n-1',
    } as never)
  })

  const decrypt = async (blob: string) => {
    const bytes = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0))
    const plain = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      bytes
    )
    return JSON.parse(new TextDecoder().decode(plain))
  }

  it('should asks the server for the public key and nonce', async () => {
    await encryptPin('4821', '4821')
    expect(api).toHaveBeenCalledWith('/card/pinNonce')
  })

  it('should encrypts the PIN, the confirmation and the nonce so the private key can read them', async () => {
    expect(await decrypt(await encryptPin('4821', '4821'))).toEqual({
      pin: '4821',
      confirmPin: '4821',
      nonce: 'n-1',
    })
  })

  it('should carries a mismatched confirmation through unchanged for the server to reject', async () => {
    expect(await decrypt(await encryptPin('4821', '4822'))).toMatchObject({
      pin: '4821',
      confirmPin: '4822',
    })
  })

  it('should gives different output every time (randomised padding)', async () => {
    expect(await encryptPin('4821', '4821')).not.toBe(
      await encryptPin('4821', '4821')
    )
  })

  it('should returns valid base64', async () => {
    expect(await encryptPin('4821', '4821')).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('should rejects when the nonce request fails', async () => {
    vi.mocked(api).mockRejectedValue(new Error('Please sign in again'))
    await expect(encryptPin('4821', '4821')).rejects.toThrow(
      'Please sign in again'
    )
  })

  it('should rejects when the server sends an unusable public key', async () => {
    vi.mocked(api).mockResolvedValue({
      publicKey: { kty: 'RSA' },
      nonce: 'n-1',
    } as never)
    await expect(encryptPin('4821', '4821')).rejects.toBeDefined()
  })
})

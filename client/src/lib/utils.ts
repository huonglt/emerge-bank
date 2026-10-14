import { api } from './api'

/**
 * Encrypts the PIN in the browser with the server's public key (RSA-OAEP) and a  single-use nonce
 * the PIN is never sent or logged in readable form
 * the request cannot be replayed
 */
export const encryptPin = async (
  pin: string,
  confirmPin: string
): Promise<string> => {
  const { publicKey, nonce } = await api<{
    publicKey: JsonWebKey
    nonce: string
  }>('/card/pinNonce')
  const key = await crypto.subtle.importKey(
    'jwk',
    publicKey,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )
  const data = new TextEncoder().encode(
    JSON.stringify({ pin, confirmPin, nonce })
  )
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, data)
  )
  data.fill(0)
  return btoa(String.fromCharCode(...cipher))
}

/**
 * Get initial of user name
 */
export const getInitials = (name: string) => {
  const parts = name.split(' ')
  let initials = ''
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0 && parts[i] !== '') {
      initials += parts[i][0]
    }
  }
  return initials
}

/**
 * locale for formatting
 */
export const locale = 'en-NZ'
const numberFormatter = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'NZD',
})

/**
 * Format an amount using the locale
 */
export const formaCurrency = (amount: number) => numberFormatter.format(amount)

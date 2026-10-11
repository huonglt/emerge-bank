export { cn } from 'cn'

import { api } from './api'

// Encrypts the PIN in the browser with the server's public key (RSA-OAEP) and a
// single-use nonce, so the PIN is never sent or logged in readable form and the
// request cannot be replayed. This sits ON TOP of HTTPS; it does not replace it.
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

export const getInitials = function (name: string) {
  var parts = name.split(' ')
  var initials = ''
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].length > 0 && parts[i] !== '') {
      initials += parts[i][0]
    }
  }
  return initials
}

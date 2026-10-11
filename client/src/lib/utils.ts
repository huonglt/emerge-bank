export { cn } from 'cn'

import { api } from '../api'

// Encrypts the PIN in the browser with the server's public key (RSA-OAEP) and a
// single-use nonce, so the PIN is never sent or logged in readable form and the
// request cannot be replayed. This sits ON TOP of HTTPS; it does not replace it.
export async function encryptPin(
  pin: string,
  confirmPin: string
): Promise<string> {
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

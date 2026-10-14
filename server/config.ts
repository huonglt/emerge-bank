export const JWT_SECRET = 'virtual-bank-jwt-secret-key' // will be stored in a vault in production
// the only algorithm used to sign and accepted when verifying access tokens
export const JWT_ALGORITHM = 'HS256' as const
export const JWT_EXPIRES_IN = '5m' // 5 min
export const NONCE_MS = 5 * 60 * 1000

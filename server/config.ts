export const ABSOLUTE_MS = 5 * 60 * 1000 // session last 5 mins same as JWT
export const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ABSOLUTE_MS,
}
export const SID = '__Host-sid' // __Host- prefix: Secure, Path=/, no Domain, so it cannot be set by sibling hosts
export const JWT_SECRET = 'virtual-bank-jwt-secret-key' // will be stored in a vault in production
export const SESSION_SECRET = 'virtual-bank-session-secret-key'

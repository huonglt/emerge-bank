export const IDLE_MS = 15 * 60000
export const ABSOLUTE_MS = 8 * 60 * 60000
export const cookieOpts = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ABSOLUTE_MS,
}
export const SID = '__Host-sid' // __Host- prefix: Secure, Path=/, no Domain, so it cannot be set by sibling hosts

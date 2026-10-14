import { jwtDecode } from 'jwt-decode'
import { serverUrl } from './config'
import { ApiError } from './ApiError'

/**
 * accessToken and csrf token lives in memory only
 * they are not stored in browser storage, or in cookie that javascript can read
 */
let accessToken = ''
let csrfToken = ''
export const setAccessToken = (t: string) => (accessToken = t)
export const setCsrf = (t: string) => (csrfToken = t)

/**
 * Generic method for calling api
 * Attach accessToken to all api request
 * Attach csrfToken for all other api request except GET
 */

export const api = async <T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> => {
  const method = options.method ?? 'GET'
  const res = await fetch(`${serverUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(method !== 'GET' && {
        'X-CSRF-Token': csrfToken,
      }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Something went wrong')
  }
  return data as T
}

/**
 * Find the time in ms from now until the access token expires
 */
export const tokenExpireIn = () => {
  if (!accessToken) {
    return
  }
  const { exp } = jwtDecode(accessToken)
  if (exp) {
    return exp * 1000 - Date.now()
  }
  return
}
